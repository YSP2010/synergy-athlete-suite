/**
 * Adapter für den Garmin Connect **GDPR-Export** ("Export Your Data").
 *
 * Dieser Export unterscheidet sich vom Web-API-Export (den `wellness.ts`
 * bedient): andere Datei- und Feldnamen, tiefer verschachtelte Strukturen und
 * – für Aktivitäten – eine komplett andere Form. Damit die bewährte Web-API-
 * Logik unberührt bleibt, liegt der gesamte GDPR-Code hier in neuer Datei.
 *
 * Die Zuordnung erfolgt über Datei-Namensbestandteile (case-insensitive).
 * Unbekannte Dateien liefern ein leeres Bundle. Der Parser wirft nie – bei
 * jedem Fehler wird ein leeres Bundle bzw. eine leere Liste zurückgegeben.
 *
 * Einheiten wurden empirisch gegen einen echten Export geprüft.
 */
import {
  emptyBundle,
  type WellnessBundle,
  type WellnessDailyRow,
  type SleepRow,
  type HrvRow,
  type UserMetricRow,
} from "./wellness";
import { mapFitSport } from "./fit";
import type { ParsedActivity } from "./types";

type Rec = Record<string, unknown>;

/* ------------------------------------------------------------------ Helfer */

function isRec(v: unknown): v is Rec {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Tolerante Zahl: akzeptiert number und numerische Strings, sonst null. */
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

/** Tolerante Zeichenkette (gekürzt), sonst null. */
function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim().slice(0, 60);
  return null;
}

/** Wandelt einen Roh-Wert in ein Kalenderdatum (YYYY-MM-DD) um. */
function toDate(raw: unknown): string | null {
  if (typeof raw === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  // Manche Dateien (AcuteTrainingLoad) liefern calendarDate als Epoch-ms.
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 1_000_000_000_000) {
    return new Date(raw).toISOString().slice(0, 10);
  }
  return null;
}

