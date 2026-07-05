-- ============================================
-- Team Lifecycle Fixes (P1)
-- ============================================

-- BUG 1: Athlet darf eigene Mitgliedschaft löschen (Team verlassen).
-- Zusätzliche permissive DELETE-Policy; wird von Postgres OR-verknüpft mit
-- der bestehenden Coach-ALL-Policy "coach manages team members".
CREATE POLICY "user leaves own membership" ON public.team_members FOR DELETE
  USING (user_id = auth.uid());

-- BUG 4: Atomare Team-Erstellung inkl. Team-Chat (verhindert Teams ohne
-- funktionierenden Chat, falls ein späterer Einzel-Call abbricht).
CREATE OR REPLACE FUNCTION public.create_team_with_chat(_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me UUID := auth.uid();
  _team_id UUID;
  _chat_id UUID;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Team-Name fehlt';
  END IF;

  INSERT INTO public.teams (name, coach_id)
  VALUES (trim(_name), _me)
  RETURNING id INTO _team_id;

  INSERT INTO public.chats (type, team_id, created_by)
  VALUES ('team', _team_id, _me)
  RETURNING id INTO _chat_id;

  INSERT INTO public.chat_participants (chat_id, user_id)
  VALUES (_chat_id, _me)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  UPDATE public.teams SET team_chat_id = _chat_id WHERE id = _team_id;

  RETURN _team_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_team_with_chat(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_with_chat(TEXT) TO authenticated;
