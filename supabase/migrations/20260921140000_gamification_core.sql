-- ============================================================
-- Gamification – Phase 1: XP- & Rang-Engine (rein additiv)
-- ------------------------------------------------------------
-- * profiles: total_xp, first_training_at, avatar (JSONB)
-- * xp_events: Ledger (Quelle der Wahrheit, idempotent per UNIQUE)
-- * compute_and_store_xp(uid): berechnet Trainings-XP neu + setzt total_xp
-- * sync_my_xp(): RPC fuer den eingeloggten Nutzer (Recompute + Rueckgabe)
-- Der Rang selbst wird clientseitig aus total_xp abgeleitet (rank.ts).
-- KEINE bestehende Tabelle/Logik wird veraendert.
-- ============================================================

-- 1) Profil-Spalten (additiv) -------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_training_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) XP-Ledger ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('training_gym','training_sport','activity','challenge')),
  source_id text NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id)
);
GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
-- Nur Lesen der eigenen Zeilen. Schreiben ausschliesslich ueber die
-- SECURITY-DEFINER-Funktionen unten (Clients koennen XP nicht selbst setzen).
DROP POLICY IF EXISTS "own xp events read" ON public.xp_events;
CREATE POLICY "own xp events read" ON public.xp_events FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON public.xp_events(user_id, created_at);

-- 3) Neuberechnung der Trainings-XP eines Nutzers -----------------------------
--    Voll-Recompute (idempotent): loescht die abgeleiteten Trainings-Events und
--    baut sie neu auf. Challenge-Events bleiben unberuehrt.
CREATE OR REPLACE FUNCTION public.compute_and_store_xp(_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.xp_events
   WHERE user_id = _uid
     AND source_type IN ('training_gym','training_sport','activity');

  -- Gym: 25 Basis + min(50, Volumen/500) + RPE-Bonus (>=8 -> +10)
  INSERT INTO public.xp_events (user_id, source_type, source_id, amount)
  SELECT g.user_id, 'training_gym', g.id::text,
         (25
          + LEAST(50, FLOOR(COALESCE(v.volume, 0) / 500.0))
          + CASE WHEN COALESCE(v.avg_rpe, 0) >= 8 THEN 10 ELSE 0 END)::int
  FROM public.workouts_gym g
  LEFT JOIN (
    SELECT workout_id,
           SUM(sets * reps * COALESCE(weight_kg, 0)) AS volume,
           AVG(rpe) AS avg_rpe
    FROM public.gym_exercises
    GROUP BY workout_id
  ) v ON v.workout_id = g.id
  WHERE g.user_id = _uid AND g.status = 'done';

  -- Sport: 25 Basis + min(40, Dauer/3) + Intensitaets-Bonus
  INSERT INTO public.xp_events (user_id, source_type, source_id, amount)
  SELECT s.user_id, 'training_sport', s.id::text,
         (25
          + LEAST(40, FLOOR(COALESCE(s.duration_min, 0) / 3.0))
          + CASE s.intensity WHEN 'high' THEN 20 WHEN 'mid' THEN 10 ELSE 0 END)::int
  FROM public.workouts_sport s
  WHERE s.user_id = _uid AND s.status = 'done';

  -- Ausdauer-Aktivitaeten: 20 Basis + min(150, 2/km) + min(60, 1 je 5 min)
  INSERT INTO public.xp_events (user_id, source_type, source_id, amount)
  SELECT a.user_id, 'activity', a.id::text,
         (20
          + LEAST(150, FLOOR(COALESCE(a.distance_m, 0) / 500.0))
          + LEAST(60, FLOOR(COALESCE(a.duration_s, 0) / 300.0)))::int
  FROM public.activities a
  WHERE a.user_id = _uid AND a.route_only = false;

  -- Profil aktualisieren: Gesamt-XP + Zeitpunkt des ersten Trainings.
  UPDATE public.profiles p
     SET total_xp = COALESCE((SELECT SUM(amount) FROM public.xp_events WHERE user_id = _uid), 0),
         first_training_at = (
           SELECT MIN(t) FROM (
             SELECT MIN(g.date::timestamptz) AS t
               FROM public.workouts_gym g WHERE g.user_id = _uid AND g.status = 'done'
             UNION ALL
             SELECT MIN(s.date::timestamptz)
               FROM public.workouts_sport s WHERE s.user_id = _uid AND s.status = 'done'
             UNION ALL
             SELECT MIN(a.started_at)
               FROM public.activities a WHERE a.user_id = _uid AND a.route_only = false
           ) mins
         )
   WHERE p.id = _uid;
END;
$$;

-- Nur intern aufrufbar (nicht direkt durch Clients mit fremder uid).
REVOKE ALL ON FUNCTION public.compute_and_store_xp(uuid) FROM PUBLIC;

-- 4) RPC fuer den eingeloggten Nutzer ----------------------------------------
CREATE OR REPLACE FUNCTION public.sync_my_xp()
RETURNS TABLE (total_xp integer, first_training_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  PERFORM public.compute_and_store_xp(_uid);
  RETURN QUERY
    SELECT p.total_xp, p.first_training_at
    FROM public.profiles p
    WHERE p.id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_my_xp() TO authenticated;
