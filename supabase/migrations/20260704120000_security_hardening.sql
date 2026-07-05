-- ============================================
-- Security Hardening (P0) + Bug Fixes (P1)
-- ============================================

-- 1.2 find_profile_by_email: nur Coaches dürfen nach E-Mail suchen
CREATE OR REPLACE FUNCTION public.find_profile_by_email(_email TEXT)
RETURNS TABLE(id UUID, name TEXT, role public.user_role)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.name, p.role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(_email)
    AND EXISTS (SELECT 1 FROM public.profiles me
                WHERE me.id = auth.uid() AND me.role = 'coach')
  LIMIT 1;
$$;

-- 1.3 / 1.4 SECURITY-DEFINER-Helper vor direktem Aufruf durch Clients schützen
REVOKE EXECUTE ON FUNCTION public.find_profile_by_email(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_coach_of_team(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.coach_can_view_athlete(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_team_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_chat_participant(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.find_profile_by_email(TEXT) TO authenticated;

-- 1.5 chat_participants INSERT-Policy: eigenständiges Beitreten nur zu Chats
--     des eigenen Teams; sonst nur durch Chat-Ersteller oder Team-Coach.
DROP POLICY IF EXISTS "add self or by team coach" ON public.chat_participants;
CREATE POLICY "join own team chat or added by creator/coach" ON public.chat_participants
FOR INSERT WITH CHECK (
  (user_id = auth.uid() AND EXISTS(
    SELECT 1 FROM public.chats c
    JOIN public.teams t ON t.id = c.team_id
    WHERE c.id = chat_id AND public.is_team_member(t.id, auth.uid())
  ))
  OR EXISTS(SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.created_by = auth.uid())
  OR EXISTS(SELECT 1 FROM public.chats c WHERE c.id = chat_id
            AND c.team_id IS NOT NULL AND public.is_coach_of_team(c.team_id))
);

-- 1.6 chats UPDATE-Policy um WITH CHECK ergänzen, damit ein Creator team_id
--     nicht auf ein fremdes Team umbiegen kann.
DROP POLICY IF EXISTS "creator or team coach updates chat" ON public.chats;
CREATE POLICY "creator or team coach updates chat" ON public.chats FOR UPDATE
  USING (created_by = auth.uid() OR (team_id IS NOT NULL AND public.is_coach_of_team(team_id)))
  WITH CHECK (created_by = auth.uid() OR (team_id IS NOT NULL AND public.is_coach_of_team(team_id)));

-- ============================================
-- 2.1 handle_new_user: Rolle aus user metadata übernehmen
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'athlete')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 2.2 Atomarer Direktchat (verhindert Race Conditions / verwaiste Chats)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me UUID := auth.uid();
  _chat_id UUID;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;
  IF _other_user_id = _me THEN
    RAISE EXCEPTION 'Kein Direktchat mit sich selbst';
  END IF;

  -- Bestehenden Direktchat suchen, in dem beide teilnehmen
  SELECT c.id INTO _chat_id
  FROM public.chats c
  JOIN public.chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = _me
  JOIN public.chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = _other_user_id
  WHERE c.type = 'direct'
  LIMIT 1;

  IF _chat_id IS NOT NULL THEN
    RETURN _chat_id;
  END IF;

  -- Atomar neu erstellen
  INSERT INTO public.chats (type, created_by)
  VALUES ('direct', _me)
  RETURNING id INTO _chat_id;

  INSERT INTO public.chat_participants (chat_id, user_id)
  VALUES (_chat_id, _me), (_chat_id, _other_user_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN _chat_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_chat(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_chat(UUID) TO authenticated;
