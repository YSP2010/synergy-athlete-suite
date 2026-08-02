/**
 * Berechnung der Bestenlisten-Werte (Etappe 4).
 * Reine Funktionen ohne Datenbankzugriff – Persistenz liegt in leaderboard.server.ts.
 */

export type LeaderboardPeriod = "week" | "month" | "year" | "all_time";

export interface LbActivity {
  id: string;
  sport: string;
  started_at: string | null;
  duration_s: number | null;
  moving_duration_s: number | null;
  distance_m: number | null;
  elevation_gain_m: number | null;
  avg_hr: number | null;
  avg_speed_mps: number | null;
  avg_power_w: number | null;
  normalized_power_w: number | null;
  avg_vertical_ratio: number | null;
  verified: boolean;
}

export interface LbSleep {
  date: string;
  sleep_score: number | null;
}
export interface LbHrv {
  date: string;
  last_night_avg_ms: number | null;
}
export interface LbWellness {
  date: string;
  resting_hr: number | null;
}
export interface LbSegment {
  activity_id: string;
  segment_type: string;
  duration_s: number;
}
export interface LbMetric {
  date: string;
  chronic_load: number | null;
}

export interface LbInput {
  activities: LbActivity[];
  sleep: LbSleep[];
  hrv: LbHrv[];
  wellness: LbWellness[];
  segments: LbSegment[];
  metrics: LbMetric[];
  weightKg: number | null;
}

export interface EntryDraft {
  category_key: string;
  period: LeaderboardPeriod;
  period_start: string;
  value: number;
  supporting_activity_id: string | null;
  sample_count: number;
  verified: boolean;
  flagged: boolean;
}

const RUN = ["running", "trail_running", "treadmill_running"];
const BIKE = ["cycling", "biking", "road_biking", "mountain_biking", "indoor_cycling"];
const SWIM = ["swimming", "lap_swimming", "open_water_swimming"];

const DAY = 86_400_000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Beginn der Wertungsperiode (Woche startet montags). */
export function periodStart(period: LeaderboardPeriod, ref: Date): string {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  if (period === "all_time") return "1970-01-01";
  if (period === "year") return iso(new Date(Date.UTC(d.getUTCFullYear(), 0, 1)));
  if (period === "month") return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  const dow = (d.getUTCDay() + 6) % 7; // Montag = 0
  return iso(new Date(d.getTime() - dow * DAY));
}

/** Ende (exklusiv) einer Periode als Zeitstempel. */
function periodEnd(period: LeaderboardPeriod, startIso: string): number {
  if (period === "all_time") return Number.MAX_SAFE_INTEGER;
  const s = new Date(`${startIso}T00:00:00.000Z`);
  if (period === "week") return s.getTime() + 7 * DAY;
  if (period === "month")
    return Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1);
  return Date.UTC(s.getUTCFullYear() + 1, 0, 1);
}

/** Weltrekord-nahe Grenzen: alles darüber gilt als unplausibel und wird markiert. */
export const PLAUSIBILITY = {
  run5kMinS: 13 * 60,
  run10kMinS: 26 * 60,
  runHmMinS: 58 * 60,
  runWeeklyMaxKm: 400,
  bikeMaxWkg: 6.5,
  swim400MinS: 200,
  restingHrMinBpm: 25,
  sleepScoreMax: 100,
} as const;

interface Mark {
  key: string;
  meters: number;
  minS: number;
}
const RUN_MARKS: Mark[] = [
  { key: "run_5k_time", meters: 5000, minS: PLAUSIBILITY.run5kMinS },
  { key: "run_10k_time", meters: 10000, minS: PLAUSIBILITY.run10kMinS },
  { key: "run_hm_time", meters: 21097.5, minS: PLAUSIBILITY.runHmMinS },
];
const TOLERANCE = 0.06;

function dur(a: LbActivity): number {
  return a.moving_duration_s ?? a.duration_s ?? 0;
}

function inWindow(a: LbActivity, from: string, to: number): boolean {
  if (!a.started_at) return false;
  const t = Date.parse(a.started_at);
  return t >= Date.parse(`${from}T00:00:00.000Z`) && t < to;
}

