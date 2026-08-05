/**
 * Wellness aus Apple Health (export.xml in der ZIP).
 *
 * Die Datei kann sehr groß sein, deshalb wird sie NICHT als Ganzes in einen
 * String dekodiert, sondern in 1-MB-Fenstern gestreamt. Pro <Record …>-Tag
 * werden nur die Attribute gelesen und tageweise aggregiert – der
 * Speicherbedarf bleibt konstant. Hochfrequente Roh-Herzfrequenz wird bewusst
 * übersprungen (CPU/Speicher). Es werden nur belegte Felder geschrieben.
 */
import {
  emptyBundle,
  type WellnessBundle,
  type WellnessDailyRow,
  type SleepRow,
} from "./wellness";

type SumMap = Map<string, Record<string, number>>;
type AvgMap = Map<string, Record<string, { s: number; n: number }>>;
type SleepMap = Map<string, { deep: number; core: number; rem: number; awake: number }>;

export function parseAppleHealth(bytes: Uint8Array): WellnessBundle {
  try {
    return scan(bytes);
  } catch {
    return emptyBundle();
  }
}

function scan(bytes: Uint8Array): WellnessBundle {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const CHUNK = 1 << 20; // 1 MB
  const tagRe = /<Record\b[^>]*>/g;

  const sums: SumMap = new Map();
  const avgs: AvgMap = new Map();
  const sleep: SleepMap = new Map();

  let carry = "";
  for (let off = 0; off < bytes.length; off += CHUNK) {
    const streaming = off + CHUNK < bytes.length;
    const text = carry + decoder.decode(bytes.subarray(off, Math.min(off + CHUNK, bytes.length)), { stream: streaming });
    const lastGt = text.lastIndexOf(">");
    const scanText = lastGt === -1 ? "" : text.slice(0, lastGt + 1);
    carry = lastGt === -1 ? text : text.slice(lastGt + 1);
    tagRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(scanText))) handleRecord(m[0], sums, avgs, sleep);
  }
  tagRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(carry))) handleRecord(m[0], sums, avgs, sleep);

  return build(sums, avgs, sleep);
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let a: RegExpExecArray | null;
  while ((a = re.exec(tag))) out[a[1]] = a[2];
  return out;
}

/** "2026-01-15 07:23:45 +0100" → ms. */
function appleMs(s: string | undefined): number {
  if (!s) return NaN;
  return Date.parse(s.replace(" ", "T").replace(/ (?=[+-]\d{4})/, ""));
}

function day(s: string | undefined): string | null {
  if (!s || s.length < 10) return null;
  return s.slice(0, 10);
}

function addSum(map: SumMap, d: string, key: string, v: number) {
  const row = map.get(d) ?? {};
  row[key] = (row[key] ?? 0) + v;
  map.set(d, row);
}

function addAvg(map: AvgMap, d: string, key: string, v: number) {
  const row = map.get(d) ?? {};
  const cur = row[key] ?? { s: 0, n: 0 };
  cur.s += v;
  cur.n += 1;
  row[key] = cur;
  map.set(d, row);
}

