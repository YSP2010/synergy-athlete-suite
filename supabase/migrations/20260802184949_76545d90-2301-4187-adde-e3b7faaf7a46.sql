-- ============ 1) Profile: Bestenlisten-Einwilligung ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS leaderboard_display_name TEXT,
  ADD COLUMN IF NOT EXISTS leaderboard_share_health BOOLEAN NOT NULL DEFAULT false;

-- ============ 2) Enums ============
DO $$ BEGIN
  CREATE TYPE public.leaderboard_scope AS ENUM ('global','team','friends');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leaderboard_period AS ENUM ('week','month','year','all_time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ 3) Kategorien ============
CREATE TABLE IF NOT EXISTS public.leaderboard_categories (
  key TEXT PRIMARY KEY,
  label_de TEXT NOT NULL,
  description_de TEXT NOT NULL,
  sport TEXT,
  unit TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('asc','desc')),
  requires_health_consent BOOLEAN NOT NULL DEFAULT false,
  min_sample_size INT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leaderboard_categories TO authenticated;
GRANT ALL ON public.leaderboard_categories TO service_role;
ALTER TABLE public.leaderboard_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories readable" ON public.leaderboard_categories;
CREATE POLICY "categories readable" ON public.leaderboard_categories
  FOR SELECT TO authenticated USING (active);
DROP TRIGGER IF EXISTS trg_lb_categories_updated ON public.leaderboard_categories;
CREATE TRIGGER trg_lb_categories_updated BEFORE UPDATE ON public.leaderboard_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.leaderboard_categories
  (key, label_de, description_de, sport, unit, direction, requires_health_consent, min_sample_size, sort_order)
VALUES
  ('run_5k_time','Schnellste 5 km','Beste 5-km-Zeit aus verifizierten Laufeinheiten.','running','s','asc',false,1,10),
  ('run_10k_time','Schnellste 10 km','Beste 10-km-Zeit aus verifizierten Laufeinheiten.','running','s','asc',false,1,20),
  ('run_hm_time','Schnellster Halbmarathon','Beste Halbmarathon-Zeit aus verifizierten Laufeinheiten.','running','s','asc',false,1,30),
  ('run_weekly_km','Höchste Wochenkilometer','Meiste Laufkilometer innerhalb des Zeitraums.','running','km','desc',false,1,40),
  ('run_elevation','Meiste Höhenmeter','Summe der Höhenmeter beim Laufen im Zeitraum.','running','m','desc',false,1,50),
  ('run_efficiency','Bester Efficiency Factor','Tempo pro Herzschlag über mindestens 8 km.','running','ef','desc',false,1,60),
  ('run_decoupling','Geringstes Decoupling','Kleinster Puls-Tempo-Drift über lange Läufe.','running','%','asc',false,1,70),
  ('run_vertical_ratio','Bestes Vertical Ratio','Niedrigstes Verhältnis von Vertikalbewegung zur Schrittlänge.','running','%','asc',false,1,80),
  ('bike_20min_wkg','Höchste 20-Minuten-Leistung','Beste 20-Minuten-Leistung pro Kilogramm Körpergewicht.','cycling','W/kg','desc',false,1,90),
  ('bike_longest_ride','Längste Ausfahrt','Größte Distanz einer einzelnen Radeinheit.','cycling','km','desc',false,1,100),
  ('swim_400m_time','Schnellste 400 m','Beste 400-m-Zeit im Wasser.','swimming','s','asc',false,1,110),
  ('swim_swolf','Bester SWOLF','Niedrigster SWOLF-Wert (Zeit plus Züge je Bahn).','swimming','swolf','asc',false,1,120),
  ('tri_sprint_time','Schnellste Sprintdistanz','Beste Gesamtzeit über die Sprintdistanz.','multisport','s','asc',false,1,130),
  ('tri_olympic_time','Schnellste Olympische Distanz','Beste Gesamtzeit über die Olympische Distanz.','multisport','s','asc',false,1,140),
  ('tri_transition','Schnellste Wechselzeit','Kürzeste Summe aus Wechsel 1 und Wechsel 2.','multisport','s','asc',false,1,150),
  ('consistency_streak','Längste Serie','Meiste Tage in Folge mit mindestens einer Aktivität.','','Tage','desc',false,1,160),
  ('consistency_ctl','Höchste Fitness (CTL)','Höchster Fitnesswert aus der Belastungsrechnung.','','ctl','desc',false,1,170),
  ('sleep_score_avg','Bester Schlaf-Score','Durchschnittlicher Schlaf-Score über mindestens 20 Nächte.','','score','desc',true,20,180),
  ('hrv_consistency','Beste HRV-Konstanz','Geringste Schwankung der nächtlichen Herzratenvariabilität.','','ms','asc',true,14,190),
  ('resting_hr','Niedrigster Ruhepuls','Durchschnittlicher Ruhepuls im Zeitraum.','','bpm','asc',true,14,200)
ON CONFLICT (key) DO UPDATE SET
  label_de = EXCLUDED.label_de,
  description_de = EXCLUDED.description_de,
  unit = EXCLUDED.unit,
  direction = EXCLUDED.direction,
  requires_health_consent = EXCLUDED.requires_health_consent,
  min_sample_size = EXCLUDED.min_sample_size,
  sort_order = EXCLUDED.sort_order;

-- ============ 4) Einträge ============
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL REFERENCES public.leaderboard_categories(key) ON DELETE CASCADE,
  period public.leaderboard_period NOT NULL,
  period_start DATE NOT NULL,
  value NUMERIC(12,3) NOT NULL,
  supporting_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  sample_count INT NOT NULL DEFAULT 1,
  verified BOOLEAN NOT NULL DEFAULT false,
  flagged BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_key, period, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leaderboard_entries TO authenticated;
