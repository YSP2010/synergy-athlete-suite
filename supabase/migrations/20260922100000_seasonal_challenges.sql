-- ============================================================
-- Gamification – Phase 5: Saisonale Challenges (rein additiv)
-- ------------------------------------------------------------
-- * challenges.focus (swim|run|intervals|strength) + scope 'seasonal'
-- * Quartalsfenster + rotierender Fokus (Q1-Q3 permutiert, Q4=strength)
-- * sync_my_challenges(): monthly/yearly UNVERAENDERT, seasonal ergaenzt
-- * claim_challenge(): seasonal period_start = aktuelles Quartal
-- KEINE bestehende Tabelle/Migration/Client-Datei wird veraendert.
-- Idempotent & re-runnable.
-- ============================================================

-- 1) Schema-Erweiterung -------------------------------------------------------
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS focus text;

-- scope-CHECK um 'seasonal' erweitern (echter Constraint-Name: challenges_scope_check)
ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_scope_check;
ALTER TABLE public.challenges ADD CONSTRAINT challenges_scope_check
  CHECK (scope IN ('monthly','yearly','seasonal'));

-- 2) Fokus-Rotation -----------------------------------------------------------
-- Q4 -> 'strength' (fix). Q1-Q3 permutieren [swim,run,intervals] anhand
-- perm_index = abs(hashtext('season'||Y)) % 6.
CREATE OR REPLACE FUNCTION public.season_focus(_year int, _quarter int)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _quarter = 4 THEN 'strength'
    ELSE (
      SELECT f FROM (VALUES
        (0,1,'swim'),     (0,2,'run'),      (0,3,'intervals'),
        (1,1,'swim'),     (1,2,'intervals'),(1,3,'run'),
        (2,1,'run'),      (2,2,'swim'),     (2,3,'intervals'),
        (3,1,'run'),      (3,2,'intervals'),(3,3,'swim'),
        (4,1,'intervals'),(4,2,'swim'),     (4,3,'run'),
        (5,1,'intervals'),(5,2,'run'),      (5,3,'swim')
      ) AS m(idx, q, f)
      WHERE idx = (abs(hashtext('season' || _year::text)) % 6)
        AND q = _quarter
    )
  END;
$$;
GRANT EXECUTE ON FUNCTION public.season_focus(int, int) TO authenticated, service_role;

