CREATE TYPE public.import_status AS ENUM ('queued','processing','done','failed','skipped');

CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'single',
  original_filename TEXT,
  total_files INT NOT NULL DEFAULT 0,
  processed_files INT NOT NULL DEFAULT 0,
  imported_activities INT NOT NULL DEFAULT 0,
  duplicate_files INT NOT NULL DEFAULT 0,
  failed_files INT NOT NULL DEFAULT 0,
  status public.import_status NOT NULL DEFAULT 'queued',
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_jobs TO authenticated;
GRANT ALL ON public.import_jobs TO service_role;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own import jobs" ON public.import_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_import_jobs_updated_at BEFORE UPDATE ON public.import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_import_jobs_user_created ON public.import_jobs(user_id, created_at DESC);

CREATE TABLE public.import_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT,
  relative_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'unknown',
  content_hash TEXT NOT NULL,
  status public.import_status NOT NULL DEFAULT 'queued',
  skip_reason TEXT,
  error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT import_files_user_hash_unique UNIQUE (user_id, content_hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_files TO authenticated;
GRANT ALL ON public.import_files TO service_role;
ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own import files" ON public.import_files FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_import_files_updated_at BEFORE UPDATE ON public.import_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_import_files_job_status ON public.import_files(job_id, status);