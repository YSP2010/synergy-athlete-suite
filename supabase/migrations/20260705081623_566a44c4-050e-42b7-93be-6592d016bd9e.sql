
-- 1) Revoke public/anon EXECUTE from internal helper SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.is_chat_participant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_coach_of_team(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.coach_can_view_athlete(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2) Restrict find_profile_by_email to coaches only, mitigating email enumeration
CREATE OR REPLACE FUNCTION public.find_profile_by_email(_email text)
RETURNS TABLE(id uuid, name text, role public.user_role)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated coaches may look up profiles by email
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'coach'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
    SELECT p.id, p.name, p.role
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE lower(u.email) = lower(trim(_email))
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.find_profile_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_by_email(text) TO authenticated;

-- 3) Atomic direct-chat creation used by team.ts (avoids race + orphan chats)
CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  chat uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _other_user_id = me THEN RAISE EXCEPTION 'cannot chat with self'; END IF;

  -- existing direct chat?
  SELECT c.id INTO chat
  FROM public.chats c
  JOIN public.chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = me
  JOIN public.chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = _other_user_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF chat IS NOT NULL THEN
    RETURN chat;
  END IF;

  INSERT INTO public.chats(type, created_by) VALUES ('direct', me) RETURNING id INTO chat;
  INSERT INTO public.chat_participants(chat_id, user_id) VALUES (chat, me), (chat, _other_user_id);
  RETURN chat;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_chat(uuid) TO authenticated;
