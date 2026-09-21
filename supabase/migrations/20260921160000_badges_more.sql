-- ============================================================
-- Gamification – Badges Erweiterung (+40, rein additiv).
-- Ersetzt sync_my_badges() um zusaetzliche Kriterien aus vorhandenen
-- Trainingsdaten (Hoehenmeter, Kalorien, Tempo, Zeit, Intensitaet,
-- Lifestyle, Vielseitigkeit, Erholung). Idempotent.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_my_badges()
RETURNS TABLE (badge_key text, earned_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  WITH
  gym AS (SELECT * FROM public.workouts_gym WHERE user_id = _uid AND status = 'done'),
  sport AS (SELECT * FROM public.workouts_sport WHERE user_id = _uid AND status = 'done'),
  act AS (SELECT * FROM public.activities WHERE user_id = _uid AND route_only = false),
  ex AS (SELECT e.*, g.date AS wdate FROM public.gym_exercises e JOIN gym g ON g.id = e.workout_id),
  sess_dates AS (
    SELECT date AS d FROM gym
    UNION ALL SELECT date FROM sport
    UNION ALL SELECT started_at::date FROM act WHERE started_at IS NOT NULL
  ),
  days AS (SELECT DISTINCT d AS day FROM sess_dates),
  streak AS (
    SELECT COALESCE(MAX(len), 0) AS best FROM (
      SELECT COUNT(*) AS len
      FROM (SELECT day, (day - (ROW_NUMBER() OVER (ORDER BY day))::int) AS grp FROM days) z
      GROUP BY grp
    ) s
  ),
  sleep_days AS (
    SELECT DISTINCT date AS day FROM public.daily_stats WHERE user_id = _uid AND sleep_hours >= 8
  ),
  sleep_streak AS (
    SELECT COALESCE(MAX(len), 0) AS best FROM (
      SELECT COUNT(*) AS len
      FROM (SELECT day, (day - (ROW_NUMBER() OVER (ORDER BY day))::int) AS grp FROM sleep_days) z
      GROUP BY grp
    ) s
  ),
  perfect_week AS (
    SELECT EXISTS (SELECT 1 FROM days GROUP BY date_trunc('week', day) HAVING COUNT(*) >= 7) AS ok
  ),
  big_month AS (
    SELECT EXISTS (SELECT 1 FROM sess_dates GROUP BY date_trunc('month', d) HAVING COUNT(*) >= 20) AS ok
  ),
  weekend AS (
    SELECT COUNT(DISTINCT date_trunc('week', day)) AS n FROM days WHERE EXTRACT(dow FROM day) IN (0, 6)
  ),
  hybrid AS (
    SELECT EXISTS (
      SELECT date_trunc('week', date) FROM gym
      INTERSECT SELECT date_trunc('week', date) FROM sport
      INTERSECT SELECT date_trunc('week', started_at) FROM act WHERE started_at IS NOT NULL
    ) AS ok
  ),
  daily_vol AS (
    SELECT COALESCE(MAX(vol), 0) AS mx FROM (
      SELECT wdate, SUM(sets * reps * COALESCE(weight_kg, 0)) AS vol FROM ex GROUP BY wdate
    ) q
  ),
  m AS (
    SELECT
      (SELECT COUNT(*) FROM gym) + (SELECT COUNT(*) FROM sport) + (SELECT COUNT(*) FROM act) AS sessions,
      (SELECT COALESCE(MAX(weight_kg), 0) FROM ex WHERE name ILIKE '%bankdrück%' OR name ILIKE '%bankdruck%' OR name ILIKE '%bench%' OR name ILIKE '%жим леж%' OR name ILIKE '%жим лёж%') AS bench_mx,
      (SELECT COALESCE(MAX(weight_kg), 0) FROM ex WHERE name ILIKE '%kniebeuge%' OR name ILIKE '%squat%' OR name ILIKE '%присід%') AS squat_mx,
      (SELECT COALESCE(MAX(weight_kg), 0) FROM ex WHERE name ILIKE '%kreuzheben%' OR name ILIKE '%deadlift%' OR name ILIKE '%станова%') AS dead_mx,
      (SELECT COALESCE(SUM(sets * reps * COALESCE(weight_kg, 0)), 0) FROM ex) AS tonnage,
      (SELECT COALESCE(SUM(sets), 0) FROM ex) AS total_sets,
      (SELECT COALESCE(MAX(distance_m), 0) FROM act WHERE sport LIKE '%run%') AS max_dist,
      (SELECT COALESCE(SUM(distance_m), 0) FROM act) AS total_dist,
      (SELECT COALESCE(SUM(elevation_gain_m), 0) FROM act) AS elev_total,
      (SELECT COALESCE(MAX(elevation_gain_m), 0) FROM act) AS elev_single,
      (SELECT COALESCE(SUM(calories), 0) FROM act) AS kcal_total,
      (SELECT COALESCE(MAX(calories), 0) FROM act) AS kcal_single,
      (SELECT COALESCE(SUM(duration_min), 0) FROM gym) * 60
        + (SELECT COALESCE(SUM(duration_min), 0) FROM sport) * 60
        + (SELECT COALESCE(SUM(duration_s), 0) FROM act) AS total_secs,
      (SELECT COUNT(*) FROM public.daily_stats WHERE user_id = _uid) AS checkins,
      (SELECT COUNT(*) FROM sport WHERE kind = 'match') AS matches,
      (SELECT COUNT(*) FROM sport WHERE kind = 'match' AND match_hardness = 'hard') AS hard_matches,
      (SELECT COUNT(*) FROM act WHERE avg_hr IS NOT NULL) AS hr_acts,
      (SELECT COALESCE(MAX(max_hr), 0) FROM act) AS max_hr_v,
      (SELECT COUNT(DISTINCT sport) FROM act WHERE sport IS NOT NULL) AS sport_kinds,
      (SELECT EXISTS (SELECT 1 FROM act WHERE sport LIKE '%swim%')) AS has_swim,
      (SELECT EXISTS (SELECT 1 FROM act WHERE sport LIKE '%bike%')) AS has_bike,
      (SELECT EXISTS (SELECT 1 FROM act WHERE sport LIKE '%run%')) AS has_run,
      (SELECT EXISTS (SELECT 1 FROM act WHERE sport LIKE '%run%' AND distance_m >= 15000)) AS long_run,
      (SELECT EXISTS (SELECT 1 FROM act WHERE sport LIKE '%bike%' AND distance_m >= 100000)) AS gran_fondo,
      (SELECT EXISTS (SELECT 1 FROM act WHERE COALESCE(duration_s, 0) >= 10800)) AS ep3h,
      (SELECT EXISTS (SELECT 1 FROM act WHERE sport LIKE '%run%' AND distance_m >= 5000 AND COALESCE(moving_duration_s, duration_s) > 0 AND (COALESCE(moving_duration_s, duration_s)::numeric / distance_m * 5000) <= 1500)) AS p5k,
      (SELECT EXISTS (SELECT 1 FROM act WHERE sport LIKE '%run%' AND distance_m >= 10000 AND COALESCE(moving_duration_s, duration_s) > 0 AND (COALESCE(moving_duration_s, duration_s)::numeric / distance_m * 10000) <= 3000)) AS p10k,
      (SELECT EXISTS (SELECT 1 FROM act WHERE sport LIKE '%run%' AND distance_m >= 21097 AND COALESCE(moving_duration_s, duration_s) > 0 AND (COALESCE(moving_duration_s, duration_s)::numeric / distance_m * 21097) <= 7200)) AS phalf,
      (SELECT COUNT(*) FROM act WHERE started_at IS NOT NULL AND EXTRACT(hour FROM (started_at + make_interval(mins => COALESCE(timezone_offset_min, 0)))) < 7)
        + (SELECT COUNT(*) FROM sport WHERE kickoff_at IS NOT NULL AND EXTRACT(hour FROM kickoff_at) < 7) AS early_cnt,
      (SELECT COUNT(*) FROM act WHERE started_at IS NOT NULL AND EXTRACT(hour FROM (started_at + make_interval(mins => COALESCE(timezone_offset_min, 0)))) >= 21)
        + (SELECT COUNT(*) FROM sport WHERE kickoff_at IS NOT NULL AND EXTRACT(hour FROM kickoff_at) >= 21) AS night_cnt,
      (SELECT EXISTS (SELECT 1 FROM days WHERE EXTRACT(month FROM day) = 1 AND EXTRACT(day FROM day) = 1)) AS newyear,
      (SELECT EXISTS (SELECT 1 FROM days WHERE EXTRACT(month FROM day) = 12 AND EXTRACT(day FROM day) IN (24, 25))) AS festive,
      (SELECT (COUNT(*) FILTER (WHERE session_type IN ('push', 'pull', 'legs', 'upper', 'lower', 'full')) >= 6)
         FROM (SELECT DISTINCT session_type FROM gym) g) AS gym_all,
      (SELECT best FROM streak) AS streak,
      (SELECT best FROM sleep_streak) AS sleep_streak,
      (SELECT ok FROM perfect_week) AS perfect_week,
      (SELECT ok FROM big_month) AS big_month,
      (SELECT n FROM weekend) AS weekend_n,
      (SELECT ok FROM hybrid) AS hybrid,
      (SELECT mx FROM daily_vol) AS daily_vol
  )
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT _uid, v.k
  FROM m, LATERAL (VALUES
    -- Phase 3 (33)
    ('first_workout', m.sessions > 0),
    ('sessions_10', m.sessions >= 10),
    ('sessions_50', m.sessions >= 50),
    ('sessions_100', m.sessions >= 100),
    ('sessions_250', m.sessions >= 250),
    ('bench_60', m.bench_mx >= 60),
    ('bench_80', m.bench_mx >= 80),
    ('bench_100', m.bench_mx >= 100),
    ('bench_120', m.bench_mx >= 120),
    ('bench_140', m.bench_mx >= 140),
    ('bench_160', m.bench_mx >= 160),
    ('bench_180', m.bench_mx >= 180),
    ('bench_200', m.bench_mx >= 200),
    ('squat_100', m.squat_mx >= 100),
    ('squat_140', m.squat_mx >= 140),
    ('squat_180', m.squat_mx >= 180),
    ('deadlift_120', m.dead_mx >= 120),
    ('deadlift_180', m.dead_mx >= 180),
    ('deadlift_220', m.dead_mx >= 220),
    ('tonnage_100t', m.tonnage >= 100000),
    ('tonnage_500t', m.tonnage >= 500000),
    ('half_marathon', m.max_dist >= 21097),
    ('marathon', m.max_dist >= 42195),
    ('ultra', m.max_dist >= 50000),
    ('dist_100', m.total_dist >= 100000),
    ('dist_500', m.total_dist >= 500000),
    ('dist_1000', m.total_dist >= 1000000),
    ('streak_7', m.streak >= 7),
    ('streak_30', m.streak >= 30),
    ('streak_100', m.streak >= 100),
    ('hybrid_week', m.hybrid),
    ('football_match', m.matches > 0),
    ('checkin_30', m.checkins >= 30),
    -- Erweiterung (+40)
    ('climb_1000', m.elev_total >= 1000),
    ('climb_everest', m.elev_total >= 8848),
    ('climb_25000', m.elev_total >= 25000),
    ('climb_single_500', m.elev_single >= 500),
    ('burn_10k', m.kcal_total >= 10000),
    ('burn_100k', m.kcal_total >= 100000),
    ('burn_1000', m.kcal_single >= 1000),
    ('pace_5k_25', m.p5k),
    ('pace_10k_50', m.p10k),
    ('pace_half_2h', m.phalf),
    ('long_run_15', m.long_run),
    ('gran_fondo', m.gran_fondo),
    ('dist_2500', m.total_dist >= 2500000),
    ('dist_5000', m.total_dist >= 5000000),
    ('hours_10', m.total_secs >= 36000),
    ('hours_50', m.total_secs >= 180000),
    ('hours_100', m.total_secs >= 360000),
    ('endurance_3h', m.ep3h),
    ('streak_365', m.streak >= 365),
    ('perfect_week', m.perfect_week),
    ('big_month', m.big_month),
    ('weekend_warrior', m.weekend_n >= 10),
    ('checkin_100', m.checkins >= 100),
    ('early_bird', m.early_cnt >= 10),
    ('night_owl', m.night_cnt >= 10),
    ('new_year_grind', m.newyear),
    ('festive_grind', m.festive),
    ('triathlete', m.has_swim AND m.has_bike AND m.has_run),
    ('multisport_5', m.sport_kinds >= 5),
    ('gym_allround', m.gym_all),
    ('big_three_400', (m.bench_mx + m.squat_mx + m.dead_mx) >= 400),
    ('big_three_500', (m.bench_mx + m.squat_mx + m.dead_mx) >= 500),
    ('daily_volume_10t', m.daily_vol >= 10000),
    ('sets_500', m.total_sets >= 500),
    ('matches_10', m.matches >= 10),
    ('matches_50', m.matches >= 50),
    ('iron_matches', m.hard_matches >= 5),
    ('redline', m.max_hr_v >= 190),
    ('engine_20', m.hr_acts >= 20),
    ('well_rested', m.sleep_streak >= 7)
  ) AS v(k, ok)
  WHERE v.ok
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  RETURN QUERY
    SELECT b.badge_key, b.earned_at FROM public.user_badges b WHERE b.user_id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_my_badges() TO authenticated;
