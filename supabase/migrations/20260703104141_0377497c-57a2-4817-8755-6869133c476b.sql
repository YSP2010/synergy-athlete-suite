
-- Enums
CREATE TYPE public.goal_type AS ENUM ('muscle_gain', 'maintain', 'recomp', 'performance');
CREATE TYPE public.sex_type AS ENUM ('male', 'female', 'other');
CREATE TYPE public.gym_session_type AS ENUM ('push', 'pull', 'legs', 'upper', 'lower', 'full', 'light', 'mobility');
CREATE TYPE public.session_status AS ENUM ('planned', 'done', 'skipped');
CREATE TYPE public.sport_kind AS ENUM ('training', 'match');
CREATE TYPE public.intensity_level AS ENUM ('low', 'mid', 'high');
CREATE TYPE public.match_hardness AS ENUM ('easy', 'normal', 'hard');
CREATE TYPE public.meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE public.nutrition_source AS ENUM ('manual', 'scan');

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  birth_date DATE,
  sex public.sex_type,
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  sport TEXT DEFAULT 'football',
  position TEXT,
  diet_style TEXT,
  allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
  goal public.goal_type DEFAULT 'performance',
  gym_days INT[] DEFAULT ARRAY[]::INT[],
  sport_days INT[] DEFAULT ARRAY[]::INT[],
  match_days INT[] DEFAULT ARRAY[]::INT[],
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- WORKOUTS GYM
CREATE TABLE public.workouts_gym (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_type public.gym_session_type NOT NULL DEFAULT 'full',
  duration_min INT,
  notes TEXT,
  status public.session_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts_gym TO authenticated;
GRANT ALL ON public.workouts_gym TO service_role;
ALTER TABLE public.workouts_gym ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gym" ON public.workouts_gym FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_wgym_updated BEFORE UPDATE ON public.workouts_gym FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wgym_user_date ON public.workouts_gym(user_id, date);

-- GYM EXERCISES
CREATE TABLE public.gym_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts_gym(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INT NOT NULL DEFAULT 3,
  reps INT NOT NULL DEFAULT 8,
  weight_kg NUMERIC(6,2),
  rpe NUMERIC(3,1),
  order_idx INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gym_exercises TO authenticated;
GRANT ALL ON public.gym_exercises TO service_role;
ALTER TABLE public.gym_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercises" ON public.gym_exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WORKOUTS SPORT
CREATE TABLE public.workouts_sport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  kind public.sport_kind NOT NULL DEFAULT 'training',
  intensity public.intensity_level NOT NULL DEFAULT 'mid',
  match_hardness public.match_hardness,
  duration_min INT,
  notes TEXT,
  status public.session_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts_sport TO authenticated;
GRANT ALL ON public.workouts_sport TO service_role;
ALTER TABLE public.workouts_sport ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sport" ON public.workouts_sport FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_wsport_updated BEFORE UPDATE ON public.workouts_sport FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wsport_user_date ON public.workouts_sport(user_id, date);

-- DAILY STATS
CREATE TABLE public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg NUMERIC(5,1),
  sleep_hours NUMERIC(3,1),
  sleep_quality INT CHECK (sleep_quality BETWEEN 1 AND 5),
  soreness INT CHECK (soreness BETWEEN 1 AND 5),
  stress INT CHECK (stress BETWEEN 1 AND 5),
  mood INT CHECK (mood BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_stats TO authenticated;
GRANT ALL ON public.daily_stats TO service_role;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stats" ON public.daily_stats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_stats_updated BEFORE UPDATE ON public.daily_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NUTRITION LOGS
CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal public.meal_type NOT NULL DEFAULT 'snack',
  name TEXT NOT NULL,
  kcal NUMERIC(7,1) NOT NULL DEFAULT 0,
  protein_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  source public.nutrition_source NOT NULL DEFAULT 'manual',
  scan_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_logs TO authenticated;
GRANT ALL ON public.nutrition_logs TO service_role;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nutrition" ON public.nutrition_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_nutrition_user_date ON public.nutrition_logs(user_id, date);

-- FOOD SCANS
CREATE TABLE public.food_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path TEXT,
  product_name TEXT,
  extracted JSONB,
  health_score NUMERIC(3,1),
  plan_fit_score NUMERIC(3,1),
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_scans TO authenticated;
GRANT ALL ON public.food_scans TO service_role;
ALTER TABLE public.food_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scans" ON public.food_scans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- JOURNAL
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  mood INT CHECK (mood BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal" ON public.journal_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_journal_updated BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WEEKLY PLANNER
CREATE TABLE public.weekly_planner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}'::JSONB,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_planner TO authenticated;
GRANT ALL ON public.weekly_planner TO service_role;
ALTER TABLE public.weekly_planner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own planner" ON public.weekly_planner FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_planner_updated BEFORE UPDATE ON public.weekly_planner FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