GRANT ALL ON public.leaderboard_entries TO service_role;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own leaderboard entries" ON public.leaderboard_entries;
CREATE POLICY "own leaderboard entries" ON public.leaderboard_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_lb_entries_lookup
  ON public.leaderboard_entries (category_key, period, period_start, value);
DROP TRIGGER IF EXISTS trg_lb_entries_updated ON public.leaderboard_entries;
CREATE TRIGGER trg_lb_entries_updated BEFORE UPDATE ON public.leaderboard_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Opt-out löscht sofort alle Einträge
CREATE OR REPLACE FUNCTION public.lb_cleanup_on_optout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.leaderboard_opt_in = false AND OLD.leaderboard_opt_in = true THEN
    DELETE FROM public.leaderboard_entries WHERE user_id = NEW.id;
  ELSIF NEW.leaderboard_share_health = false AND OLD.leaderboard_share_health = true THEN
    DELETE FROM public.leaderboard_entries e
    USING public.leaderboard_categories c
    WHERE e.category_key = c.key AND c.requires_health_consent AND e.user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_lb_cleanup_on_optout ON public.profiles;
CREATE TRIGGER trg_lb_cleanup_on_optout AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lb_cleanup_on_optout();

-- Rangliste (nur Teilnehmer mit Einwilligung)
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  _category_key TEXT,
  _period public.leaderboard_period,
  _period_start DATE,
  _scope public.leaderboard_scope DEFAULT 'global',
  _team_id UUID DEFAULT NULL,
  _limit INT DEFAULT 50
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  value NUMERIC,
  sample_count INT,
  verified BOOLEAN,
  activity_id UUID,
  is_me BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  cat public.leaderboard_categories%ROWTYPE;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO cat FROM public.leaderboard_categories c
  WHERE c.key = _category_key AND c.active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown category'; END IF;

  IF _scope = 'team' AND _team_id IS NOT NULL THEN
    IF NOT (public.is_team_member(_team_id, me) OR public.is_coach_of_team(_team_id)) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT
      e.user_id,
      COALESCE(NULLIF(p.leaderboard_display_name, ''), p.name, 'Athlet') AS display_name,
      e.value,
      e.sample_count,
      e.verified,
      e.supporting_activity_id
    FROM public.leaderboard_entries e
    JOIN public.profiles p ON p.id = e.user_id
    WHERE e.category_key = _category_key
      AND e.period = _period
      AND e.period_start = _period_start
      AND e.flagged = false
      AND e.sample_count >= cat.min_sample_size
      AND p.leaderboard_opt_in = true
      AND (cat.requires_health_consent = false OR p.leaderboard_share_health = true)
      AND (
        _scope <> 'team'
        OR _team_id IS NULL
        OR public.is_team_member(_team_id, e.user_id)
        OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.coach_id = e.user_id)
      )
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY CASE WHEN cat.direction = 'asc' THEN el.value END ASC,
               CASE WHEN cat.direction = 'desc' THEN el.value END DESC
    ) AS rank,
    el.user_id,
    el.display_name,
    el.value,
    el.sample_count,
    el.verified,
    el.supporting_activity_id,
    (el.user_id = me) AS is_me
  FROM eligible el
  ORDER BY rank
  LIMIT GREATEST(1, LEAST(_limit, 200));
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, public.leaderboard_period, DATE, public.leaderboard_scope, UUID, INT) TO authenticated, service_role;

