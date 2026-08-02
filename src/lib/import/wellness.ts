/**
 * Wellness-Daten aus dem Garmin-Konto-Export (JSON-Dateien).
 *
 * Garmin ändert Datei- und Feldnamen zwischen Exporten, deshalb arbeitet der
 * Parser rein inhaltsbasiert: Er sucht in beliebig verschachtelten Strukturen
 * nach Datensätzen mit einem Kalenderdatum und übernimmt nur Felder, die er
 * kennt. Fehlende Werte bleiben null statt 0.
 */

export interface WellnessDailyRow {
  date: string;
  steps?: number | null;
  distance_m?: number | null;
  floors_climbed?: number | null;
  resting_hr?: number | null;
  min_hr?: number | null;
  max_hr?: number | null;
  avg_stress?: number | null;
  max_stress?: number | null;
  body_battery_start?: number | null;
  body_battery_end?: number | null;
  body_battery_min?: number | null;
  body_battery_max?: number | null;
  active_kcal?: number | null;
  bmr_kcal?: number | null;
  intensity_minutes_moderate?: number | null;
  intensity_minutes_vigorous?: number | null;
  avg_spo2?: number | null;
  avg_respiration?: number | null;
  skin_temp_deviation_c?: number | null;
}

export interface SleepRow {
  date: string;
  sleep_start?: string | null;
  sleep_end?: string | null;
  duration_s?: number | null;
  deep_s?: number | null;
  light_s?: number | null;
  rem_s?: number | null;
  awake_s?: number | null;
  sleep_score?: number | null;
  avg_sleep_hr?: number | null;
  avg_sleep_hrv_ms?: number | null;
  avg_spo2?: number | null;
  avg_respiration?: number | null;
  restlessness?: number | null;
  nap?: boolean;
}

export interface HrvRow {
  date: string;
  last_night_avg_ms?: number | null;
  last_night_5min_high_ms?: number | null;
  weekly_avg_ms?: number | null;
  baseline_low_ms?: number | null;
  baseline_high_ms?: number | null;
  status?: string | null;
}

export interface UserMetricRow {
  date: string;
  vo2max_running?: number | null;
  vo2max_cycling?: number | null;
  fitness_age?: number | null;
  lactate_threshold_hr?: number | null;
  lactate_threshold_speed_mps?: number | null;
  ftp_w?: number | null;
  training_readiness?: number | null;
  training_status?: string | null;
  acute_load?: number | null;
  chronic_load?: number | null;
  load_ratio?: number | null;
}

export interface WellnessBundle {
  wellness: WellnessDailyRow[];
  sleep: SleepRow[];
  hrv: HrvRow[];
  metrics: UserMetricRow[];
}

export function emptyBundle(): WellnessBundle {
  return { wellness: [], sleep: [], hrv: [], metrics: [] };
}

export function bundleSize(b: WellnessBundle): number {
  return b.wellness.length + b.sleep.length + b.hrv.length + b.metrics.length;
}

type Rec = Record<string, unknown>;

/** Parst eine JSON-Datei aus dem Garmin-Export in normalisierte Zeilen. */
export function parseWellnessJson(text: string): WellnessBundle {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return emptyBundle();
  }
  const out = emptyBundle();
  for (const rec of collectRecords(json)) {
    const date = pickDate(rec);
    if (!date) continue;
    const w = mapWellness(rec, date);
    if (w) out.wellness.push(w);
    const s = mapSleep(rec, date);
    if (s) out.sleep.push(s);
    const h = mapHrv(rec, date);
    if (h) out.hrv.push(h);
    const m = mapMetrics(rec, date);
    if (m) out.metrics.push(m);
  }
  return out;
}

/** Führt mehrere Bundles zusammen, spätere Werte gewinnen je Datum. */
export function mergeBundles(bundles: WellnessBundle[]): WellnessBundle {
  const out = emptyBundle();
  const merge = <T extends { date: string }>(target: T[], rows: T[]) => {
    for (const row of rows) {
      const idx = target.findIndex((t) => t.date === row.date);
      if (idx === -1) target.push(row);
      else target[idx] = { ...target[idx]!, ...stripNull(row) };
    }
  };
  for (const b of bundles) {
    merge(out.wellness, b.wellness);
    merge(out.sleep, b.sleep);
    merge(out.hrv, b.hrv);
    merge(out.metrics, b.metrics);
  }
  return out;
}

