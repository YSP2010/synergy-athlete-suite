-- ============================================
-- Team Creation Role Check (Security Hardening)
-- ============================================
-- Zuvor konnte ein Athlet per direktem RPC-/API-Call ein Team erstellen und
-- damit faktisch Coach-Rechte fuer dieses Team erlangen (is_coach_of_team /
-- coach_can_view_athlete pruefen nur teams.coach_id = auth.uid(), nicht die
-- Rolle). Nur die UI hatte den Bereich hinter role === 'coach' versteckt.
-- Diese Migration erzwingt den Rollen-Check serverseitig sowohl in der RPC
-- als auch in der RLS-INSERT-Policy auf public.teams.

-- --------------------------------------------
-- 1. RPC haerten: Rollen-Check direkt nach der Nicht-angemeldet-Pruefung.
--    Identisch zur Definition aus 20260705100000_team_lifecycle_fixes.sql,
--    nur um den Rollen-Check ergaenzt.
-- --------------------------------------------
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
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _me AND role = 'coach') THEN
    RAISE EXCEPTION 'Nur Trainer können Teams erstellen';
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

-- --------------------------------------------
-- 2. RLS auf public.teams haerten (defense in depth).
--    Bisher deckte "coach manages own teams" (FOR ALL) alle Operationen ohne
--    Rollen-Check ab. Wir ersetzen sie durch granulare Policies: INSERT
--    verlangt zusaetzlich die Coach-Rolle, waehrend SELECT/UPDATE/DELETE fuer
--    eigene Teams (coach_id = auth.uid()) uneingeschraenkt bleiben, damit ein
--    Coach seine bestehenden Teams weiter verwalten kann (z.B. toggleLock).
--    Die separate Policy "members can view their team" (FOR SELECT) aus
--    20260704075654 bleibt unangetastet.
-- --------------------------------------------
DROP POLICY IF EXISTS "coach manages own teams" ON public.teams;

CREATE POLICY "coach creates own teams" ON public.teams FOR INSERT
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'coach'
    )
  );

CREATE POLICY "coach reads own teams" ON public.teams FOR SELECT
  USING (coach_id = auth.uid());

CREATE POLICY "coach updates own teams" ON public.teams FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "coach deletes own teams" ON public.teams FOR DELETE
  USING (coach_id = auth.uid());
