CREATE TABLE public.team_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX team_invites_team_idx ON public.team_invites(team_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own team invites"
ON public.team_invites FOR ALL TO authenticated
USING (public.is_coach_of_team(team_id))
WITH CHECK (public.is_coach_of_team(team_id) AND created_by = auth.uid());

CREATE TRIGGER update_team_invites_updated_at
BEFORE UPDATE ON public.team_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mitglieder dürfen ihre eigene Mitgliedschaft beenden
CREATE POLICY "Members can leave their team"
ON public.team_members FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.peek_team_invite(_token_hash TEXT)
RETURNS TABLE(team_id UUID, team_name TEXT, coach_name TEXT, member_count INTEGER, valid BOOLEAN, reason TEXT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv public.team_invites%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.team_invites WHERE token_hash = _token_hash;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, 0, false, 'not_found';
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    COALESCE(p.name, 'Trainer'),
    (SELECT COUNT(*)::int FROM public.team_members tm WHERE tm.team_id = t.id AND tm.status = 'active'),
    CASE
      WHEN inv.revoked THEN false
      WHEN inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN false
      WHEN inv.max_uses IS NOT NULL AND inv.uses >= inv.max_uses THEN false
      ELSE true
    END,
    CASE
      WHEN inv.revoked THEN 'revoked'
      WHEN inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN 'expired'
      WHEN inv.max_uses IS NOT NULL AND inv.uses >= inv.max_uses THEN 'exhausted'
      ELSE 'ok'
    END
  FROM public.teams t
  LEFT JOIN public.profiles p ON p.id = t.coach_id
  WHERE t.id = inv.team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.peek_team_invite(TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.redeem_team_invite(_token_hash TEXT)
RETURNS TABLE(ok BOOLEAN, reason TEXT, team_id UUID, team_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me UUID := auth.uid();
  inv public.team_invites%ROWTYPE;
  t public.teams%ROWTYPE;
  existing public.team_members%ROWTYPE;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO inv FROM public.team_invites WHERE token_hash = _token_hash FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found', NULL::uuid, NULL::text; RETURN;
  END IF;

  SELECT * INTO t FROM public.teams WHERE id = inv.team_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found', NULL::uuid, NULL::text; RETURN;
  END IF;

  IF t.coach_id = me THEN
    RETURN QUERY SELECT false, 'is_coach', t.id, t.name; RETURN;
  END IF;

  SELECT * INTO existing FROM public.team_members WHERE team_id = t.id AND user_id = me;
  IF FOUND AND existing.status = 'active' THEN
    RETURN QUERY SELECT true, 'already_member', t.id, t.name; RETURN;
  END IF;

  IF inv.revoked THEN
    RETURN QUERY SELECT false, 'revoked', t.id, t.name; RETURN;
  END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN QUERY SELECT false, 'expired', t.id, t.name; RETURN;
  END IF;
  IF inv.max_uses IS NOT NULL AND inv.uses >= inv.max_uses THEN
    RETURN QUERY SELECT false, 'exhausted', t.id, t.name; RETURN;
  END IF;

  IF FOUND THEN
    UPDATE public.team_members
      SET status = 'active', responded_at = now()
      WHERE team_id = t.id AND user_id = me;
  ELSE
    INSERT INTO public.team_members(team_id, user_id, status, responded_at)
    VALUES (t.id, me, 'active', now());
  END IF;

  IF t.team_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_participants(chat_id, user_id)
    SELECT t.team_chat_id, me
    WHERE NOT EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = t.team_chat_id AND cp.user_id = me
    );
  END IF;

  UPDATE public.team_invites SET uses = uses + 1 WHERE id = inv.id;

  RETURN QUERY SELECT true, 'joined', t.id, t.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_team_invite(TEXT) TO authenticated, service_role;