function best(
  list: { value: number; activityId: string | null }[],
  lower: boolean,
): { value: number; activityId: string | null } | null {
  if (!list.length) return null;
  return list.reduce((acc, c) => (lower ? (c.value < acc.value ? c : acc) : c.value > acc.value ? c : acc));
}

/**
 * Erzeugt die Einträge für eine Periode. Es zählen ausschließlich verifizierte
 * Aktivitäten (FIT mit Geräte-Signatur), Gesundheitswerte nur mit Mindestumfang.
 */
export function computeEntries(input: LbInput, period: LeaderboardPeriod, now = new Date()): EntryDraft[] {
  const start = periodStart(period, now);
  const end = periodEnd(period, start);
  const startMs = Date.parse(`${start}T00:00:00.000Z`);
  const acts = input.activities.filter((a) => a.verified && inWindow(a, start, end));
  const out: EntryDraft[] = [];

  const push = (
    key: string,
    value: number,
    activityId: string | null,
    sample: number,
    flagged = false,
  ) => {
    if (!Number.isFinite(value)) return;
    out.push({
      category_key: key,
      period,
      period_start: start,
      value: Math.round(value * 1000) / 1000,
      supporting_activity_id: activityId,
      sample_count: sample,
      verified: true,
      flagged,
    });
  };

  const runs = acts.filter((a) => RUN.includes(a.sport));
  const bikes = acts.filter((a) => BIKE.includes(a.sport));
  const swims = acts.filter((a) => SWIM.includes(a.sport));
  const tris = acts.filter((a) => a.sport === "multisport");

  // --- Laufen: Distanzbestzeiten ---
  for (const mark of RUN_MARKS) {
    const cands = runs
      .filter(
        (a) =>
          a.distance_m != null &&
          a.distance_m >= mark.meters &&
          a.distance_m <= mark.meters * (1 + TOLERANCE) &&
          dur(a) > 0,
      )
      .map((a) => ({ value: (dur(a) * mark.meters) / (a.distance_m as number), activityId: a.id }));
    const b = best(cands, true);
    if (b) push(mark.key, b.value, b.activityId, 1, b.value < mark.minS);
  }

  // --- Laufen: Volumen und Höhenmeter ---
  const runKm = runs.reduce((s, a) => s + (a.distance_m ?? 0), 0) / 1000;
  if (runKm > 0) push("run_weekly_km", runKm, null, runs.length, runKm > PLAUSIBILITY.runWeeklyMaxKm);
  const runElev = runs.reduce((s, a) => s + (a.elevation_gain_m ?? 0), 0);
  if (runElev > 0) push("run_elevation", runElev, null, runs.length);

  // --- Laufen: Effizienz (ab 8 km, mit Puls) ---
  const efCands = runs
    .filter((a) => (a.distance_m ?? 0) >= 8000 && a.avg_hr && a.avg_speed_mps)
    .map((a) => ({ value: ((a.avg_speed_mps as number) * 60) / (a.avg_hr as number), activityId: a.id }));
  const ef = best(efCands, false);
  if (ef) push("run_efficiency", ef.value, ef.activityId, 1);

  const vrCands = runs
    .filter((a) => a.avg_vertical_ratio != null && (a.avg_vertical_ratio as number) > 0)
    .map((a) => ({ value: a.avg_vertical_ratio as number, activityId: a.id }));
  const vr = best(vrCands, true);
  if (vr) push("run_vertical_ratio", vr.value, vr.activityId, 1);

  // --- Rad ---
  if (input.weightKg && input.weightKg > 30) {
    const wkg = bikes
      .filter((a) => dur(a) >= 1200 && (a.normalized_power_w ?? a.avg_power_w))
      .map((a) => ({
        value: ((a.normalized_power_w ?? a.avg_power_w) as number) / (input.weightKg as number),
        activityId: a.id,
      }));
    const b = best(wkg, false);
    if (b) push("bike_20min_wkg", b.value, b.activityId, 1, b.value > PLAUSIBILITY.bikeMaxWkg);
  }
  const longRide = best(
    bikes.filter((a) => (a.distance_m ?? 0) > 0).map((a) => ({ value: (a.distance_m as number) / 1000, activityId: a.id })),
    false,
  );
  if (longRide) push("bike_longest_ride", longRide.value, longRide.activityId, 1);

  // --- Schwimmen ---
  const swim400 = best(
    swims
      .filter((a) => (a.distance_m ?? 0) >= 400 && dur(a) > 0)
      .map((a) => ({ value: (dur(a) * 400) / (a.distance_m as number), activityId: a.id })),
    true,
  );
  if (swim400)
    push("swim_400m_time", swim400.value, swim400.activityId, 1, swim400.value < PLAUSIBILITY.swim400MinS);

  // --- Triathlon ---
  const sprint = best(
    tris
      .filter((a) => (a.distance_m ?? 0) >= 24000 && (a.distance_m ?? 0) <= 30000 && dur(a) > 0)
      .map((a) => ({ value: dur(a), activityId: a.id })),
    true,
  );
  if (sprint) push("tri_sprint_time", sprint.value, sprint.activityId, 1);

  const olympic = best(
    tris
      .filter((a) => (a.distance_m ?? 0) >= 48000 && (a.distance_m ?? 0) <= 58000 && dur(a) > 0)
      .map((a) => ({ value: dur(a), activityId: a.id })),
    true,
  );
  if (olympic) push("tri_olympic_time", olympic.value, olympic.activityId, 1);

  const triIds = new Set(tris.map((a) => a.id));
  const transitionByActivity = new Map<string, number>();
  for (const s of input.segments) {
    if (!triIds.has(s.activity_id)) continue;
    if (s.segment_type !== "t1" && s.segment_type !== "t2") continue;
    transitionByActivity.set(s.activity_id, (transitionByActivity.get(s.activity_id) ?? 0) + s.duration_s);
  }
  const trans = best(
    [...transitionByActivity.entries()].map(([id, v]) => ({ value: v, activityId: id })),
    true,
  );
  if (trans && trans.value > 0) push("tri_transition", trans.value, trans.activityId, 1);

  // --- Konsistenz ---
  const days = new Set(
    acts.filter((a) => a.started_at).map((a) => (a.started_at as string).slice(0, 10)),
  );
  if (days.size) {
    push("consistency_streak", longestStreak([...days]), null, days.size);
  }
  const ctl = input.metrics
    .filter((m) => Date.parse(`${m.date}T00:00:00.000Z`) >= startMs && m.chronic_load != null)
    .map((m) => m.chronic_load as number);
  if (ctl.length) push("consistency_ctl", Math.max(...ctl), null, ctl.length);

  // --- Gesundheit (nur mit gesonderter Einwilligung sichtbar) ---
  const inRange = (date: string) => {
    const t = Date.parse(`${date}T00:00:00.000Z`);
    return t >= startMs && t < end;
  };
  const scores = input.sleep.filter((s) => s.sleep_score != null && inRange(s.date)).map((s) => s.sleep_score as number);
  if (scores.length) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    push("sleep_score_avg", avg, null, scores.length, avg > PLAUSIBILITY.sleepScoreMax);
  }
  const hrvVals = input.hrv
    .filter((h) => h.last_night_avg_ms != null && inRange(h.date))
    .map((h) => h.last_night_avg_ms as number);
  if (hrvVals.length >= 2) {
    const mean = hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length;
    const sd = Math.sqrt(hrvVals.reduce((a, b) => a + (b - mean) ** 2, 0) / hrvVals.length);
    push("hrv_consistency", sd, null, hrvVals.length);
  }
  const rhr = input.wellness
    .filter((w) => w.resting_hr != null && inRange(w.date))
    .map((w) => w.resting_hr as number);
  if (rhr.length) {
    const avg = rhr.reduce((a, b) => a + b, 0) / rhr.length;
    push("resting_hr", avg, null, rhr.length, avg < PLAUSIBILITY.restingHrMinBpm);
  }

  return out;
}

/** Längste Serie aufeinanderfolgender Tage aus einer Datumsliste. */
export function longestStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let cur = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const t = Date.parse(`${d}T00:00:00.000Z`);
    cur = prev !== null && t - prev === DAY ? cur + 1 : 1;
    prev = t;
    if (cur > best) best = cur;
  }
  return best;
}

/** Alle Perioden auf einmal berechnen. */
export function computeAllEntries(input: LbInput, now = new Date()): EntryDraft[] {
  const periods: LeaderboardPeriod[] = ["week", "month", "year", "all_time"];
  return periods.flatMap((p) => computeEntries(input, p, now));
}