function handleRecord(tag: string, sums: SumMap, avgs: AvgMap, sleep: SleepMap) {
  const a = attrs(tag);
  const type = a.type;
  if (!type) return;
  const d = day(a.startDate ?? a.creationDate);
  const value = Number(a.value);
  const unit = (a.unit ?? "").toLowerCase();

  switch (type) {
    case "HKQuantityTypeIdentifierStepCount":
      if (d && Number.isFinite(value)) addSum(sums, d, "steps", value);
      return;
    case "HKQuantityTypeIdentifierDistanceWalkingRunning":
      if (d && Number.isFinite(value)) {
        const meters = unit.startsWith("km") ? value * 1000 : unit.startsWith("mi") ? value * 1609.34 : value;
        addSum(sums, d, "distance_m", meters);
      }
      return;
    case "HKQuantityTypeIdentifierFlightsClimbed":
      if (d && Number.isFinite(value)) addSum(sums, d, "floors_climbed", value);
      return;
    case "HKQuantityTypeIdentifierActiveEnergyBurned":
      if (d && Number.isFinite(value)) addSum(sums, d, "active_kcal", value);
      return;
    case "HKQuantityTypeIdentifierBasalEnergyBurned":
      if (d && Number.isFinite(value)) addSum(sums, d, "bmr_kcal", value);
      return;
    case "HKQuantityTypeIdentifierRestingHeartRate":
      if (d && Number.isFinite(value)) addAvg(avgs, d, "resting_hr", value);
      return;
    case "HKQuantityTypeIdentifierRespiratoryRate":
      if (d && Number.isFinite(value)) addAvg(avgs, d, "avg_respiration", value);
      return;
    case "HKQuantityTypeIdentifierOxygenSaturation":
      if (d && Number.isFinite(value)) addAvg(avgs, d, "avg_spo2", value <= 1 ? value * 100 : value);
      return;
    case "HKQuantityTypeIdentifierHeartRateVariabilitySDNN":
      if (d && Number.isFinite(value)) addAvg(avgs, d, "hrv_ms", value);
      return;
    case "HKCategoryTypeIdentifierSleepAnalysis": {
      const dd = day(a.endDate) ?? d;
      const durS = (appleMs(a.endDate) - appleMs(a.startDate)) / 1000;
      if (!dd || !Number.isFinite(durS) || durS <= 0) return;
      const s = sleep.get(dd) ?? { deep: 0, core: 0, rem: 0, awake: 0 };
      const v = (a.value ?? "").toLowerCase();
      if (v.includes("deep")) s.deep += durS;
      else if (v.includes("rem")) s.rem += durS;
      else if (v.includes("awake")) s.awake += durS;
      else if (v.includes("asleep") || v.includes("core") || v.includes("unspecified")) s.core += durS;
      sleep.set(dd, s);
      return;
    }
    default:
      return;
  }
}

function build(sums: SumMap, avgs: AvgMap, sleep: SleepMap): WellnessBundle {
  const out = emptyBundle();
  const days = new Set<string>([...sums.keys(), ...avgs.keys()]);

  for (const date of days) {
    const s = sums.get(date) ?? {};
    const a = avgs.get(date) ?? {};
    const avg = (k: string) => (a[k] ? a[k].s / a[k].n : null);
    const row: WellnessDailyRow = { date };
    if (s.steps != null) row.steps = Math.round(s.steps);
    if (s.distance_m != null) row.distance_m = Math.round(s.distance_m);
    if (s.floors_climbed != null) row.floors_climbed = Math.round(s.floors_climbed);
    if (s.active_kcal != null) row.active_kcal = Math.round(s.active_kcal);
    if (s.bmr_kcal != null) row.bmr_kcal = Math.round(s.bmr_kcal);
    const rhr = avg("resting_hr");
    if (rhr != null) row.resting_hr = Math.round(rhr);
    const resp = avg("avg_respiration");
    if (resp != null) row.avg_respiration = Number(resp.toFixed(1));
    const spo2 = avg("avg_spo2");
    if (spo2 != null) row.avg_spo2 = Number(spo2.toFixed(1));
    if (Object.keys(row).length > 1) out.wellness.push(row);

    const hrv = avg("hrv_ms");
    if (hrv != null) out.hrv.push({ date, last_night_avg_ms: Math.round(hrv) });
  }

  for (const [date, s] of sleep) {
    const row: SleepRow = { date };
    if (s.deep) row.deep_s = Math.round(s.deep);
    if (s.core) row.light_s = Math.round(s.core);
    if (s.rem) row.rem_s = Math.round(s.rem);
    if (s.awake) row.awake_s = Math.round(s.awake);
    const total = s.deep + s.core + s.rem;
    if (total) row.duration_s = Math.round(total);
    if (Object.keys(row).length > 1) out.sleep.push(row);
  }

  return out;
}
