
-- Fix ambiguous column reference in teams SELECT policy
DROP POLICY IF EXISTS "members can view their team" ON public.teams;
CREATE POLICY "members can view their team"
  ON public.teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
    )
  );

-- Prevent team-hopping by restricting user self-update on team_members:
-- users may only change status/responded_at on their own row; team_id/user_id/id/invited_at are locked.
DROP POLICY IF EXISTS "user responds to own invite" ON public.team_members;

CREATE OR REPLACE FUNCTION public.tm_lock_user_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the acting user is the row owner and NOT the team coach.
  IF auth.uid() = OLD.user_id
     AND NOT public.is_coach_of_team(OLD.team_id) THEN
    IF NEW.team_id IS DISTINCT FROM OLD.team_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.invited_at IS DISTINCT FROM OLD.invited_at THEN
      RAISE EXCEPTION 'team membership immutable fields cannot be changed';
    END IF;
    IF NEW.status NOT IN ('pending','active','declined') THEN
      RAISE EXCEPTION 'invalid status transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tm_lock_user_self_update ON public.team_members;
CREATE TRIGGER tm_lock_user_self_update
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.tm_lock_user_self_update();

CREATE POLICY "user responds to own invite"
  ON public.team_members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
