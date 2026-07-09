
-- Prevent athletes from moving their own membership row to another team.
DROP POLICY IF EXISTS "user responds to own invite" ON public.team_members;

CREATE POLICY "user responds to own invite"
ON public.team_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND team_id = (SELECT tm.team_id FROM public.team_members tm WHERE tm.id = team_members.id)
  AND status IN ('pending','active','declined')
);
