-- ============================================
-- KI-Fortschrittsauswertung: aggregierte Analysen der letzten 14 Tage
-- Speichert ausschliesslich KI-Textausgabe + selbst berechnete Aggregat-Metriken.
-- Keine Freitext-Rohdaten der Nutzer:innen fliessen ein (Prompt-Injection strukturell ausgeschlossen).
-- ============================================

CREATE TABLE public.progress_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::JSONB
);
GRANT SELECT, INSERT ON public.progress_insights TO authenticated;
GRANT ALL ON public.progress_insights TO service_role;
ALTER TABLE public.progress_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insights" ON public.progress_insights FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_insights_user_created ON public.progress_insights(user_id, created_at);
