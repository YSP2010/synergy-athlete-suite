-- ============================================
-- Trainingsfokus: profiles.training_focus
-- ============================================
-- Speichert die Muskelgruppen-Fokus-Einstellung (Preset + Feinauswahl je
-- Gruppe) als JSONB. Rein additiv – bestehende Spalten bleiben unberührt.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS training_focus JSONB NOT NULL DEFAULT '{}'::JSONB;
