/** Gemeinsame Typen der Import-Pipeline (Etappe 1). */

export type ImportFileType =
  | "fit"
  | "gpx"
  | "tcx"
  | "json"
  | "csv"
  | "apple_health"
  | "zip"
  | "unknown";

/** Ein einzelner Messpunkt einer Aktivität (Rohwerte, SI-Einheiten). */
export interface ParsedSample {
  tOffsetS: number;
  lat?: number | null;
  lng?: number | null;
  altitudeM?: number | null;
  hr?: number | null;
  cadence?: number | null;
  speedMps?: number | null;
  powerW?: number | null;
  temperatureC?: number | null;
  groundContactMs?: number | null;
  verticalOscillationCm?: number | null;
  strideLengthM?: number | null;
}

export interface ParsedLap {
  lapIndex: number;
  durationS?: number | null;
  distanceM?: number | null;
  avgHr?: number | null;
  avgSpeedMps?: number | null;
  avgPowerW?: number | null;
  avgCadence?: number | null;
  elevationGainM?: number | null;
  sport?: string | null;
}

/**
 * Normalisiertes Ergebnis eines Parsers. Distanzen in Metern, Geschwindigkeit
 * in m/s, Zeiten in Sekunden – Umrechnung passiert erst im UI.
 */
export interface ParsedActivity {
  /** true, wenn die Datei nur eine geplante Route ohne Zeitstempel enthält. */
  routeOnly: boolean;
  sport: string;
  name?: string | null;
  startedAt?: string | null;
  timezoneOffsetMin?: number | null;
  durationS?: number | null;
  movingDurationS?: number | null;
  distanceM?: number | null;
  elevationGainM?: number | null;
  elevationLossM?: number | null;
  avgSpeedMps?: number | null;
  maxSpeedMps?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  avgCadence?: number | null;
  maxCadence?: number | null;
  avgPowerW?: number | null;
  maxPowerW?: number | null;
  normalizedPowerW?: number | null;
  calories?: number | null;
  avgTemperatureC?: number | null;
  avgGroundContactMs?: number | null;
  avgVerticalOscillationCm?: number | null;
  avgVerticalRatio?: number | null;
  avgStrideLengthM?: number | null;
  gctBalancePct?: number | null;
  aerobicTe?: number | null;
  anaerobicTe?: number | null;
  trainingLoad?: number | null;
  /** manufacturer|product|serial|time_created – stabilste Geräte-Kennung. */
  deviceActivityKey?: string | null;
  deviceName?: string | null;
  deviceManufacturer?: string | null;
  /** true nur bei FIT-Dateien mit vollständiger Geräte-Signatur. */
  verified: boolean;
  samples: ParsedSample[];
  laps: ParsedLap[];
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
}
