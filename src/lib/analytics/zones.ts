/**
 * Trainingszonen. Reine Funktionen, keine DB-Zugriffe.
 * HR-Zonen bevorzugt aus der Laktatschwellen-HR (genauer als %HRmax).
 */

export interface Zone {
  index: number;
  label: string;
  from: number;
  to: number;
}

const HR_LABELS = ["Regeneration", "Grundlage", "Tempo", "Schwelle", "VO2max"];
/** Anteile der Laktatschwellen-HR (Friel-artige Einteilung). */
const HR_LTHR_BOUNDS = [0.6, 0.83, 0.94, 1.0, 1.03, 1.15];
/** Anteile der maximalen HR, wenn keine Schwelle bekannt ist. */
const HR_MAX_BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

/** 5 HR-Zonen. `lthr` hat Vorrang, sonst wird `maxHr` verwendet. */
export function hrZones(maxHr: number | null, lthr?: number | null): Zone[] {
  const base = lthr && lthr > 0 ? lthr : maxHr;
  if (!base || base <= 0) return [];
  const bounds = lthr && lthr > 0 ? HR_LTHR_BOUNDS : HR_MAX_BOUNDS;
  return HR_LABELS.map((label, i) => ({
    index: i + 1,
    label,
    from: Math.round(base * bounds[i]!),
    to: Math.round(base * bounds[i + 1]!),
  }));
}

const POWER_LABELS = [
  "Aktive Erholung",
  "Grundlage",
  "Tempo",
  "Schwelle",
  "VO2max",
  "Anaerob",
  "Neuromuskulär",
];
const POWER_BOUNDS = [0, 0.55, 0.75, 0.9, 1.05, 1.2, 1.5, 3];

/** 7 Power-Zonen nach Coggan aus der FTP. */
export function powerZones(ftpW: number | null): Zone[] {
  if (!ftpW || ftpW <= 0) return [];
  return POWER_LABELS.map((label, i) => ({
    index: i + 1,
    label,
    from: Math.round(ftpW * POWER_BOUNDS[i]!),
    to: Math.round(ftpW * POWER_BOUNDS[i + 1]!),
  }));
}

/** Pace-Zonen (Sekunden pro km) aus der Schwellengeschwindigkeit in m/s. */
export function paceZones(thresholdSpeedMps: number | null): Zone[] {
  if (!thresholdSpeedMps || thresholdSpeedMps <= 0) return [];
  // Anteile der Schwellengeschwindigkeit, langsam → schnell
  const speedBounds = [0.65, 0.78, 0.88, 0.97, 1.03, 1.15];
  return HR_LABELS.map((label, i) => ({
    index: i + 1,
    label,
    // langsamere Zone = größere Sekunden/km
    from: Math.round(1000 / (thresholdSpeedMps * speedBounds[i + 1]!)),
    to: Math.round(1000 / (thresholdSpeedMps * speedBounds[i]!)),
  }));
}

/** Ordnet einen Messwert einer Zone zu (1-basiert), sonst null. */
export function zoneOf(zones: Zone[], value: number): number | null {
  for (const z of zones) {
    if (value >= z.from && value < z.to) return z.index;
  }
  if (zones.length && value >= zones[zones.length - 1]!.to) return zones.length;
  return null;
}
