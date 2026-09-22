-- ============================================================
-- Gamification – Phase 4: Challenges (rein additiv)
-- challenges        : Katalog (geseedet, monatlich/jaehrlich)
-- user_challenges   : Fortschritt je Nutzer & Periode
-- sync_my_challenges: Fortschritt neu berechnen, Auto-Erfuellung + XP
-- claim_challenge   : manuelle Selbstbestaetigung (metric IS NULL) + XP
-- XP laeuft ueber xp_events (source_type='challenge'), idempotent.
-- ============================================================

-- 1) Katalog ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('monthly','yearly')),
  category text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard','epic')),
  xp_reward integer NOT NULL,
  metric text,                    -- NULL => manuelle Bestaetigung
  target_value numeric,
  active_from date,
  active_to date,
  sort integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenges readable" ON public.challenges;
CREATE POLICY "challenges readable" ON public.challenges FOR SELECT TO authenticated USING (true);

-- 2) Fortschritt je Nutzer ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  progress_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','expired')),
  confirmed_manually boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, period_start)
);
GRANT SELECT ON public.user_challenges TO authenticated;
GRANT ALL ON public.user_challenges TO service_role;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own challenges read" ON public.user_challenges;
CREATE POLICY "own challenges read" ON public.user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON public.user_challenges(user_id);

-- 3) Seed (idempotent) --------------------------------------------------------
INSERT INTO public.challenges (key, scope, category, difficulty, xp_reward, metric, target_value, sort) VALUES
  ('m_gym_12',       'monthly', 'gym',       'medium', 120, 'gym_sessions',    12,    10),
  ('m_run_50',       'monthly', 'endurance', 'medium', 120, 'endurance_km',    50,    20),
  ('m_sport_8',      'monthly', 'football',  'medium', 120, 'sport_sessions',  8,     30),
  ('m_active_20',    'monthly', 'general',   'medium', 120, 'active_days',     20,    40),
  ('m_volume_40t',   'monthly', 'gym',       'hard',   250, 'total_volume_kg', 40000, 50),
  ('m_checkin_10',   'monthly', 'wellness',  'easy',   50,  'checkins',        10,    60),
  ('m_pr',           'monthly', 'gym',       'easy',   50,  NULL,              NULL,  70),
  ('y_sessions_150', 'yearly',  'general',   'epic',   500, 'total_sessions',  150,   10),
  ('y_endurance_1000','yearly', 'endurance', 'epic',   500, 'endurance_km',    1000,  20),
  ('y_active_250',   'yearly',  'general',   'epic',   500, 'active_days',      250,  30)
ON CONFLICT (key) DO UPDATE SET
  scope=EXCLUDED.scope, category=EXCLUDED.category, difficulty=EXCLUDED.difficulty,
  xp_reward=EXCLUDED.xp_reward, metric=EXCLUDED.metric, target_value=EXCLUDED.target_value,
  sort=EXCLUDED.sort;

-- 4) Fortschritt neu berechnen + Auto-Erfuellung ------------------------------
CREATE OR REPLACE FUNCTION public.sync_my_challenges()
RETURNS TABLE (key text, scope text, category text, difficulty text, xp_reward integer,
               metric text, target_value numeric, progress_value numeric, status text,
               period_start date, confirmed_manually boolean)
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
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  INSERT INTO public.user_challenges (user_id, challenge_id, period_start)
  SELECT _uid, c.id, CASE WHEN c.scope = 'monthly' THEN _ms ELSE _ys END
  FROM public.challenges c
  WHERE (c.active_from IS NULL OR c.active_from <= current_date)
    AND (c.active_to   IS NULL OR c.active_to   >= current_date)
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
  )
  UPDATE public.user_challenges uc
     SET progress_value = vals.v, updated_at = now()
    FROM public.challenges c, vals
   WHERE uc.user_id=_uid AND uc.challenge_id=c.id AND uc.status='active'
     AND c.metric IS NOT NULL AND c.metric = vals.k AND c.scope = vals.scope
     AND uc.period_start = CASE WHEN c.scope='monthly' THEN _ms ELSE _ys END;

  UPDATE public.user_challenges uc
     SET status='completed', completed_at=now(), updated_at=now()
    FROM public.challenges c
   WHERE uc.user_id=_uid AND uc.challenge_id=c.id AND uc.status='active'
     AND c.metric IS NOT NULL AND uc.progress_value >= c.target_value
     AND uc.period_start = CASE WHEN c.scope='monthly' THEN _ms ELSE _ys END;

  INSERT INTO public.xp_events (user_id, source_type, source_id, amount)
  SELECT _uid, 'challenge', c.key || ':' || uc.period_start, c.xp_reward
  FROM public.user_challenges uc JOIN public.challenges c ON c.id=uc.challenge_id
  WHERE uc.user_id=_uid AND uc.status='completed'
    AND uc.period_start = CASE WHEN c.scope='monthly' THEN _ms ELSE _ys END
  ON CONFLICT (user_id, source_type, source_id) DO NOTHING;

  UPDATE public.profiles p
     SET total_xp = COALESCE((SELECT SUM(amount) FROM public.xp_events WHERE user_id=_uid),0)
   WHERE p.id=_uid;

  RETURN QUERY
  SELECT c.key, c.scope, c.category, c.difficulty, c.xp_reward, c.metric,
         c.target_value, uc.progress_value, uc.status, uc.period_start, uc.confirmed_manually
  FROM public.user_challenges uc JOIN public.challenges c ON c.id=uc.challenge_id
  WHERE uc.user_id=_uid
    AND uc.period_start = CASE WHEN c.scope='monthly' THEN _ms ELSE _ys END
  ORDER BY c.scope, c.sort;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_my_challenges() TO authenticated;

-- 5) Manuelle Selbstbestaetigung ---------------------------------------------
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
  _ps := CASE WHEN _c.scope='monthly' THEN date_trunc('month',current_date)::date
              ELSE date_trunc('year',current_date)::date END;
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
