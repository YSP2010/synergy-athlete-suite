-- ============================================
-- Body-Scan: Rate-Limit-Log body_scans + Storage-Policies
-- ============================================
-- Speichert AUSSCHLIESSLICH einen Zeitstempel je Aufruf und Nutzer:in, um die
-- Anzahl Body-Scans pro 24h zu begrenzen. KEIN Bild und KEIN Ergebnis werden
-- gespeichert – das Foto wird direkt nach der Analyse serverseitig gelöscht.
-- HINWEIS: Der private Storage-Bucket 'body-scans' muss im Supabase-Dashboard
-- angelegt werden (Storage → New bucket, Name 'body-scans', NICHT public).

CREATE TABLE IF NOT EXISTS public.body_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.body_scans TO authenticated;
GRANT ALL ON public.body_scans TO service_role;
ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own body scans" ON public.body_scans;
CREATE POLICY "own body scans" ON public.body_scans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_body_scans_user_created
  ON public.body_scans (user_id, created_at);

-- Storage-Policies für den Bucket 'body-scans' (eigener Ordner pro Nutzer)
DROP POLICY IF EXISTS "own body-scans read" ON storage.objects;
CREATE POLICY "own body-scans read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'body-scans' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own body-scans insert" ON storage.objects;
CREATE POLICY "own body-scans insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'body-scans' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "own body-scans delete" ON storage.objects;
CREATE POLICY "own body-scans delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'body-scans' AND (storage.foldername(name))[1] = auth.uid()::text);
