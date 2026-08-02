CREATE OR REPLACE FUNCTION public.course_leaderboard(_course_id uuid)
RETURNS TABLE(
  effort_id uuid,
  user_id uuid,
  athlete_name text,
  is_me boolean,
  started_at timestamptz,
  duration_s integer,
  distance_m numeric,
  avg_hr integer,
  avg_speed_mps numeric,
  verified boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  allowed boolean;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT (c.is_public OR c.user_id = me) INTO allowed
  FROM public.courses c WHERE c.id = _course_id;

  IF allowed IS NOT TRUE THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (e.user_id)
    e.id,
    e.user_id,
    COALESCE(p.name, 'Athlet'),
    (e.user_id = me),
    e.started_at,
    e.duration_s,
    e.distance_m,
    e.avg_hr,
    e.avg_speed_mps,
    e.verified
  FROM public.course_efforts e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.course_id = _course_id
  ORDER BY e.user_id, e.duration_s ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.course_leaderboard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.course_leaderboard(uuid) TO authenticated, service_role;