DROP POLICY IF EXISTS "user responds to own invite" ON public.team_members;
CREATE POLICY "user responds to own invite"
ON public.team_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.team_members existing
    WHERE existing.id = team_members.id
      AND existing.user_id = auth.uid()
      AND existing.team_id = team_members.team_id
  )
);

DROP POLICY IF EXISTS "members can view their team" ON public.teams;
CREATE POLICY "members can view their team"
ON public.teams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = public.teams.id
      AND tm.user_id = auth.uid()
  )
);