function stripNull<T extends object>(row: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (v !== null && v !== undefined) out[k] = v;
  return out as Partial<T>;
}

/** Sammelt alle Objekte, die wie Tagesdatensätze aussehen (max. Tiefe 4). */
function collectRecords(node: unknown, depth = 0): Rec[] {
  if (depth > 4 || node === null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((n) => collectRecords(n, depth + 1));
  const rec = node as Rec;
  const out: Rec[] = [];
  if (pickDate(rec)) out.push(rec);
  for (const value of Object.values(rec)) {
    if (value && typeof value === "object") out.push(...collectRecords(value, depth + 1));
  }
  return out;
}

const DATE_KEYS = [
  "calendarDate",
  "calendar_date",
  "date",
  "summaryDate",
  "wellnessDate",
  "statisticsStartDate",
  "startDate",
  "sleepStartTimestampLocal",
  "startTimestampLocal",
];

function pickDate(rec: Rec): string | null {
  for (const key of DATE_KEYS) {
    const raw = rec[key];
    const iso = toIsoDate(raw);
    if (iso) return iso;
  }
  return null;
}

function toIsoDate(raw: unknown): string | null {
  if (typeof raw === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
  }
  if (raw && typeof raw === "object") {
    const inner = (raw as Rec)["date"] ?? (raw as Rec)["value"];
    if (typeof inner === "string") return toIsoDate(inner);
  }
  return null;
}

function num(rec: Rec, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function str(rec: Rec, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 60);
  }
  return null;
}

function ts(rec: Rec, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && v > 1_000_000_000) {
      return new Date(v > 1e12 ? v : v * 1000).toISOString();
    }
    if (typeof v === "string") {
      const d = Date.parse(v.includes("T") ? v : v.replace(" ", "T"));
      if (Number.isFinite(d)) return new Date(d).toISOString();
    }
  }
  return null;
}

function hasAny(row: object): boolean {
  return Object.entries(row).some(
    ([k, v]) => k !== "date" && k !== "nap" && v !== null && v !== undefined,
  );
}

function ms(seconds: number | null): number | null {
  return seconds;
}

function mapWellness(rec: Rec, date: string): WellnessDailyRow | null {
  const row: WellnessDailyRow = {
    date,
    steps: num(rec, "totalSteps", "steps", "totalStepsValue"),
    distance_m: num(rec, "totalDistanceMeters", "totalDistance", "distanceInMeters"),
    floors_climbed: num(rec, "floorsAscended", "floorsClimbed"),
    resting_hr: num(rec, "restingHeartRate", "restingHeartRateValue", "wellnessRestingHeartRate"),
    min_hr: num(rec, "minHeartRate", "minHeartRateValue", "minAvgHeartRate"),
    max_hr: num(rec, "maxHeartRate", "maxHeartRateValue", "maxAvgHeartRate"),
    avg_stress: num(rec, "averageStressLevel", "avgStressLevel", "overallStressLevel"),
    max_stress: num(rec, "maxStressLevel"),
    body_battery_start: num(rec, "bodyBatteryAtWakeTime", "bodyBatteryStartValue"),
    body_battery_end: num(rec, "endingBodyBattery", "bodyBatteryEndValue"),
    body_battery_min: num(rec, "bodyBatteryLowestValue", "lowestBodyBattery", "bodyBatteryMin"),
    body_battery_max: num(rec, "bodyBatteryHighestValue", "highestBodyBattery", "bodyBatteryMax"),
    active_kcal: num(rec, "activeKilocalories", "activeCalories"),
    bmr_kcal: num(rec, "bmrKilocalories", "bmrCalories", "restingCalories"),
    intensity_minutes_moderate: num(rec, "moderateIntensityMinutes", "moderateIntensityDurationInMinutes"),
    intensity_minutes_vigorous: num(rec, "vigorousIntensityMinutes", "vigorousIntensityDurationInMinutes"),
    avg_spo2: num(rec, "averageSpo2", "avgSpo2", "averageSpO2Value"),
    avg_respiration: num(rec, "avgWakingRespirationValue", "averageRespirationValue", "avgRespirationRate"),
    skin_temp_deviation_c: num(rec, "skinTempDeviation", "deviationInCelsius"),
  };
  return hasAny(row) ? row : null;
}

