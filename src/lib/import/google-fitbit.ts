/**
 * Wellness aus Google Takeout (Fitbit) bzw. Health-Connect-JSON.
 *
 * Fitbit exportiert je Metrik und Tag eine eigene JSON-Datei
 * (z. B. steps-2026-01-01.json, sleep-2026-01-01.json). Der Metrik-Typ steckt
 * im Dateinamen; die Datumszuordnung entsteht aus den Zeitstempeln.
 * Es werden nur belegte Felder geschrieben, unbekannte Strukturen ergeben ein
 * leeres Bundle.
 */
import {
  emptyBundle,
  type WellnessBundle,
  type WellnessDailyRow,
  type SleepRow,
} from "./wellness";

export function parseGoogleFitbit(text: string, filename: string): WellnessBundle {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return emptyBundle();
  }
  const name = filename.toLowerCase();
  const arr = Array.isArray(json) ? (json as Record<string, unknown>[]) : null;

  if (name.includes("sleep")) return sleepBundle(arr ?? [json as Record<string, unknown>]);
  if (name.includes("steps")) return sumDaily(arr, "steps");
  if (name.includes("distance")) return sumDaily(arr, "distance_m");
  if (name.includes("floors")) return sumDaily(arr, "floors_climbed");
  if (name.includes("calories")) return sumDaily(arr, "active_kcal");
  if (name.includes("resting_heart_rate")) return restingHr(arr);

  return emptyBundle();
}

/** "MM/DD/YY hh:mm:ss", "YYYY-MM-DD…" oder Epoch → YYYY-MM-DD. */
function isoDay(raw: unknown): string | null {
  if (typeof raw === "number" && raw > 1_000_000_000) {
    return new Date(raw > 1e12 ? raw : raw * 1000).toISOString().slice(0, 10);
  }
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})\/(\d{2})\/(\d{2})/.exec(s); // MM/DD/YY
  if (m) return `20${m[3]}-${m[1]}-${m[2]}`;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

function numOf(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  if (v && typeof v === "object") return numOf((v as Record<string, unknown>).value);
  return null;
}

function sumDaily(rows: Record<string, unknown>[] | null, field: keyof WellnessDailyRow): WellnessBundle {
  const out = emptyBundle();
  if (!rows) return out;
  const perDay = new Map<string, number>();
  for (const r of rows) {
    const day = isoDay(r.dateTime ?? r.date ?? r.timestamp);
    const val = numOf(r.value ?? r.count ?? r.amount);
    if (!day || val == null) continue;
    perDay.set(day, (perDay.get(day) ?? 0) + val);
  }
  for (const [date, sum] of perDay) {
    const row: WellnessDailyRow = { date };
    (row as Record<string, unknown>)[field as string] = Math.round(sum);
    out.wellness.push(row);
  }
  return out;
}

function restingHr(rows: Record<string, unknown>[] | null): WellnessBundle {
  const out = emptyBundle();
  if (!rows) return out;
  for (const r of rows) {
    const day = isoDay(r.dateTime ?? r.date);
    const val = numOf(r.value);
    if (!day || val == null) continue;
    out.wellness.push({ date: day, resting_hr: Math.round(val) });
  }
  return out;
}

function sleepBundle(rows: Record<string, unknown>[]): WellnessBundle {
  const out = emptyBundle();
  for (const r of rows) {
    const day = isoDay(r.dateOfSleep ?? r.date ?? r.startTime);
    if (!day) continue;
    const levels = ((r.levels as Record<string, unknown>)?.summary ?? {}) as Record<string, { minutes?: number }>;
    const min = (k: string) => (typeof levels[k]?.minutes === "number" ? levels[k]!.minutes! * 60 : null);
    const row: SleepRow = { date: day };
    if (typeof r.startTime === "string") row.sleep_start = r.startTime;
    if (typeof r.endTime === "string") row.sleep_end = r.endTime;
    const asleep = numOf(r.minutesAsleep);
    const durMs = numOf(r.duration);
    if (asleep != null) row.duration_s = Math.round(asleep * 60);
    else if (durMs != null) row.duration_s = Math.round(durMs / 1000);
    const deep = min("deep");
    if (deep != null) row.deep_s = deep;
    const light = min("light");
    if (light != null) row.light_s = light;
    const rem = min("rem");
    if (rem != null) row.rem_s = rem;
    const wake = min("wake");
    if (wake != null) row.awake_s = wake;
    const eff = numOf(r.efficiency);
    if (eff != null) row.sleep_score = eff;
    if (Object.keys(row).length > 1) out.sleep.push(row);
  }
  return out;
}
