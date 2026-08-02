/**
 * Rennplanung (Etappe 5): Zielzeit-Aufteilung, Pacing pro Disziplin und Taper.
 * Reine Funktionen – keine Datenbank, keine UI.
 */

export type RaceType =
  | "sprint"
  | "olympic"
  | "half_iron"
  | "iron"
  | "run_5k"
  | "run_10k"
  | "half_marathon"
  | "marathon"
  | "custom";

export interface RaceDistances {
  swimM: number;
  bikeM: number;
  runM: number;
}

export const RACE_PRESETS: Record<Exclude<RaceType, "custom">, RaceDistances & { label: string }> = {
  sprint: { label: "Sprintdistanz", swimM: 750, bikeM: 20000, runM: 5000 },
  olympic: { label: "Olympische Distanz", swimM: 1500, bikeM: 40000, runM: 10000 },
  half_iron: { label: "Mitteldistanz (70.3)", swimM: 1900, bikeM: 90000, runM: 21097.5 },
  iron: { label: "Langdistanz", swimM: 3800, bikeM: 180000, runM: 42195 },
  run_5k: { label: "5-km-Lauf", swimM: 0, bikeM: 0, runM: 5000 },
  run_10k: { label: "10-km-Lauf", swimM: 0, bikeM: 0, runM: 10000 },
  half_marathon: { label: "Halbmarathon", swimM: 0, bikeM: 0, runM: 21097.5 },
  marathon: { label: "Marathon", swimM: 0, bikeM: 0, runM: 42195 },
};

export interface PacingLeg {
  key: "swim" | "t1" | "bike" | "t2" | "run";
  label: string;
  distanceM: number;
  timeS: number;
  /** Klartext-Tempo, z. B. "4:45 min/km" oder "1:52 min/100 m". */
  pace: string;
  sharePct: number;
}

/** Übliche Zeitanteile einer Triathlon-Zielzeit, wenn keine eigenen Vorgaben da sind. */
const DEFAULT_SHARE = { swim: 0.17, t1: 0.02, bike: 0.51, t2: 0.015, run: 0.285 };

export interface PacingInput {
  distances: RaceDistances;
  goalTimeS: number;
  goalSwimS?: number | null;
  goalBikeS?: number | null;
  goalRunS?: number | null;
  goalT1S?: number | null;
  goalT2S?: number | null;
}

function fmtPacePerKm(timeS: number, distanceM: number): string {
  if (distanceM <= 0 || timeS <= 0) return "–";
  const perKm = timeS / (distanceM / 1000);
  const m = Math.floor(perKm / 60);
  const s = Math.round(perKm % 60);
  return `${m}:${String(s).padStart(2, "0")} min/km`;
}

function fmtPacePer100(timeS: number, distanceM: number): string {
  if (distanceM <= 0 || timeS <= 0) return "–";
  const per100 = timeS / (distanceM / 100);
  const m = Math.floor(per100 / 60);
  const s = Math.round(per100 % 60);
  return `${m}:${String(s).padStart(2, "0")} min/100 m`;
}

function fmtSpeed(timeS: number, distanceM: number): string {
  if (distanceM <= 0 || timeS <= 0) return "–";
  return `${((distanceM / 1000) / (timeS / 3600)).toFixed(1)} km/h`;
}

