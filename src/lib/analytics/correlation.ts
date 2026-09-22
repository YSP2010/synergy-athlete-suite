/**
 * Korrelation von Check-in-Faktoren (Schlaf, Stress, Muskelkater, Stimmung)
 * mit einer Erholungsmetrik (HRV, Readiness oder invertierter Ruhepuls).
 * Reine Funktionen – die Datenbeschaffung passiert in der Komponente.
 */

export type FactorKey = "sleepHours" | "sleepQuality" | "soreness" | "stress" | "mood";

export const FACTOR_KEYS: FactorKey[] = [
  "sleepHours",
  "sleepQuality",
  "soreness",
  "stress",
  "mood",
];

export interface DailyFactorRow {
  date: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
  /** Gewählte Erholungsmetrik des Tages – höher = besser. */
  recovery: number | null;
}

export type CorrelationStrength = "none" | "weak" | "moderate" | "strong";

export interface RecoveryDriver {
  factor: FactorKey;
  /** Pearson-Korrelation mit der Erholungsmetrik (−1…1). */
  r: number;
  /** Anzahl ausgewerteter Tagespaare. */
  n: number;
  direction: "positive" | "negative";
  strength: CorrelationStrength;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

/** Pearson-Korrelationskoeffizient; null bei zu wenig Daten oder Nullvarianz. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 2 || ys.length !== n) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

function strengthOf(r: number): CorrelationStrength {
  const abs = Math.abs(r);
  if (abs < 0.1) return "none";
  if (abs < 0.3) return "weak";
  if (abs < 0.5) return "moderate";
  return "strong";
}

/**
 * Ermittelt, welche Faktoren am stärksten mit der Erholung zusammenhängen.
 * Nur Faktoren mit mindestens `minSamples` gemeinsamen Tagen werden gewertet;
 * absteigend nach Stärke sortiert, „none" (praktisch kein Zusammenhang) fällt raus.
 */
export function recoveryDrivers(rows: DailyFactorRow[], minSamples = 8): RecoveryDriver[] {
  const out: RecoveryDriver[] = [];
  for (const factor of FACTOR_KEYS) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const row of rows) {
      const fv = row[factor];
      const rv = row.recovery;
      if (fv !== null && rv !== null && Number.isFinite(fv) && Number.isFinite(rv)) {
        xs.push(fv);
        ys.push(rv);
      }
    }
    if (xs.length < minSamples) continue;
    const r = pearson(xs, ys);
    if (r === null) continue;
    out.push({
      factor,
      r: Math.round(r * 100) / 100,
      n: xs.length,
      direction: r >= 0 ? "positive" : "negative",
      strength: strengthOf(r),
    });
  }
  return out
    .filter((d) => d.strength !== "none")
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}