-- ============ 5) Triathlon: Segmente ============
CREATE TABLE IF NOT EXISTS public.multisport_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_index INT NOT NULL,
  segment_type TEXT NOT NULL CHECK (segment_type IN ('swim','t1','bike','t2','run','other')),
  sport TEXT,
  started_at TIMESTAMPTZ,
  duration_s NUMERIC NOT NULL,
  distance_m NUMERIC(10,1),
  avg_hr INT,
  avg_speed_mps NUMERIC(6,3),
  avg_power_w INT,
  avg_cadence NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, segment_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.multisport_segments TO authenticated;
GRANT ALL ON public.multisport_segments TO service_role;
ALTER TABLE public.multisport_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own segments" ON public.multisport_segments;
CREATE POLICY "own segments" ON public.multisport_segments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ 6) Schwimm-Kennzahlen ============
CREATE TABLE IF NOT EXISTS public.swim_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.multisport_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_length_m NUMERIC(5,1),
  stroke_type TEXT,
  total_strokes INT,
  avg_strokes_per_length NUMERIC(5,2),
  avg_swolf NUMERIC(5,1),
  best_swolf NUMERIC(5,1),
  css_pace_s_per_100m NUMERIC(6,2),
  avg_pace_s_per_100m NUMERIC(6,2),
  open_water BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_swim_metrics_activity
  ON public.swim_metrics (activity_id, COALESCE(segment_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swim_metrics TO authenticated;
GRANT ALL ON public.swim_metrics TO service_role;
ALTER TABLE public.swim_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own swim metrics" ON public.swim_metrics;
CREATE POLICY "own swim metrics" ON public.swim_metrics
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ 7) Rennen ============
CREATE TABLE IF NOT EXISTS public.races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  race_type TEXT NOT NULL,
  race_date DATE NOT NULL,
  location TEXT,
  swim_distance_m NUMERIC(10,1),
  bike_distance_m NUMERIC(10,1),
  run_distance_m NUMERIC(10,1),
  goal_time_s INT,
  goal_swim_s INT,
  goal_bike_s INT,
  goal_run_s INT,
  goal_t1_s INT,
  goal_t2_s INT,
  priority TEXT NOT NULL DEFAULT 'B' CHECK (priority IN ('A','B','C')),
  result_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','done','cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.races TO authenticated;
GRANT ALL ON public.races TO service_role;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own races" ON public.races;
CREATE POLICY "own races" ON public.races
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "coach reads races" ON public.races;
CREATE POLICY "coach reads races" ON public.races
  FOR SELECT TO authenticated USING (public.coach_can_view_athlete(user_id));
DROP TRIGGER IF EXISTS trg_races_updated ON public.races;
CREATE TRIGGER trg_races_updated BEFORE UPDATE ON public.races
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 8) Ausrüstung ============
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  purchased_on DATE,
  total_distance_m NUMERIC(12,1) NOT NULL DEFAULT 0,
  retire_at_distance_m NUMERIC(12,1),
  retired BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own equipment" ON public.equipment;
CREATE POLICY "own equipment" ON public.equipment
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_equipment_updated ON public.equipment;
CREATE TRIGGER trg_equipment_updated BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL;

-- ============ 9) Einwilligungen ============
CREATE TABLE IF NOT EXISTS public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own consents read" ON public.consents;
CREATE POLICY "own consents read" ON public.consents
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own consents insert" ON public.consents;
CREATE POLICY "own consents insert" ON public.consents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_consents_user ON public.consents (user_id, kind, changed_at DESC);

-- ============ 10) Indizes ============
CREATE INDEX IF NOT EXISTS idx_segments_activity ON public.multisport_segments (activity_id, segment_index);
CREATE INDEX IF NOT EXISTS idx_races_user_date ON public.races (user_id, race_date);
CREATE INDEX IF NOT EXISTS idx_activities_user_started ON public.activities (user_id, started_at DESC);