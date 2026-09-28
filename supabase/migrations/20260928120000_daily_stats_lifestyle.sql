-- ============================================
-- Lifestyle-Faktoren: daily_stats
-- ============================================
-- Erfasst optionale Lifestyle-Einflüsse pro Tag (Menge 0–3: keine/wenig/
-- mittel/viel) für die Erholungs-Korrelation. Rein additiv und nullable –
-- bestehende Zeilen und Spalten bleiben unberührt.

ALTER TABLE public.daily_stats
  ADD COLUMN IF NOT EXISTS caffeine SMALLINT
    CHECK (caffeine IS NULL OR caffeine BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS alcohol SMALLINT
    CHECK (alcohol IS NULL OR alcohol BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS late_meal SMALLINT
    CHECK (late_meal IS NULL OR late_meal BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS screen_before_bed SMALLINT
    CHECK (screen_before_bed IS NULL OR screen_before_bed BETWEEN 0 AND 3);