-- 3) sync_my_challenges() – monthly/yearly UNVERAENDERT, seasonal ergaenzt ----
-- RETURNS TABLE erhaelt neue Spalte 'focus' -> DROP vor CREATE noetig (PG-Regel).
DROP FUNCTION IF EXISTS public.sync_my_challenges();
CREATE OR REPLACE FUNCTION public.sync_my_challenges()
RETURNS TABLE (key text, scope text, category text, difficulty text, xp_reward integer,
               metric text, target_value numeric, progress_value numeric, status text,
               period_start date, confirmed_manually boolean, focus text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := auth.uid();
  _ms date := date_trunc('month', current_date)::date;
  _me date := (date_trunc('month', current_date) + interval '1 month')::date;
  _ys date := date_trunc('year', current_date)::date;
  _ye date := (date_trunc('year', current_date) + interval '1 year')::date;
  _yr int  := EXTRACT(year FROM current_date)::int;
  _q  int  := EXTRACT(quarter FROM current_date)::int;
  _ss date := make_date(_yr, (_q-1)*3 + 1, 1);
  _se date := (make_date(_yr, (_q-1)*3 + 1, 1) + interval '3 months')::date;
  _focus text := public.season_focus(_yr, _q);
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Instanzen anlegen; seasonal nur fuer den aktuellen Fokus.
  INSERT INTO public.user_challenges (user_id, challenge_id, period_start)
  SELECT _uid, c.id,
         CASE c.scope WHEN 'monthly' THEN _ms WHEN 'yearly' THEN _ys ELSE _ss END
  FROM public.challenges c
  WHERE (c.active_from IS NULL OR c.active_from <= current_date)
    AND (c.active_to   IS NULL OR c.active_to   >= current_date)
    AND (c.scope <> 'seasonal' OR c.focus = _focus)
  ON CONFLICT (user_id, challenge_id, period_start) DO NOTHING;

  WITH
  mvals AS (
    SELECT
      (SELECT count(*) FROM public.workouts_gym WHERE user_id=_uid AND status='done' AND date>=_ms AND date<_me) AS gym,
      (SELECT count(*) FROM public.workouts_sport WHERE user_id=_uid AND status='done' AND date>=_ms AND date<_me) AS sport,
      (SELECT COALESCE(SUM(distance_m),0)/1000.0 FROM public.activities WHERE user_id=_uid AND route_only=false AND started_at>=_ms AND started_at<_me) AS km,
      (SELECT COALESCE(SUM(e.sets*e.reps*COALESCE(e.weight_kg,0)),0) FROM public.gym_exercises e JOIN public.workouts_gym g ON g.id=e.workout_id WHERE g.user_id=_uid AND g.status='done' AND g.date>=_ms AND g.date<_me) AS vol,
      (SELECT count(*) FROM public.daily_stats WHERE user_id=_uid AND date>=_ms AND date<_me) AS chk,
      (SELECT count(*) FROM (
         SELECT date AS d FROM public.workouts_gym WHERE user_id=_uid AND status='done' AND date>=_ms AND date<_me
         UNION SELECT date FROM public.workouts_sport WHERE user_id=_uid AND status='done' AND date>=_ms AND date<_me
         UNION SELECT started_at::date FROM public.activities WHERE user_id=_uid AND route_only=false AND started_at>=_ms AND started_at<_me) u) AS days,
      (SELECT count(*) FROM public.workouts_gym WHERE user_id=_uid AND status='done' AND date>=_ms AND date<_me)
        + (SELECT count(*) FROM public.workouts_sport WHERE user_id=_uid AND status='done' AND date>=_ms AND date<_me)
        + (SELECT count(*) FROM public.activities WHERE user_id=_uid AND route_only=false AND started_at>=_ms AND started_at<_me) AS tot
  ),
  yvals AS (
    SELECT
      (SELECT count(*) FROM public.workouts_gym WHERE user_id=_uid AND status='done' AND date>=_ys AND date<_ye) AS gym,
      (SELECT count(*) FROM public.workouts_sport WHERE user_id=_uid AND status='done' AND date>=_ys AND date<_ye) AS sport,
      (SELECT COALESCE(SUM(distance_m),0)/1000.0 FROM public.activities WHERE user_id=_uid AND route_only=false AND started_at>=_ys AND started_at<_ye) AS km,
      (SELECT COALESCE(SUM(e.sets*e.reps*COALESCE(e.weight_kg,0)),0) FROM public.gym_exercises e JOIN public.workouts_gym g ON g.id=e.workout_id WHERE g.user_id=_uid AND g.status='done' AND g.date>=_ys AND g.date<_ye) AS vol,
      (SELECT count(*) FROM public.daily_stats WHERE user_id=_uid AND date>=_ys AND date<_ye) AS chk,
      (SELECT count(*) FROM (
         SELECT date AS d FROM public.workouts_gym WHERE user_id=_uid AND status='done' AND date>=_ys AND date<_ye
         UNION SELECT date FROM public.workouts_sport WHERE user_id=_uid AND status='done' AND date>=_ys AND date<_ye
         UNION SELECT started_at::date FROM public.activities WHERE user_id=_uid AND route_only=false AND started_at>=_ys AND started_at<_ye) u) AS days,
      (SELECT count(*) FROM public.workouts_gym WHERE user_id=_uid AND status='done' AND date>=_ys AND date<_ye)
        + (SELECT count(*) FROM public.workouts_sport WHERE user_id=_uid AND status='done' AND date>=_ys AND date<_ye)
        + (SELECT count(*) FROM public.activities WHERE user_id=_uid AND route_only=false AND started_at>=_ys AND started_at<_ye) AS tot
  ),
  svals AS (
    SELECT
      (SELECT COALESCE(SUM(distance_m),0)/1000.0 FROM public.activities WHERE user_id=_uid AND sport IN ('swim','swim_open') AND started_at>=_ss AND started_at<_se) AS swim_km,
      (SELECT COALESCE(SUM(distance_m),0)/1000.0 FROM public.activities WHERE user_id=_uid AND sport LIKE '%run%' AND started_at>=_ss AND started_at<_se) AS run_km,
      (SELECT count(*) FROM public.workouts_sport WHERE user_id=_uid AND status='done' AND intensity='high' AND date>=_ss AND date<_se) AS interval_sessions,
      (SELECT COALESCE(SUM(steps),0) FROM public.wellness_daily WHERE user_id=_uid AND date>=_ss AND date<_se) AS steps,
      (SELECT count(*) FROM public.workouts_gym WHERE user_id=_uid AND status='done' AND date>=_ss AND date<_se) AS gym_sessions,
      (SELECT COALESCE(SUM(e.sets*e.reps*COALESCE(e.weight_kg,0)),0) FROM public.gym_exercises e JOIN public.workouts_gym g ON g.id=e.workout_id WHERE g.user_id=_uid AND g.status='done' AND g.date>=_ss AND g.date<_se) AS total_volume_kg
  ),
  vals AS (
    SELECT 'monthly'::text AS scope, x.k, x.v FROM mvals, LATERAL (VALUES
      ('gym_sessions', mvals.gym::numeric), ('sport_sessions', mvals.sport::numeric),
      ('endurance_km', mvals.km::numeric), ('total_volume_kg', mvals.vol::numeric),
      ('checkins', mvals.chk::numeric), ('active_days', mvals.days::numeric),
      ('total_sessions', mvals.tot::numeric)) AS x(k, v)
    UNION ALL
    SELECT 'yearly', x.k, x.v FROM yvals, LATERAL (VALUES
      ('gym_sessions', yvals.gym::numeric), ('sport_sessions', yvals.sport::numeric),
      ('endurance_km', yvals.km::numeric), ('total_volume_kg', yvals.vol::numeric),
      ('checkins', yvals.chk::numeric), ('active_days', yvals.days::numeric),
      ('total_sessions', yvals.tot::numeric)) AS x(k, v)
    UNION ALL
    SELECT 'seasonal', x.k, x.v FROM svals, LATERAL (VALUES
      ('swim_km', svals.swim_km::numeric), ('run_km', svals.run_km::numeric),
      ('interval_sessions', svals.interval_sessions::numeric), ('steps', svals.steps::numeric),
      ('gym_sessions', svals.gym_sessions::numeric), ('total_volume_kg', svals.total_volume_kg::numeric)) AS x(k, v)
  )
  UPDATE public.user_challenges uc
     SET progress_value = vals.v, updated_at = now()
    FROM public.challenges c, vals
   WHERE uc.user_id=_uid AND uc.challenge_id=c.id AND uc.status='active'
     AND c.metric IS NOT NULL AND c.metric = vals.k AND c.scope = vals.scope
     AND uc.period_start = CASE c.scope WHEN 'monthly' THEN _ms WHEN 'yearly' THEN _ys ELSE _ss END;

  UPDATE public.user_challenges uc
     SET status='completed', completed_at=now(), updated_at=now()
    FROM public.challenges c
   WHERE uc.user_id=_uid AND uc.challenge_id=c.id AND uc.status='active'
     AND c.metric IS NOT NULL AND uc.progress_value >= c.target_value
     AND uc.period_start = CASE c.scope WHEN 'monthly' THEN _ms WHEN 'yearly' THEN _ys ELSE _ss END;

  INSERT INTO public.xp_events (user_id, source_type, source_id, amount)
  SELECT _uid, 'challenge', c.key || ':' || uc.period_start, c.xp_reward
  FROM public.user_challenges uc JOIN public.challenges c ON c.id=uc.challenge_id
  WHERE uc.user_id=_uid AND uc.status='completed'
    AND uc.period_start = CASE c.scope WHEN 'monthly' THEN _ms WHEN 'yearly' THEN _ys ELSE _ss END
  ON CONFLICT (user_id, source_type, source_id) DO NOTHING;

  UPDATE public.profiles p
     SET total_xp = COALESCE((SELECT SUM(amount) FROM public.xp_events WHERE user_id=_uid),0)
   WHERE p.id=_uid;

  RETURN QUERY
  SELECT c.key, c.scope, c.category, c.difficulty, c.xp_reward, c.metric,
         c.target_value, uc.progress_value, uc.status, uc.period_start, uc.confirmed_manually, c.focus
  FROM public.user_challenges uc JOIN public.challenges c ON c.id=uc.challenge_id
  WHERE uc.user_id=_uid
    AND uc.period_start = CASE c.scope WHEN 'monthly' THEN _ms WHEN 'yearly' THEN _ys ELSE _ss END
  ORDER BY c.scope, c.sort;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_my_challenges() TO authenticated;

-- 4) claim_challenge(text) – seasonal period_start ergaenzt -------------------
CREATE OR REPLACE FUNCTION public.claim_challenge(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := auth.uid();
  _c public.challenges%ROWTYPE;
  _ps date;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _c FROM public.challenges WHERE key = _key;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown challenge %', _key; END IF;
  IF _c.metric IS NOT NULL THEN RAISE EXCEPTION 'challenge % is auto-tracked', _key; END IF;
  _ps := CASE _c.scope
           WHEN 'monthly' THEN date_trunc('month',current_date)::date
           WHEN 'yearly'  THEN date_trunc('year',current_date)::date
           ELSE make_date(EXTRACT(year FROM current_date)::int,
                          (EXTRACT(quarter FROM current_date)::int - 1)*3 + 1, 1)
         END;
  INSERT INTO public.user_challenges (user_id, challenge_id, period_start, progress_value, status, confirmed_manually, completed_at)
  VALUES (_uid, _c.id, _ps, 1, 'completed', true, now())
  ON CONFLICT (user_id, challenge_id, period_start)
  DO UPDATE SET status='completed', confirmed_manually=true, completed_at=now(), progress_value=1, updated_at=now();
  INSERT INTO public.xp_events (user_id, source_type, source_id, amount)
  VALUES (_uid, 'challenge', _c.key || ':' || _ps, _c.xp_reward)
  ON CONFLICT (user_id, source_type, source_id) DO NOTHING;
  UPDATE public.profiles p
     SET total_xp = COALESCE((SELECT SUM(amount) FROM public.xp_events WHERE user_id=_uid),0)
   WHERE p.id=_uid;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_challenge(text) TO authenticated;

-- 5) Seed (idempotent, inkl. focus) ------------------------------------------
INSERT INTO public.challenges (key, scope, category, difficulty, xp_reward, metric, target_value, sort, focus) VALUES
  ('ss_swim_20',        'seasonal', 'endurance', 'medium', 150, 'swim_km',           20,     10, 'swim'),
  ('ss_swim_40',        'seasonal', 'endurance', 'hard',   300, 'swim_km',           40,     20, 'swim'),
  ('ss_run_100',        'seasonal', 'endurance', 'medium', 150, 'run_km',            100,    10, 'run'),
  ('ss_run_200',        'seasonal', 'endurance', 'hard',   300, 'run_km',            200,    20, 'run'),
  ('ss_interval_12',    'seasonal', 'endurance', 'medium', 150, 'interval_sessions', 12,     10, 'intervals'),
  ('ss_steps_500k',     'seasonal', 'general',   'medium', 150, 'steps',             500000, 20, 'intervals'),
  ('ss_interval_manual','seasonal', 'endurance', 'medium', 120, NULL,                NULL,   30, 'intervals'),
  ('ss_gym_24',         'seasonal', 'gym',       'medium', 150, 'gym_sessions',      24,     10, 'strength'),
  ('ss_volume_60t',     'seasonal', 'gym',       'hard',   300, 'total_volume_kg',   60000,  20, 'strength')
ON CONFLICT (key) DO UPDATE SET
  scope=EXCLUDED.scope, category=EXCLUDED.category, difficulty=EXCLUDED.difficulty,
  xp_reward=EXCLUDED.xp_reward, metric=EXCLUDED.metric, target_value=EXCLUDED.target_value,
  sort=EXCLUDED.sort, focus=EXCLUDED.focus;