function mapSleep(rec: Rec, date: string): SleepRow | null {
  const row: SleepRow = {
    date,
    sleep_start: ts(rec, "sleepStartTimestampGMT", "sleepStartTimestampLocal", "sleepStart"),
    sleep_end: ts(rec, "sleepEndTimestampGMT", "sleepEndTimestampLocal", "sleepEnd"),
    duration_s: ms(num(rec, "sleepTimeSeconds", "totalSleepSeconds", "sleepDurationSeconds")),
    deep_s: ms(num(rec, "deepSleepSeconds", "deepSleepDurationSeconds")),
    light_s: ms(num(rec, "lightSleepSeconds", "lightSleepDurationSeconds")),
    rem_s: ms(num(rec, "remSleepSeconds", "remSleepDurationSeconds")),
    awake_s: ms(num(rec, "awakeSleepSeconds", "awakeDurationSeconds", "awakeSeconds")),
    sleep_score: num(rec, "sleepScore", "overallSleepScore", "sleepScoreValue"),
    avg_sleep_hr: num(rec, "averageSleepHeartRate", "avgSleepHeartRate", "restingHeartRateSleep"),
    avg_sleep_hrv_ms: num(rec, "avgOvernightHrv", "averageHrvSleep", "avgSleepHrv"),
    avg_spo2: num(rec, "averageSpO2", "averageSpO2Value", "avgSleepSpo2"),
    avg_respiration: num(rec, "averageRespiration", "averageRespirationValue"),
    restlessness: num(rec, "restlessMomentsCount", "avgSleepStress", "restlessness"),
    nap: rec["napData"] === true || rec["nap"] === true,
  };
  return hasAny(row) ? row : null;
}

function mapHrv(rec: Rec, date: string): HrvRow | null {
  const row: HrvRow = {
    date,
    last_night_avg_ms: num(rec, "lastNightAvg", "lastNightAvgHrv", "weeklyAvgHrv" in rec ? "lastNightAvg" : "avgHrv"),
    last_night_5min_high_ms: num(rec, "lastNight5MinHigh", "lastNightHigh"),
    weekly_avg_ms: num(rec, "weeklyAvg", "weeklyAvgHrv"),
    baseline_low_ms: num(rec, "baselineLowUpper", "baselineLow"),
    baseline_high_ms: num(rec, "baselineBalancedUpper", "baselineHigh"),
    status: str(rec, "hrvStatus", "status"),
  };
  // "status" allein (z. B. aus anderen Dateien) reicht nicht als HRV-Datensatz.
  const hasValues = [
    row.last_night_avg_ms,
    row.last_night_5min_high_ms,
    row.weekly_avg_ms,
    row.baseline_low_ms,
    row.baseline_high_ms,
  ].some((v) => v !== null);
  return hasValues ? row : null;
}

function mapMetrics(rec: Rec, date: string): UserMetricRow | null {
  const row: UserMetricRow = {
    date,
    vo2max_running: num(rec, "vo2MaxRunning", "vo2MaxValue", "vo2max"),
    vo2max_cycling: num(rec, "vo2MaxCycling", "vo2MaxCyclingValue"),
    fitness_age: num(rec, "fitnessAge", "chronologicalFitnessAge"),
    lactate_threshold_hr: num(rec, "lactateThresholdHeartRate", "lactateThresholdHeartRateValue"),
    lactate_threshold_speed_mps: num(rec, "lactateThresholdSpeed", "lactateThresholdSpeedValue"),
    ftp_w: num(rec, "functionalThresholdPower", "ftp", "ftpValue"),
    training_readiness: num(rec, "trainingReadinessScore", "trainingReadiness", "score"),
    training_status: str(rec, "trainingStatus", "trainingStatusValue"),
    acute_load: num(rec, "acuteTrainingLoad", "acuteLoad"),
    chronic_load: num(rec, "chronicTrainingLoad", "chronicLoad"),
    load_ratio: num(rec, "acwr", "acuteChronicWorkloadRatio", "loadRatio"),
  };
  return hasAny(row) ? row : null;
}
