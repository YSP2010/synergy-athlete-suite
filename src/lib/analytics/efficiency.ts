/**
 * Lauf-Effizienz: Grade Adjusted Pace, Efficiency Factor, Pa:Hr-Decoupling,
 * Running-Economy-Proxy und Trittfrequenz-Konsistenz. Reine Funktionen.
 */

export interface EffSample {
  tOffsetS: number;
  hr?: number | null;
  speedMps?: number | null;
  altitudeM?: number | null;
  cadence?: number | null;
  distanceM?: number | null;
}

/**
 * Steigungsfaktor (Minetti-artige Näherung): Kosten pro Meter relativ zur Ebene.
 * gradient = Höhenänderung / horizontale Distanz (z. B. 0.05 = 5 %).
 */
export function gradeFactor(gradient: number): number {
  const g = Math.max(-0.3, Math.min(0.3, gradient));
  return 1 + 4.4 * g + 15 * g * g;
}

/** Steigungsangepasste Geschwindigkeit eines Abschnitts. */
export function gradeAdjustedSpeed(speedMps: number, gradient: number): number {
  if (speedMps <= 0) return 0;
  return round3(speedMps * gradeFactor(gradient));
}

/** Mittlere GAP-Geschwindigkeit über alle Messpunkte (m/s). */
export function avgGradeAdjustedSpeed(samples: EffSample[]): number | null {
  const usable = samples.filter((s) => (s.speedMps ?? 0) > 0);
  if (usable.length < 2) return null;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < usable.length; i++) {
    const prev = usable[i - 1]!;
    const cur = usable[i]!;
    const dt = cur.tOffsetS - prev.tOffsetS;
    if (dt <= 0) continue;
    const speed = cur.speedMps!;
    const dh =
      cur.altitudeM != null && prev.altitudeM != null ? cur.altitudeM - prev.altitudeM : 0;
    const horizontal = speed * dt;
    const gradient = horizontal > 1 ? dh / horizontal : 0;
    sum += gradeAdjustedSpeed(speed, gradient) * dt;
    count += dt;
  }
  return count > 0 ? round3(sum / count) : null;
}

/** EF = steigungsangepasste Geschwindigkeit (m/min) pro Herzschlag. */
export function efficiencyFactor(gapSpeedMps: number | null, avgHr: number | null): number | null {
  if (!gapSpeedMps || !avgHr || avgHr <= 0) return null;
  return round3((gapSpeedMps * 60) / avgHr);
}

/**
 * Pa:Hr-Decoupling in Prozent: Vergleicht Geschwindigkeit/Puls der ersten
 * und zweiten Hälfte. Positive Werte = Ermüdung (Puls driftet nach oben).
 */
export function decoupling(samples: EffSample[]): number | null {
  const usable = samples.filter((s) => (s.speedMps ?? 0) > 0 && (s.hr ?? 0) > 0);
  if (usable.length < 10) return null;
  const half = Math.floor(usable.length / 2);
  const ratio = (part: EffSample[]) => {
    const speed = avg(part.map((s) => s.speedMps!));
    const hr = avg(part.map((s) => s.hr!));
    return hr > 0 ? speed / hr : 0;
  };
  const first = ratio(usable.slice(0, half));
  const second = ratio(usable.slice(half));
  if (first <= 0) return null;
  return round2(((first - second) / first) * 100);
}

/**
 * Running-Economy-Proxy 0–100 aus Vertical Ratio, Bodenkontaktzeit und
 * Schrittlänge. Höher ist besser.
 */
export function runningEconomyScore(input: {
  verticalRatio?: number | null;
  groundContactMs?: number | null;
  strideLengthM?: number | null;
}): number | null {
  const parts: number[] = [];
  if (input.verticalRatio != null) parts.push(scoreRange(input.verticalRatio, 12, 5));
  if (input.groundContactMs != null) parts.push(scoreRange(input.groundContactMs, 320, 190));
  if (input.strideLengthM != null) parts.push(scoreRange(input.strideLengthM, 0.9, 1.6));
  if (!parts.length) return null;
  return Math.round(avg(parts));
}

/** Standardabweichung der Trittfrequenz (kleiner = gleichmäßiger). */
export function cadenceConsistency(samples: EffSample[]): number | null {
  const values = samples.map((s) => s.cadence).filter((c): c is number => (c ?? 0) > 0);
  if (values.length < 5) return null;
  const m = avg(values);
  return round2(Math.sqrt(avg(values.map((v) => (v - m) ** 2))));
}

/** Lineare Bewertung zwischen "schlechtem" und "gutem" Wert auf 0–100. */
function scoreRange(value: number, worst: number, best: number): number {
  const t = (value - worst) / (best - worst);
  return Math.max(0, Math.min(100, t * 100));
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}
function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
