-- ============================================
-- Trainingsplan-Generator: training_plans + profiles.experience_level
-- ============================================
-- Fuegt die Tabelle fuer generierte, mehrwoechige Trainingsplaene (Gym / Sport)
-- hinzu sowie ein Erfahrungslevel-Feld im Profil. Rein additiv – bestehende
-- Tabellen (profiles, weekly_planner) bleiben unveraendert.

-- ============ 1) Enums ============
DO $$ BEGIN
  CREATE TYPE public.training_plan_type AS ENUM ('gym','sport');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.experience_level AS ENUM ('beginner','intermediate','advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 2) Profil: Erfahrungslevel ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_level public.experience_level NOT NULL DEFAULT 'intermediate';

-- ============ 3) training_plans ============
CREATE TABLE IF NOT EXISTS public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.training_plan_type NOT NULL,
  goal TEXT,
  weeks INT NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}'::JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_plans TO authenticated;
GRANT ALL ON public.training_plans TO service_role;

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own training plans" ON public.training_plans;
CREATE POLICY "own training plans" ON public.training_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cooldown-Abfrage: neuester Plan je Nutzer + Typ
CREATE INDEX IF NOT EXISTS idx_training_plans_user_type_created
  ON public.training_plans (user_id, type, created_at DESC);

DROP TRIGGER IF EXISTS trg_training_plans_updated ON public.training_plans;
CREATE TRIGGER trg_training_plans_updated BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
