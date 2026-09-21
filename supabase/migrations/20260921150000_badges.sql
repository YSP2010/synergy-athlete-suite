-- ============================================================
-- Gamification – Phase 3: Badges / Abzeichen (rein additiv)
-- user_badges speichert verdiente (permanente) Abzeichen.
-- sync_my_badges() prueft Kriterien aus Trainingsdaten und vergibt neu.
-- Badge-Katalog (Namen/Kriterien) lebt clientseitig (badges.ts).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own badges read" ON public.user_badges;
CREATE POLICY "own badges read" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

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
  ex AS (SELECT e.* FROM public.gym_exercises e JOIN gym g ON g.id = e.workout_id),
  days AS (
    SELECT DISTINCT d AS day FROM (
      SELECT date AS d FROM gym
      UNION SELECT date FROM sport
      UNION SELECT started_at::date FROM act WHERE started_at IS NOT NULL
    ) x
  ),
  streak AS (
    SELECT COALESCE(MAX(len), 0) AS best FROM (
      SELECT COUNT(*) AS len
      FROM (SELECT day, (day - (ROW_NUMBER() OVER (ORDER BY day))::int) AS grp FROM days) z
      GROUP BY grp
    ) s
  ),
  hybrid AS (
    SELECT EXISTS (
      SELECT date_trunc('week', date) FROM gym
      INTERSECT SELECT date_trunc('week', date) FROM sport
      INTERSECT SELECT date_trunc('week', started_at) FROM act WHERE started_at IS NOT NULL
    ) AS ok
  ),
  m AS (
    SELECT
      (SELECT COUNT(*) FROM gym) + (SELECT COUNT(*) FROM sport) + (SELECT COUNT(*) FROM act) AS sessions,
      (SELECT COALESCE(MAX(weight_kg), 0) FROM ex WHERE name ILIKE '%bankdrück%' OR name ILIKE '%bankdruck%' OR name ILIKE '%bench%' OR name ILIKE '%жим леж%' OR name ILIKE '%жим лёж%') AS bench_mx,
      (SELECT COALESCE(MAX(weight_kg), 0) FROM ex WHERE name ILIKE '%kniebeuge%' OR name ILIKE '%squat%' OR name ILIKE '%присід%') AS squat_mx,
      (SELECT COALESCE(MAX(weight_kg), 0) FROM ex WHERE name ILIKE '%kreuzheben%' OR name ILIKE '%deadlift%' OR name ILIKE '%станова%') AS dead_mx,
      (SELECT COALESCE(SUM(sets * reps * COALESCE(weight_kg, 0)), 0) FROM ex) AS tonnage,
      (SELECT COALESCE(MAX(distance_m), 0) FROM act WHERE sport LIKE '%run%') AS max_dist,
      (SELECT COALESCE(SUM(distance_m), 0) FROM act) AS total_dist,
      (SELECT COUNT(*) FROM public.daily_stats WHERE user_id = _uid) AS checkins,
      (SELECT COUNT(*) FROM sport WHERE kind = 'match') AS matches,
      (SELECT best FROM streak) AS streak,
      (SELECT ok FROM hybrid) AS hybrid
  )
  INSERT INTO public.user_badges (user_id, badge_key)
  SELECT _uid, v.k
  FROM m, LATERAL (VALUES
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
    ('checkin_30', m.checkins >= 30)
  ) AS v(k, ok)
  WHERE v.ok
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  RETURN QUERY
    SELECT b.badge_key, b.earned_at FROM public.user_badges b WHERE b.user_id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_my_badges() TO authenticated;
