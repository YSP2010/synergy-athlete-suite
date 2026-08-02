CREATE OR REPLACE FUNCTION public.get_team_readiness(_team_id UUID)
RETURNS TABLE(
  user_id UUID,
  name TEXT,
  last_checkin DATE,
  sleep_hours NUMERIC,
  sleep_quality INTEGER,
  soreness INTEGER,
  stress INTEGER,
  mood INTEGER,
  acute_load NUMERIC,
  chronic_load NUMERIC,
  history_days INTEGER,
  measured BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.is_coach_of_team(_team_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH mem AS (
    SELECT tm.user_id AS uid
    FROM public.team_members tm
    WHERE tm.team_id = _team_id AND tm.status = 'active'
  ),
  act AS (
    SELECT
      a.user_id AS uid,
      (a.started_at AT TIME ZONE 'UTC')::date AS d,
      SUM(COALESCE(a.moving_duration_s, a.duration_s, 0) / 60.0
          * CASE
              WHEN a.avg_hr IS NULL THEN 1.0
              WHEN a.avg_hr >= 165 THEN 1.5
              WHEN a.avg_hr >= 145 THEN 1.2
              WHEN a.avg_hr >= 125 THEN 1.0
              ELSE 0.7
            END) AS load
    FROM public.activities a
    JOIN mem ON mem.uid = a.user_id
    WHERE a.route_only = false
      AND a.started_at >= now() - INTERVAL '28 days'
    GROUP BY 1, 2
  ),
  manual AS (
    SELECT uid, d, SUM(load) AS load FROM (
      SELECT s.user_id AS uid, s.date AS d,
             COALESCE(s.duration_min, 60) *
             CASE
               WHEN s.kind = 'match' AND s.match_hardness = 'hard' THEN 1.6
               WHEN s.kind = 'match' THEN 1.4
               WHEN s.intensity = 'high' THEN 1.4
               WHEN s.intensity = 'mid' THEN 1.0
               ELSE 0.7
             END AS load
      FROM public.workouts_sport s
      JOIN mem ON mem.uid = s.user_id
      WHERE s.status = 'done' AND s.date >= (CURRENT_DATE - 28)
      UNION ALL
      SELECT g.user_id, g.date, COALESCE(g.duration_min, 60) * 0.8
      FROM public.workouts_gym g
      JOIN mem ON mem.uid = g.user_id
      WHERE g.status = 'done' AND g.date >= (CURRENT_DATE - 28)
    ) x
    GROUP BY uid, d
  ),
  daily AS (
    SELECT uid, d, load, true AS is_measured FROM act
    UNION ALL
    SELECT m.uid, m.d, m.load, false
    FROM manual m
    WHERE NOT EXISTS (SELECT 1 FROM act a WHERE a.uid = m.uid AND a.d = m.d)
  ),
  agg AS (
    SELECT
      uid,
      COALESCE(SUM(load) FILTER (WHERE d >= CURRENT_DATE - 7), 0) AS acute,
      COALESCE(SUM(load), 0) / 4.0 AS chronic,
      (CURRENT_DATE - MIN(d))::int AS hist,
      BOOL_OR(is_measured) AS measured
    FROM daily
    GROUP BY uid
  ),
  stat AS (
    SELECT DISTINCT ON (ds.user_id)
      ds.user_id AS uid, ds.date, ds.sleep_hours, ds.sleep_quality,
      ds.soreness, ds.stress, ds.mood
    FROM public.daily_stats ds
    JOIN mem ON mem.uid = ds.user_id
    ORDER BY ds.user_id, ds.date DESC
  )
  SELECT
    mem.uid,
    COALESCE(p.name, 'Athlet'),
    stat.date,
    stat.sleep_hours,
    stat.sleep_quality,
    stat.soreness,
    stat.stress,
    stat.mood,
    ROUND(COALESCE(agg.acute, 0)::numeric, 1),
    ROUND(COALESCE(agg.chronic, 0)::numeric, 1),
    COALESCE(agg.hist, 0),
    COALESCE(agg.measured, false)
  FROM mem
  LEFT JOIN public.profiles p ON p.id = mem.uid
  LEFT JOIN agg ON agg.uid = mem.uid
  LEFT JOIN stat ON stat.uid = mem.uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_readiness(UUID) TO authenticated, service_role;