/** Wandelt einen GMT-Zeitstempel in ISO-8601 um, sonst null. */
function toIso(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 1_000_000_000) {
    return new Date(raw > 1e12 ? raw : raw * 1000).toISOString();
  }
  if (typeof raw === "string" && raw.trim()) {
    // Garmin schreibt "2026-08-05T21:25:10.0" (GMT, ohne Offset).
    const s = raw.includes("T") ? raw : raw.replace(" ", "T");
    const withZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
    const ms = Date.parse(withZone);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

/** Übernimmt die Zeile nur, wenn sie außer dem Datum mindestens einen Wert hat. */
function hasAny(row: object): boolean {
  return Object.entries(row).some(
    ([k, v]) => k !== "date" && v !== null && v !== undefined,
  );
}

/** Top-Level-JSON-Array lesen, Junk (z. B. {"retro":false}) übersteht die Maps. */
function parseArray(text: string): Rec[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  if (Array.isArray(json)) return json.filter(isRec);
  if (isRec(json)) return [json];
  return [];
}

/* ------------------------------------------------------------- Wellness-Router */

/**
 * Parst eine JSON-Datei aus dem Garmin-GDPR-Export in normalisierte Zeilen.
 * Route über Datei-Namensbestandteil. Unbekannt → leeres Bundle.
 */
export function parseGarminExportFile(text: string, filename: string): WellnessBundle {
  try {
    const name = (filename ?? "").toLowerCase();
    if (name.includes("udsfile")) return parseUds(text);
    if (name.includes("sleepdata")) return parseSleep(text);
    if (name.includes("trainingreadiness")) return parseTrainingReadiness(text);
    if (name.includes("metricsmaxmetdata") || name.includes("maxmet")) return parseMaxMet(text);
    if (name.includes("acutetrainingload")) return parseAcuteLoad(text);
    if (name.includes("healthstatusdata")) return parseHealthStatus(text);
    return emptyBundle();
  } catch {
    return emptyBundle();
  }
}

/* ------------------------------------------------------------------- UDSFile */

/** Sucht in einer Liste von {type,...}-Aggregaten den Eintrag mit passendem Typ. */
function findByType(list: unknown, typeKey: string, wanted: string): Rec | null {
  if (!Array.isArray(list)) return null;
  for (const e of list) {
    if (isRec(e) && String(e[typeKey]).toUpperCase() === wanted) return e;
  }
  return null;
}

function parseUds(text: string): WellnessBundle {
  const out = emptyBundle();
  for (const rec of parseArray(text)) {
    const date = toDate(rec["calendarDate"]);
    if (!date) continue;

    const stress = isRec(rec["allDayStress"])
      ? findByType((rec["allDayStress"] as Rec)["aggregatorList"], "type", "TOTAL")
      : null;

    const bbList = isRec(rec["bodyBattery"])
      ? (rec["bodyBattery"] as Rec)["bodyBatteryStatList"]
      : null;
    const bb = (wanted: string): number | null => {
      const e = findByType(bbList, "bodyBatteryStatType", wanted);
      return e ? num(e["statsValue"]) : null;
    };

    const respiration = isRec(rec["respiration"]) ? (rec["respiration"] as Rec) : null;
    const floorsM = num(rec["floorsAscendedInMeters"]);

    const row: WellnessDailyRow = {
      date,
      steps: num(rec["totalSteps"]),
      distance_m: num(rec["totalDistanceMeters"]),
      resting_hr: num(rec["restingHeartRate"]),
      min_hr: num(rec["minHeartRate"]),
      max_hr: num(rec["maxHeartRate"]),
      active_kcal: num(rec["activeKilocalories"]),
      bmr_kcal: num(rec["bmrKilocalories"]),
      intensity_minutes_moderate: num(rec["moderateIntensityMinutes"]),
      intensity_minutes_vigorous: num(rec["vigorousIntensityMinutes"]),
      avg_spo2: num(rec["averageSpo2Value"]),
      avg_respiration: respiration ? num(respiration["avgWakingRespirationValue"]) : null,
      avg_stress: stress ? num(stress["averageStressLevel"]) : null,
      max_stress: stress ? num(stress["maxStressLevel"]) : null,
      body_battery_start: bb("STARTOFDAY"),
      body_battery_end: bb("ENDOFDAY"),
      body_battery_min: bb("LOWEST"),
      body_battery_max: bb("HIGHEST"),
      floors_climbed: floorsM != null ? Math.round(floorsM / 3.048) : null,
    };
    if (hasAny(row)) out.wellness.push(row);
  }
  return out;
}

/* ----------------------------------------------------------------- sleepData */

function parseSleep(text: string): WellnessBundle {
  const out = emptyBundle();
  for (const rec of parseArray(text)) {
    const date = toDate(rec["calendarDate"]);
    if (!date) continue;

    const deep = num(rec["deepSleepSeconds"]);
    const light = num(rec["lightSleepSeconds"]);
    const rem = num(rec["remSleepSeconds"]);
    const awake = num(rec["awakeSleepSeconds"]);
    // Dauer nur, wenn alle drei Schlafphasen vorliegen (Wachzeit ausgeschlossen).
    const duration =
      deep != null && light != null && rem != null ? deep + light + rem : null;

    const scores = isRec(rec["sleepScores"]) ? (rec["sleepScores"] as Rec) : null;
    const spo2 = isRec(rec["spo2SleepSummary"]) ? (rec["spo2SleepSummary"] as Rec) : null;

    const row: SleepRow = {
      date,
      sleep_start: toIso(rec["sleepStartTimestampGMT"]),
      sleep_end: toIso(rec["sleepEndTimestampGMT"]),
      deep_s: deep,
      light_s: light,
      rem_s: rem,
      awake_s: awake,
      duration_s: duration,
      sleep_score: scores ? num(scores["overallScore"]) : null,
      avg_sleep_hr: spo2 ? num(spo2["averageHR"]) : null,
      avg_spo2: spo2 ? num(spo2["averageSPO2"]) : null,
      avg_respiration: num(rec["averageRespiration"]),
      restlessness: num(rec["restlessMomentCount"]),
    };
    if (hasAny(row)) out.sleep.push(row);
  }
  return out;
}

/* --------------------------------------------------------- TrainingReadiness */

function parseTrainingReadiness(text: string): WellnessBundle {
  const out = emptyBundle();
  for (const rec of parseArray(text)) {
    const date = toDate(rec["calendarDate"]);
    if (!date) continue;

    const metric: UserMetricRow = { date, training_readiness: num(rec["score"]) };
    if (hasAny(metric)) out.metrics.push(metric);

    // HRV-Wochenmittel (ms) – Schlaf kommt bewusst NICHT von hier.
    const hrv: HrvRow = { date, weekly_avg_ms: num(rec["hrvWeeklyAverage"]) };
    if (hrv.weekly_avg_ms != null) out.hrv.push(hrv);
  }
  return out;
}

/* ------------------------------------------------------------------- MaxMet */

function parseMaxMet(text: string): WellnessBundle {
  const out = emptyBundle();
  for (const rec of parseArray(text)) {
    const date = toDate(rec["calendarDate"]);
    if (!date) continue;
    const vo2 = num(rec["vo2MaxValue"]);
    if (vo2 == null) continue;
    const sport = String(rec["sport"] ?? "").toUpperCase();
    const row: UserMetricRow = { date };
    if (sport === "RUNNING") row.vo2max_running = vo2;
    else if (sport === "CYCLING") row.vo2max_cycling = vo2;
    if (hasAny(row)) out.metrics.push(row);
  }
  return out;
}

/* -------------------------------------------------------- AcuteTrainingLoad */

function parseAcuteLoad(text: string): WellnessBundle {
  const out = emptyBundle();
  for (const rec of parseArray(text)) {
    const date = toDate(rec["calendarDate"]);
    if (!date) continue;
    const acute = num(rec["dailyTrainingLoadAcute"]);
    const chronic = num(rec["dailyTrainingLoadChronic"]);
    const row: UserMetricRow = {
      date,
      acute_load: acute,
      chronic_load: chronic,
      load_ratio:
        acute != null && chronic != null && chronic > 0
          ? Number((acute / chronic).toFixed(3))
          : null,
    };
    if (hasAny(row)) out.metrics.push(row);
  }
  return out;
}

/* --------------------------------------------------------- healthStatusData */

function parseHealthStatus(text: string): WellnessBundle {
  const out = emptyBundle();
  for (const rec of parseArray(text)) {
    const date = toDate(rec["calendarDate"]);
    if (!date) continue;
    const hrvEntry = findByType(rec["metrics"], "type", "HRV");
    if (!hrvEntry) continue;
    const value = num(hrvEntry["value"]);
    const row: HrvRow = {
      date,
      last_night_avg_ms: value != null && value > 0 ? value : null,
      status: str(hrvEntry["status"]),
    };
    if (row.last_night_avg_ms != null) out.hrv.push(row);
  }
  return out;
}

/* ============================================================ Aktivitäten */

/** Dedizierte Zuordnung Garmin-`activityType` → internes Sport-Kürzel. */
const ACTIVITY_TYPE_MAP: Record<string, string> = {
  strength_training: "strength",
  running: "run",
  cycling: "bike",
  indoor_cycling: "bike_indoor",
  walking: "hike",
  soccer: "soccer",
  yoga: "yoga",
  breathwork: "breathwork",
};

/**
 * Parst `..._summarizedActivities.json` in normalisierte Aktivitäten (SI).
 *
 * Empirisch verifizierte Einheiten des GDPR-Exports:
 *  - duration/movingDuration/elapsedDuration: **Millisekunden** → /1000
 *  - distance: **Zentimeter** → /100
 *  - avgSpeed/maxSpeed: um Faktor 10 zu klein → Geschwindigkeit wird aus
 *    Distanz/Zeit berechnet; maxSpeed = rawMax × 10 (Faktor über alle
 *    Aktivitäten konsistent bestätigt, Werte physikalisch plausibel).
 *  - elevationGain/Loss: **Zentimeter** → /100 (via Split-Summary bestätigt)
 *  - avgStrideLength: **Zentimeter** → /100
 */
export function parseGarminSummarizedActivities(text: string): ParsedActivity[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  const containers = Array.isArray(json) ? json : [json];
  const raw: Rec[] = [];
  for (const c of containers) {
    if (!isRec(c)) continue;
    const list = c["summarizedActivitiesExport"];
    if (Array.isArray(list)) for (const a of list) if (isRec(a)) raw.push(a);
  }

  const out: ParsedActivity[] = [];
  for (const a of raw) {
    const activityId = num(a["activityId"]);
    const beginTs = num(a["beginTimestamp"]);
    if (activityId == null && beginTs == null) continue;

    const durationS = num(a["duration"]) != null ? num(a["duration"])! / 1000 : null;
    const movingDurationS =
      num(a["movingDuration"]) != null ? num(a["movingDuration"])! / 1000 : null;
    const distRaw = num(a["distance"]);
    const distanceM = distRaw != null ? distRaw / 100 : null;

    // Durchschnittstempo aus Distanz/Zeit (Rohfeld ist um Faktor 10 verzerrt).
    const speedBaseS = movingDurationS ?? durationS;
    const avgSpeedMps =
      distanceM != null && distanceM > 0 && speedBaseS != null && speedBaseS > 0
        ? Number((distanceM / speedBaseS).toFixed(4))
        : null;
    // maxSpeed: konsistenter Faktor 10 gegenüber Distanz/Zeit bestätigt.
    const rawMax = num(a["maxSpeed"]);
    const maxSpeedMps =
      rawMax != null && rawMax > 0 ? Number((rawMax * 10).toFixed(4)) : null;

    const elevGain = num(a["elevationGain"]);
    const elevLoss = num(a["elevationLoss"]);
    const strideCm = num(a["avgStrideLength"]);

    const localMs = num(a["startTimeLocal"]);
    const gmtMs = num(a["startTimeGmt"]);
    const tzOffset =
      localMs != null && gmtMs != null ? Math.round((localMs - gmtMs) / 60000) : null;

    const activityType = String(a["activityType"] ?? "").toLowerCase();
    const sport =
      ACTIVITY_TYPE_MAP[activityType] ?? mapFitSport(a["sportType"], a["activityType"]);

    out.push({
      routeOnly: false,
      sport,
      name: str(a["name"]),
      startedAt: beginTs != null ? new Date(beginTs).toISOString() : null,
      timezoneOffsetMin: tzOffset,
      durationS,
      movingDurationS,
      distanceM,
      elevationGainM: elevGain != null ? Number((elevGain / 100).toFixed(2)) : null,
      elevationLossM: elevLoss != null ? Number((elevLoss / 100).toFixed(2)) : null,
      avgSpeedMps,
      maxSpeedMps,
      avgHr: num(a["avgHr"]),
      maxHr: num(a["maxHr"]),
      avgCadence: num(a["avgRunCadence"]),
      maxCadence: num(a["maxRunCadence"]),
      calories: num(a["calories"]),
      avgStrideLengthM: strideCm != null ? Number((strideCm / 100).toFixed(3)) : null,
      aerobicTe: num(a["aerobicTrainingEffect"]),
      anaerobicTe: num(a["anaerobicTrainingEffect"]),
      trainingLoad: num(a["activityTrainingLoad"]),
      deviceManufacturer: str(a["manufacturer"]),
      deviceName: a["deviceId"] != null ? String(a["deviceId"]) : null,
      deviceActivityKey: activityId != null ? `garmin-export|${activityId}` : null,
      verified: false,
      samples: [],
      laps: [],
    });
  }
  return out;
}
