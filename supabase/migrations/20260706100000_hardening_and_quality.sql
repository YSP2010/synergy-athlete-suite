-- ============================================
-- Hardening & Quality (additiv)
--  1. get_or_create_direct_chat: Beziehungs-Check ergänzen
--  8. Fehlende Indizes + Wertebereichs-Constraints
-- ============================================

-- --------------------------------------------
-- 1. Direktchat nur bei legitimer Team-Beziehung
-- --------------------------------------------
-- Bisher prüfte die RPC nur _other_user_id != auth.uid(). Damit konnte jeder
-- Nutzer mit einer beliebigen fremden UUID einen Direktchat öffnen. Wir ergänzen
-- eine Beziehungsprüfung. Der Chat darf nur entstehen, wenn mindestens eine der
-- folgenden Beziehungen zwischen _me und _other besteht:
--   (a) _me ist Coach eines Teams, in dem _other ein Mitglied ist (pending ODER
--       active) -- deckt den Einladungs-Flow in team.tsx ab, wo die team_members-
--       Zeile beim Aufruf noch 'pending' ist. Nur der Coach selbst kann pending-
--       Einladungen fuer sein eigenes Team anlegen, daher ist das unbedenklich.
--   (b) _other ist Coach eines Teams, in dem _me aktives Mitglied ist
--       (Gegenrichtung: Athlet startet Chat mit seinem Coach).
--   (c) _me und _other sind beide aktive Mitglieder desselben Teams (Teamkollegen).
CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me UUID := auth.uid();
  _chat_id UUID;
  _related BOOLEAN;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;
  IF _other_user_id = _me THEN
    RAISE EXCEPTION 'Kein Direktchat mit sich selbst';
  END IF;

  -- Beziehungs-Check
  SELECT (
    -- (a) _me ist Coach eines Teams, in dem _other Mitglied ist (pending oder active)
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE t.coach_id = _me AND tm.user_id = _other_user_id
    )
    -- (b) _other ist Coach eines Teams, in dem _me aktives Mitglied ist
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE t.coach_id = _other_user_id AND tm.user_id = _me AND tm.status = 'active'
    )
    -- (c) beide aktive Mitglieder desselben Teams
    OR EXISTS (
      SELECT 1
      FROM public.team_members a
      JOIN public.team_members b ON b.team_id = a.team_id
      WHERE a.user_id = _me AND a.status = 'active'
        AND b.user_id = _other_user_id AND b.status = 'active'
    )
  ) INTO _related;

  IF NOT _related THEN
    RAISE EXCEPTION 'Keine gemeinsame Team-Beziehung';
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

-- --------------------------------------------
-- 8. Indizes + Wertebereichs-Constraints (rein additiv)
-- --------------------------------------------

-- Index fuer die Rate-Limit-Zaehlung in scan.functions.ts (food_scans pro user_id/created_at)
CREATE INDEX IF NOT EXISTS idx_food_scans_user_created ON public.food_scans(user_id, created_at);

-- Index fuer Journal-Abfragen
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON public.journal_entries(user_id, date);

-- Wertebereichs-Constraints (Spaltentypen aus der Ur-Migration geprueft):
--   daily_stats.sleep_hours   NUMERIC(3,1)  -> 0..24
--   gym_exercises.sets        INT           -> >= 0
--   gym_exercises.reps        INT           -> >= 0
--   gym_exercises.rpe         NUMERIC(3,1)  -> 0..10 (RPE-Standard)
--   nutrition_logs.kcal/..._g NUMERIC       -> >= 0
ALTER TABLE public.daily_stats
  ADD CONSTRAINT chk_daily_stats_sleep_hours
  CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24));

ALTER TABLE public.gym_exercises
  ADD CONSTRAINT chk_gym_exercises_sets CHECK (sets >= 0);
ALTER TABLE public.gym_exercises
  ADD CONSTRAINT chk_gym_exercises_reps CHECK (reps >= 0);
ALTER TABLE public.gym_exercises
  ADD CONSTRAINT chk_gym_exercises_rpe
  CHECK (rpe IS NULL OR (rpe >= 0 AND rpe <= 10));

ALTER TABLE public.nutrition_logs
  ADD CONSTRAINT chk_nutrition_logs_nonneg
  CHECK (kcal >= 0 AND protein_g >= 0 AND carbs_g >= 0 AND fat_g >= 0);
