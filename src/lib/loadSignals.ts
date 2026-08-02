/**
 * Holt Geräte- und Belastungssignale (Garmin-Import) für Recovery und Planung.
 * Fehlen Daten, sind alle Felder null – die manuelle Logik greift dann weiter.
 */
import { supabase } from "@/integrations/supabase/client";
import type { DeviceRecovery, LoadSignals } from "@/lib/planner";
import { buildLoadSeries, type AnalyticsActivity, type Thresholds } from "@/lib/analytics/aggregate";

export interface RecoveryContext {
  device: DeviceRecovery | null;
  signals: LoadSignals | null;
}

const EMPTY: RecoveryContext = { device: null, signals: null };

/** Lädt Schlaf, HRV, Body Battery und die aktuelle Belastungslage eines Nutzers. */
export async function fetchRecoveryContext(uid: string): Promise<RecoveryContext> {
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);

  const [sleep, hrv, wellness, metrics, acts] = await Promise.all([
    supabase
      .from("sleep_logs")
      .select("date, duration_s, sleep_score")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("hrv_logs")
      .select("date, status")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("wellness_daily")
      .select("date, body_battery_max, resting_hr")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("user_metrics")
      .select("date, training_readiness, lactate_threshold_hr, lactate_threshold_speed_mps, ftp_w")
      .eq("user_id", uid)
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("activities")
      .select(
        "id, sport, started_at, duration_s, moving_duration_s, distance_m, avg_hr, avg_speed_mps, normalized_power_w, avg_power_w",
      )
      .eq("user_id", uid)
      .eq("route_only", false)
      .gte("started_at", since)
      .order("started_at", { ascending: true })
      .limit(500),
  ]);

  const s = sleep.data?.[0] ?? null;
  const h = hrv.data?.[0] ?? null;
  const w = wellness.data?.[0] ?? null;
  const m = metrics.data?.[0] ?? null;

  const device: DeviceRecovery | null =
    s || h || w || m
      ? {
          sleepScore: s?.sleep_score ?? null,
          sleepHours: s?.duration_s ? Math.round((s.duration_s / 3600) * 10) / 10 : null,
          hrvStatus: h?.status ?? null,
          bodyBattery: w?.body_battery_max ?? null,
          trainingReadiness: m?.training_readiness ?? null,
        }
      : null;

  const rows = (acts.data ?? []) as unknown as AnalyticsActivity[];
  if (!rows.length) return { device, signals: null };

  const thresholds: Thresholds = {
    maxHr: m?.lactate_threshold_hr ? Math.round(m.lactate_threshold_hr / 0.9) : null,
    restHr: w?.resting_hr ?? null,
    lthr: m?.lactate_threshold_hr ?? null,
    thresholdSpeedMps: m?.lactate_threshold_speed_mps ?? null,
    ftpW: m?.ftp_w ?? null,
    cssMps: null,
    sex: null,
  };
  const series = buildLoadSeries(rows, thresholds);
  const last = series[series.length - 1] ?? null;
  return {
    device,
    signals: last ? { tsb: last.tsb, acwr: last.acwr } : null,
  };
}

export const EMPTY_RECOVERY_CONTEXT = EMPTY;
