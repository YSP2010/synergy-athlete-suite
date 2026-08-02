-- =========================================================
-- Etappe 2: Aktivitäten, Verläufe, Runden, Strecken
-- =========================================================

CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_file_id UUID REFERENCES public.import_files(id) ON DELETE SET NULL,
  sport TEXT NOT NULL DEFAULT 'other',
  name TEXT,
  started_at TIMESTAMPTZ,
  timezone_offset_min INTEGER,
  duration_s NUMERIC,
  moving_duration_s NUMERIC,
  distance_m NUMERIC,
  elevation_gain_m NUMERIC,
  elevation_loss_m NUMERIC,
  avg_speed_mps NUMERIC,
  max_speed_mps NUMERIC,
  avg_hr INTEGER,
  max_hr INTEGER,
  avg_cadence NUMERIC,
  max_cadence NUMERIC,
  avg_power_w INTEGER,
  max_power_w INTEGER,
  normalized_power_w INTEGER,
  calories INTEGER,
  avg_temperature_c NUMERIC,
  avg_ground_contact_ms NUMERIC,
  avg_vertical_oscillation_cm NUMERIC,
  avg_vertical_ratio NUMERIC,
  avg_stride_length_m NUMERIC,
  gct_balance_pct NUMERIC,
  aerobic_te NUMERIC,
  anaerobic_te NUMERIC,
  training_load NUMERIC,
  device_activity_key TEXT,
  device_name TEXT,
  device_manufacturer TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  route_only BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX activities_device_key_uq
  ON public.activities(user_id, device_activity_key)
  WHERE device_activity_key IS NOT NULL;
CREATE INDEX activities_user_started_idx ON public.activities(user_id, started_at DESC);
CREATE INDEX activities_user_sport_idx ON public.activities(user_id, sport);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own activities" ON public.activities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------

CREATE TABLE public.activity_laps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lap_index INTEGER NOT NULL,
  sport TEXT,
  duration_s NUMERIC,
  distance_m NUMERIC,
  avg_hr INTEGER,
  avg_speed_mps NUMERIC,
  avg_power_w INTEGER,
  avg_cadence NUMERIC,
  elevation_gain_m NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, lap_index)
);

CREATE INDEX activity_laps_activity_idx ON public.activity_laps(activity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_laps TO authenticated;
GRANT ALL ON public.activity_laps TO service_role;
ALTER TABLE public.activity_laps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own laps" ON public.activity_laps FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------

CREATE TABLE public.activity_tracks (
  activity_id UUID NOT NULL PRIMARY KEY REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  point_count INTEGER NOT NULL DEFAULT 0,
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  bounds JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_tracks TO authenticated;
GRANT ALL ON public.activity_tracks TO service_role;
ALTER TABLE public.activity_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tracks" ON public.activity_tracks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------

CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sport TEXT NOT NULL DEFAULT 'run',
  distance_m NUMERIC NOT NULL DEFAULT 0,
  elevation_gain_m NUMERIC,
  start_lat NUMERIC,
  start_lng NUMERIC,
  end_lat NUMERIC,
  end_lng NUMERIC,
  geometry JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  source_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX courses_user_idx ON public.courses(user_id);
CREATE INDEX courses_public_idx ON public.courses(is_public) WHERE is_public;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own courses" ON public.courses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public courses readable" ON public.courses FOR SELECT TO authenticated
  USING (is_public);

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------

CREATE TABLE public.course_efforts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  duration_s NUMERIC NOT NULL,
  distance_m NUMERIC,
  avg_hr INTEGER,
  avg_speed_mps NUMERIC,
  match_score NUMERIC NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, activity_id)
);

CREATE INDEX course_efforts_course_idx ON public.course_efforts(course_id, duration_s);
CREATE INDEX course_efforts_user_idx ON public.course_efforts(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_efforts TO authenticated;
GRANT ALL ON public.course_efforts TO service_role;
ALTER TABLE public.course_efforts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own efforts" ON public.course_efforts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
