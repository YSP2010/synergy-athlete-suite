DO $$ BEGIN
  CREATE TYPE public.activity_source AS ENUM ('file','garmin','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.wellness_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INT,
  distance_m NUMERIC,
  floors_climbed INT,
  resting_hr INT,
  min_hr INT,
  max_hr INT,
  avg_stress INT,
  max_stress INT,
  body_battery_start INT,
  body_battery_end INT,
  body_battery_min INT,
  body_battery_max INT,
  active_kcal INT,
  bmr_kcal INT,
  intensity_minutes_moderate INT,
  intensity_minutes_vigorous INT,
  avg_spo2 NUMERIC(4,1),
  avg_respiration NUMERIC(4,1),
  skin_temp_deviation_c NUMERIC(3,1),
  source public.activity_source NOT NULL DEFAULT 'file',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellness_daily TO authenticated;
GRANT ALL ON public.wellness_daily TO service_role;
ALTER TABLE public.wellness_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wellness" ON public.wellness_daily FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach reads wellness" ON public.wellness_daily FOR SELECT TO authenticated
  USING (public.coach_can_view_athlete(user_id));
CREATE TRIGGER trg_wellness_daily_updated BEFORE UPDATE ON public.wellness_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sleep_start TIMESTAMPTZ,
  sleep_end TIMESTAMPTZ,
  duration_s INT,
  deep_s INT,
  light_s INT,
  rem_s INT,
  awake_s INT,
  sleep_score INT,
  avg_sleep_hr INT,
  avg_sleep_hrv_ms NUMERIC(6,2),
  avg_spo2 NUMERIC(4,1),
  avg_respiration NUMERIC(4,1),
  restlessness NUMERIC(5,2),
  nap BOOLEAN NOT NULL DEFAULT false,
  source public.activity_source NOT NULL DEFAULT 'file',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sleep_logs TO authenticated;
GRANT ALL ON public.sleep_logs TO service_role;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sleep" ON public.sleep_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach reads sleep" ON public.sleep_logs FOR SELECT TO authenticated
  USING (public.coach_can_view_athlete(user_id));
CREATE TRIGGER trg_sleep_logs_updated BEFORE UPDATE ON public.sleep_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hrv_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  last_night_avg_ms NUMERIC(6,2),
  last_night_5min_high_ms NUMERIC(6,2),
  weekly_avg_ms NUMERIC(6,2),
  baseline_low_ms NUMERIC(6,2),
  baseline_high_ms NUMERIC(6,2),
  status TEXT,
  source public.activity_source NOT NULL DEFAULT 'file',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hrv_logs TO authenticated;
GRANT ALL ON public.hrv_logs TO service_role;
ALTER TABLE public.hrv_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hrv" ON public.hrv_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach reads hrv" ON public.hrv_logs FOR SELECT TO authenticated
  USING (public.coach_can_view_athlete(user_id));
CREATE TRIGGER trg_hrv_logs_updated BEFORE UPDATE ON public.hrv_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vo2max_running NUMERIC(4,1),
  vo2max_cycling NUMERIC(4,1),
  fitness_age NUMERIC(4,1),
  lactate_threshold_hr INT,
  lactate_threshold_speed_mps NUMERIC(5,3),
  ftp_w INT,
  training_readiness INT,
  training_status TEXT,
  acute_load NUMERIC(8,1),
  chronic_load NUMERIC(8,1),
  load_ratio NUMERIC(5,2),
  source public.activity_source NOT NULL DEFAULT 'file',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_metrics TO authenticated;
GRANT ALL ON public.user_metrics TO service_role;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metrics" ON public.user_metrics FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach reads metrics" ON public.user_metrics FOR SELECT TO authenticated
  USING (public.coach_can_view_athlete(user_id));
CREATE TRIGGER trg_user_metrics_updated BEFORE UPDATE ON public.user_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, sport, metric)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_records TO authenticated;
GRANT ALL ON public.personal_records TO service_role;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own records" ON public.personal_records FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coach reads records" ON public.personal_records FOR SELECT TO authenticated
  USING (public.coach_can_view_athlete(user_id));
CREATE TRIGGER trg_personal_records_updated BEFORE UPDATE ON public.personal_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_wellness_daily_user_date ON public.wellness_daily(user_id, date DESC);
CREATE INDEX idx_sleep_logs_user_date ON public.sleep_logs(user_id, date DESC);
CREATE INDEX idx_hrv_logs_user_date ON public.hrv_logs(user_id, date DESC);
CREATE INDEX idx_user_metrics_user_date ON public.user_metrics(user_id, date DESC);
CREATE INDEX idx_personal_records_user ON public.personal_records(user_id, sport);