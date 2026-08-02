/**
 * Verdichtet Aktivitäten und Gerätedaten zu Tages- und Zeitreihen für /analytics.
 * Reine Funktionen – die Datenbeschaffung passiert in der Route.
 */
import { loadSeries, trimp, bikeTss, runTss, swimTss, type DailyLoad, type LoadPoint, type Sex } from "./load";

export interface AnalyticsActivity {
  id: string;
  sport: string;
  started_at: string | null;
  duration_s: number | null;
  moving_duration_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  avg_speed_mps: number | null;
  normalized_power_w: number | null;
  avg_power_w: number | null;
}

export interface Thresholds {
  maxHr: number | null;
  restHr: number | null;
  lthr: number | null;
  thresholdSpeedMps: number | null;
  ftpW: number | null;
  cssMps: number | null;
  sex: Sex;
}

const RUN = ["running", "trail_running", "treadmill_running"];
const BIKE = ["cycling", "biking", "road_biking", "mountain_biking", "indoor_cycling"];
const SWIM = ["swimming", "lap_swimming", "open_water_swimming"];

/** Ordnet eine Sportart einer Belastungsfamilie zu. */
export function sportFamily(sport: string): "run" | "bike" | "swim" | "other" {
  if (RUN.includes(sport)) return "run";
  if (BIKE.includes(sport)) return "bike";
  if (SWIM.includes(sport)) return "swim";
  return "other";
}

/** Belastung einer einzelnen Aktivität (TSS-Skala). Fällt auf TRIMP zurück. */
export function activityLoad(a: AnalyticsActivity, t: Thresholds): number {
  const dur = a.moving_duration_s ?? a.duration_s ?? 0;
  if (dur <= 0) return 0;
  const family = sportFamily(a.sport);
  const power = a.normalized_power_w ?? a.avg_power_w;

  if (family === "bike" && power && t.ftpW) return bikeTss(dur, power, t.ftpW);
  if (family === "run" && a.avg_speed_mps && t.thresholdSpeedMps) {
    return runTss(dur, a.avg_speed_mps, t.thresholdSpeedMps);
  }
  if (family === "swim" && a.avg_speed_mps && t.cssMps) return swimTss(dur, a.avg_speed_mps, t.cssMps);

  if (a.avg_hr && t.maxHr) {
    return trimp(dur / 60, a.avg_hr, t.restHr ?? 55, t.maxHr, t.sex);
  }
  // Letzter Ausweg: 50 TSS pro Stunde als neutrale Schätzung.
  return Math.round((dur / 3600) * 50 * 10) / 10;
}

/** Tagesbelastung aus allen Aktivitäten. */
export function dailyLoads(activities: AnalyticsActivity[], t: Thresholds): DailyLoad[] {
  const map = new Map<string, number>();
  for (const a of activities) {
    if (!a.started_at) continue;
    const date = a.started_at.slice(0, 10);
    map.set(date, (map.get(date) ?? 0) + activityLoad(a, t));
  }
  return [...map.entries()]
    .map(([date, tss]) => ({ date, tss: Math.round(tss * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Vollständige Belastungs-Zeitreihe (CTL/ATL/TSB/ACWR). */
export function buildLoadSeries(activities: AnalyticsActivity[], t: Thresholds): LoadPoint[] {
  return loadSeries(dailyLoads(activities, t));
}

export interface WeeklyVolume {
  week: string;
  run: number;
  bike: number;
  swim: number;
  other: number;
}

/** Wochenvolumen je Sportfamilie in Minuten (Woche startet montags). */
export function weeklyVolume(activities: AnalyticsActivity[]): WeeklyVolume[] {
  const map = new Map<string, WeeklyVolume>();
  for (const a of activities) {
    if (!a.started_at) continue;
    const week = mondayOf(a.started_at);
    const row = map.get(week) ?? { week, run: 0, bike: 0, swim: 0, other: 0 };
    const min = Math.round(((a.moving_duration_s ?? a.duration_s ?? 0) / 60) * 10) / 10;
    row[sportFamily(a.sport)] += min;
    map.set(week, row);
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

/** ISO-Datum des Montags der Woche eines Zeitstempels. */
export function mondayOf(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Schneidet eine datierte Reihe auf die letzten n Tage zu (null = alles). */
export function withinDays<T extends { date: string }>(rows: T[], days: number | null): T[] {
  if (!days) return rows;
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return rows.filter((r) => r.date >= cutoff);
}
