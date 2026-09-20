-- ============================================
-- Rate-Limit-Log für KI-Trainingstipps (generateTrainingTip).
-- Speichert ausschliesslich einen Zeitstempel je Aufruf und Nutzer:in, um die
-- Anzahl Tipps pro 24h zu begrenzen und so das LOVABLE_API_KEY-Kontingent zu
-- schützen. Es werden KEINE Inhalte (Prompt/Antwort) gespeichert.
-- ============================================

CREATE TABLE public.ai_tip_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_tip_log TO authenticated;
GRANT ALL ON public.ai_tip_log TO service_role;
ALTER TABLE public.ai_tip_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tip log" ON public.ai_tip_log FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_ai_tip_log_user_created ON public.ai_tip_log(user_id, created_at);