/** Sekunden als h:mm:ss bzw. mm:ss. */
export function fmtDuration(totalS: number): string {
  const s = Math.max(0, Math.round(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Verteilt die Zielzeit auf die Disziplinen. Eigene Vorgaben haben Vorrang, der Rest
 * wird nach den üblichen Anteilen aufgeteilt.
 */
export function buildPacingPlan(input: PacingInput): PacingLeg[] {
  const { distances, goalTimeS } = input;
  const hasSwim = distances.swimM > 0;
  const hasBike = distances.bikeM > 0;

  const fixed = {
    swim: hasSwim ? input.goalSwimS ?? null : 0,
    t1: hasSwim ? input.goalT1S ?? null : 0,
    bike: hasBike ? input.goalBikeS ?? null : 0,
    t2: hasBike ? input.goalT2S ?? null : 0,
    run: input.goalRunS ?? null,
  };

  const keys = ["swim", "t1", "bike", "t2", "run"] as const;
  const fixedSum = keys.reduce((s, k) => s + (fixed[k] ?? 0), 0);
  const openKeys = keys.filter((k) => fixed[k] == null);
  const openShare = openKeys.reduce((s, k) => s + DEFAULT_SHARE[k], 0);
  const rest = Math.max(0, goalTimeS - fixedSum);

  const times: Record<(typeof keys)[number], number> = { swim: 0, t1: 0, bike: 0, t2: 0, run: 0 };
  for (const k of keys) {
    times[k] = fixed[k] ?? (openShare > 0 ? (rest * DEFAULT_SHARE[k]) / openShare : 0);
  }

  const total = keys.reduce((s, k) => s + times[k], 0) || 1;

  const legs: PacingLeg[] = [
    {
      key: "swim",
      label: "Schwimmen",
      distanceM: distances.swimM,
      timeS: times.swim,
      pace: fmtPacePer100(times.swim, distances.swimM),
      sharePct: Math.round((times.swim / total) * 1000) / 10,
    },
    {
      key: "t1",
      label: "Wechsel 1",
      distanceM: 0,
      timeS: times.t1,
      pace: "–",
      sharePct: Math.round((times.t1 / total) * 1000) / 10,
    },
    {
      key: "bike",
      label: "Rad",
      distanceM: distances.bikeM,
      timeS: times.bike,
      pace: fmtSpeed(times.bike, distances.bikeM),
      sharePct: Math.round((times.bike / total) * 1000) / 10,
    },
    {
      key: "t2",
      label: "Wechsel 2",
      distanceM: 0,
      timeS: times.t2,
      pace: "–",
      sharePct: Math.round((times.t2 / total) * 1000) / 10,
    },
    {
      key: "run",
      label: "Laufen",
      distanceM: distances.runM,
      timeS: times.run,
      pace: fmtPacePerKm(times.run, distances.runM),
      sharePct: Math.round((times.run / total) * 1000) / 10,
    },
  ];

  return legs.filter((l) => l.distanceM > 0 || l.timeS > 0);
}

export interface TaperWeek {
  weeksToRace: number;
  volumeFactor: number;
  hint: string;
}

/**
 * Taper-Vorschlag für die letzten zwei Wochen vor einem A-Rennen:
 * Volumen runter, Intensität halten.
 */
export function taperPlan(daysToRace: number): TaperWeek[] {
  if (daysToRace < 0 || daysToRace > 21) return [];
  return [
    {
      weeksToRace: 2,
      volumeFactor: 0.6,
      hint: "Umfang auf rund 60 %, harte Reize kurz halten (z. B. 5 × 3 min im Renntempo).",
    },
    {
      weeksToRace: 1,
      volumeFactor: 0.4,
      hint: "Umfang auf rund 40 %, letzte harte Einheit spätestens 4 Tage vor dem Start.",
    },
  ].filter((w) => daysToRace >= (w.weeksToRace - 1) * 7);
}

/** Disziplin-Balance der letzten Wochen als Anteil an der Gesamtbelastung. */
export function disciplineBalance(
  loads: { family: "swim" | "bike" | "run" | "other"; load: number }[],
): { swim: number; bike: number; run: number; other: number; weakest: "swim" | "bike" | "run" | null } {
  const sum = { swim: 0, bike: 0, run: 0, other: 0 };
  for (const l of loads) sum[l.family] += l.load;
  const total = sum.swim + sum.bike + sum.run + sum.other;
  if (total <= 0) return { ...sum, weakest: null };
  const pct = {
    swim: Math.round((sum.swim / total) * 1000) / 10,
    bike: Math.round((sum.bike / total) * 1000) / 10,
    run: Math.round((sum.run / total) * 1000) / 10,
    other: Math.round((sum.other / total) * 1000) / 10,
  };
  const tri = (["swim", "bike", "run"] as const).filter((k) => sum[k] > 0 || pct[k] === 0);
  const weakest = tri.reduce((a, b) => (pct[a] <= pct[b] ? a : b));
  return { ...pct, weakest };
}
