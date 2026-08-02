/**
 * Prognosen: Wettkampfzeiten (Riegel + VO2max nach Daniels/Gilbert),
 * Critical Power und Critical Swim Speed. Reine Funktionen.
 */

export const RACE_DISTANCES: { key: string; label: string; meters: number }[] = [
  { key: "5k", label: "5 km", meters: 5000 },
  { key: "10k", label: "10 km", meters: 10000 },
  { key: "hm", label: "Halbmarathon", meters: 21097.5 },
  { key: "m", label: "Marathon", meters: 42195 },
];

/** Riegel-Formel: T2 = T1 × (D2/D1)^1.06 (Sekunden). */
export function riegel(knownTimeS: number, knownDistanceM: number, targetDistanceM: number): number {
  if (knownTimeS <= 0 || knownDistanceM <= 0 || targetDistanceM <= 0) return 0;
  return Math.round(knownTimeS * Math.pow(targetDistanceM / knownDistanceM, 1.06));
}

/** VO2max-Schätzung aus einer Bestleistung (Daniels/Gilbert). */
export function vo2maxFromRace(distanceM: number, timeS: number): number | null {
  if (distanceM <= 0 || timeS <= 0) return null;
  const t = timeS / 60;
  const v = distanceM / t; // m/min
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  if (pct <= 0) return null;
  return Math.round((vo2 / pct) * 10) / 10;
}

/** Geschwindigkeit (m/min) bei gegebenem VO2max-Anteil – Umkehrung von Daniels. */
function velocityForVo2(vo2: number): number {
  // -4.6 + 0.182258v + 0.000104v² = vo2  → quadratische Gleichung
  const a = 0.000104;
  const b = 0.182258;
  const c = -4.6 - vo2;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** Prognose einer Renndistanz aus dem VO2max (iterativ, da %VO2max zeitabhängig). */
export function predictFromVo2max(vo2max: number, distanceM: number): number | null {
  if (vo2max <= 0 || distanceM <= 0) return null;
  let t = distanceM / 250; // Startschätzung in Minuten (~15 km/h)
  for (let i = 0; i < 30; i++) {
    const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
    const v = velocityForVo2(vo2max * pct);
    if (v <= 0) return null;
    const next = distanceM / v;
    if (Math.abs(next - t) < 0.01) {
      t = next;
      break;
    }
    t = next;
  }
  return Math.round(t * 60);
}

export interface RacePrediction {
  key: string;
  label: string;
  meters: number;
  riegelS: number | null;
  vo2S: number | null;
}

/** Prognosetabelle aus bester bekannter Leistung und/oder VO2max. */
export function racePredictions(
  best: { distanceM: number; timeS: number } | null,
  vo2max: number | null,
): RacePrediction[] {
  return RACE_DISTANCES.map((d) => ({
    key: d.key,
    label: d.label,
    meters: d.meters,
    riegelS: best ? riegel(best.timeS, best.distanceM, d.meters) : null,
    vo2S: vo2max ? predictFromVo2max(vo2max, d.meters) : null,
  }));
}

/** Critical Power aus zwei Zeitfahrleistungen (lineares Modell P = W'/t + CP). */
export function criticalPower(
  short: { powerW: number; durationS: number },
  long: { powerW: number; durationS: number },
): { cpW: number; wPrimeJ: number } | null {
  if (short.durationS >= long.durationS) return null;
  const w1 = short.powerW * short.durationS;
  const w2 = long.powerW * long.durationS;
  const cp = (w2 - w1) / (long.durationS - short.durationS);
  const wPrime = w1 - cp * short.durationS;
  if (!Number.isFinite(cp) || cp <= 0) return null;
  return { cpW: Math.round(cp), wPrimeJ: Math.round(wPrime) };
}

/** Critical Swim Speed aus 400 m und 200 m Bestzeit (m/s). */
export function criticalSwimSpeed(t400S: number, t200S: number): number | null {
  if (t400S <= t200S || t200S <= 0) return null;
  return Math.round((200 / (t400S - t200S)) * 1000) / 1000;
}
