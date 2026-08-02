import { ParseError, type ParsedActivity, type ParsedLap, type ParsedSample } from "./types";

type Mesg = Record<string, unknown>;

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Garmin-Sport-Strings auf interne Kürzel mappen. */
export function mapFitSport(sport: unknown, subSport?: unknown): string {
  const s = String(sport ?? "").toLowerCase();
  const sub = String(subSport ?? "").toLowerCase();
  if (s === "running") return sub === "trail" ? "trail_run" : "run";
  if (s === "cycling") return sub.includes("indoor") || sub === "virtual_activity" ? "bike_indoor" : "bike";
  if (s === "swimming") return sub === "open_water" ? "swim_open" : "swim";
  if (s === "walking" || s === "hiking") return "hike";
  if (s === "training" || s === "fitness_equipment") return "strength";
  if (s === "multisport" || s === "transition") return "multisport";
  return s || "other";
}

function toDate(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const ms = Date.parse(v);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

const SEMICIRCLE = 180 / 2 ** 31;

function coord(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  // Der SDK liefert Semicircles; Werte > 180 sind sicher unkonvertiert.
  const deg = Math.abs(n) > 180 ? n * SEMICIRCLE : n;
  return Number(deg.toFixed(7));
}

/**
 * Parst eine FIT-Datei über das offizielle Garmin-SDK.
 * `decode` wird injiziert, damit die Funktion in Tests ohne SDK läuft.
 */
export function parseFitMessages(messages: Record<string, Mesg[]>): ParsedActivity {
  const session = messages["sessionMesgs"]?.[0];
  const fileId = messages["fileIdMesgs"]?.[0];
  const records = messages["recordMesgs"] ?? [];
  const lapMesgs = messages["lapMesgs"] ?? [];
  if (!session && !records.length) throw new ParseError("FIT enthält keine Session-/Record-Daten");

  const startMs =
    toDate(session?.["startTime"]) ?? toDate(records[0]?.["timestamp"]) ?? null;

  const samples: ParsedSample[] = records.map((r) => {
    const ts = toDate(r["timestamp"]);
    return {
      tOffsetS: ts != null && startMs != null ? Math.round((ts - startMs) / 1000) : 0,
      lat: coord(r["positionLat"]),
      lng: coord(r["positionLong"]),
      altitudeM: num(r["enhancedAltitude"]) ?? num(r["altitude"]),
      hr: num(r["heartRate"]),
      cadence: num(r["cadence"]),
      speedMps: num(r["enhancedSpeed"]) ?? num(r["speed"]),
      powerW: num(r["power"]),
      temperatureC: num(r["temperature"]),
      groundContactMs: num(r["stanceTime"]),
      verticalOscillationCm: num(r["verticalOscillation"]),
      strideLengthM: num(r["stepLength"]) != null ? num(r["stepLength"])! / 1000 : null,
    };
  });

  const laps: ParsedLap[] = lapMesgs.map((l, i) => ({
    lapIndex: i,
    durationS: num(l["totalTimerTime"]),
    distanceM: num(l["totalDistance"]),
    avgHr: num(l["avgHeartRate"]),
    avgSpeedMps: num(l["enhancedAvgSpeed"]) ?? num(l["avgSpeed"]),
    avgPowerW: num(l["avgPower"]),
    avgCadence: num(l["avgCadence"]),
    elevationGainM: num(l["totalAscent"]),
    sport: l["sport"] != null ? mapFitSport(l["sport"], l["subSport"]) : null,
  }));

  const manufacturer = fileId?.["manufacturer"] ?? null;
  const product = fileId?.["garminProduct"] ?? fileId?.["product"] ?? null;
  const serial = fileId?.["serialNumber"] ?? null;
  const created = toDate(fileId?.["timeCreated"]);
  const verified = manufacturer != null && serial != null && created != null;
  const deviceActivityKey = verified
    ? `${manufacturer}|${product ?? "unknown"}|${serial}|${new Date(created!).toISOString()}`
    : null;

  return {
    routeOnly: false,
    sport: mapFitSport(session?.["sport"], session?.["subSport"]),
    name: (session?.["sportProfileName"] as string | undefined) ?? null,
    startedAt: startMs != null ? new Date(startMs).toISOString() : null,
    durationS: num(session?.["totalElapsedTime"]),
    movingDurationS: num(session?.["totalTimerTime"]),
    distanceM: num(session?.["totalDistance"]),
    elevationGainM: num(session?.["totalAscent"]),
    elevationLossM: num(session?.["totalDescent"]),
    avgSpeedMps: num(session?.["enhancedAvgSpeed"]) ?? num(session?.["avgSpeed"]),
    maxSpeedMps: num(session?.["enhancedMaxSpeed"]) ?? num(session?.["maxSpeed"]),
    avgHr: num(session?.["avgHeartRate"]),
    maxHr: num(session?.["maxHeartRate"]),
    avgCadence: num(session?.["avgCadence"]),
    maxCadence: num(session?.["maxCadence"]),
    avgPowerW: num(session?.["avgPower"]),
    maxPowerW: num(session?.["maxPower"]),
    normalizedPowerW: num(session?.["normalizedPower"]),
    calories: num(session?.["totalCalories"]),
    avgTemperatureC: num(session?.["avgTemperature"]),
    avgGroundContactMs: num(session?.["avgStanceTime"]),
    avgVerticalOscillationCm: num(session?.["avgVerticalOscillation"]),
    avgVerticalRatio: num(session?.["avgVerticalRatio"]),
    avgStrideLengthM:
      num(session?.["avgStepLength"]) != null ? num(session?.["avgStepLength"])! / 1000 : null,
    gctBalancePct: num(session?.["avgStanceTimeBalance"]),
    aerobicTe: num(session?.["totalTrainingEffect"]),
    anaerobicTe: num(session?.["totalAnaerobicTrainingEffect"]),
    trainingLoad: num(session?.["trainingLoadPeak"]) ?? num(session?.["trainingStressScore"]),
    deviceActivityKey,
    deviceName: product != null ? String(product) : null,
    deviceManufacturer: manufacturer != null ? String(manufacturer) : null,
    verified,
    samples,
    laps,
  };
}
