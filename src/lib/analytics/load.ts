/**
 * Belastungskennzahlen: TRIMP, TSS/rTSS/sTSS, CTL/ATL/TSB, ACWR,
 * Monotonie und Strain nach Foster. Alles reine Funktionen.
 */

export type Sex = "male" | "female" | "other" | null | undefined;

/** Banister-TRIMP mit geschlechtsabhängigem Exponentialfaktor. */
export function trimp(
  durationMin: number,
  avgHr: number,
  restHr: number,
  maxHr: number,
  sex: Sex,
): number {
  if (durationMin <= 0 || maxHr <= restHr) return 0;
  const hrr = Math.max(0, Math.min(1, (avgHr - restHr) / (maxHr - restHr)));
  const k = sex === "female" ? 1.67 : 1.92;
  const factor = sex === "female" ? 0.86 : 0.64;
  return round1(durationMin * hrr * factor * Math.exp(k * hrr));
}

/** Rad-TSS aus Normalized Power und FTP. */
export function bikeTss(durationS: number, normalizedPowerW: number, ftpW: number): number {
  if (durationS <= 0 || ftpW <= 0 || normalizedPowerW <= 0) return 0;
  const intensity = normalizedPowerW / ftpW;
  return round1(((durationS * normalizedPowerW * intensity) / (ftpW * 3600)) * 100);
}

/** Lauf-TSS aus steigungsangepasster Geschwindigkeit vs. Schwellengeschwindigkeit. */
export function runTss(
  durationS: number,
  gapSpeedMps: number,
  thresholdSpeedMps: number,
): number {
  if (durationS <= 0 || thresholdSpeedMps <= 0 || gapSpeedMps <= 0) return 0;
  const intensity = gapSpeedMps / thresholdSpeedMps;
  return round1((durationS / 3600) * intensity * intensity * 100);
}

/** Schwimm-TSS aus Critical Swim Speed. */
export function swimTss(durationS: number, avgSpeedMps: number, cssMps: number): number {
  if (durationS <= 0 || cssMps <= 0 || avgSpeedMps <= 0) return 0;
  const intensity = avgSpeedMps / cssMps;
  return round1((durationS / 3600) * Math.pow(intensity, 3) * 100);
}

/** Fallback, wenn weder Power noch Schwellenwerte vorliegen: TRIMP → TSS-Skala. */
export function trimpToTss(trimpValue: number): number {
  return round1(trimpValue * 1.0);
}

export interface DailyLoad {
  date: string; // ISO yyyy-mm-dd
  tss: number;
}

export interface LoadPoint {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  acwr: number | null;
}

const DAY = 86_400_000;

/** Füllt fehlende Tage mit 0 auf, damit EWMA korrekt abklingt. */
export function fillDailyGaps(loads: DailyLoad[]): DailyLoad[] {
  if (!loads.length) return [];
  const sorted = [...loads].sort((a, b) => a.date.localeCompare(b.date));
  const merged = new Map<string, number>();
  for (const l of sorted) merged.set(l.date, (merged.get(l.date) ?? 0) + l.tss);
  const out: DailyLoad[] = [];
  let cursor = Date.parse(`${sorted[0]!.date}T00:00:00Z`);
  const end = Date.parse(`${sorted[sorted.length - 1]!.date}T00:00:00Z`);
  while (cursor <= end) {
    const iso = new Date(cursor).toISOString().slice(0, 10);
    out.push({ date: iso, tss: round1(merged.get(iso) ?? 0) });
    cursor += DAY;
  }
  return out;
}

/**
 * CTL (42-Tage-EWMA) = Fitness, ATL (7-Tage-EWMA) = Ermüdung,
 * TSB = CTL − ATL = Form, plus ACWR (7:28 Tagesmittel).
 */
export function loadSeries(loads: DailyLoad[]): LoadPoint[] {
  const days = fillDailyGaps(loads);
  const ctlK = 2 / (42 + 1);
  const atlK = 2 / (7 + 1);
  let ctl = 0;
  let atl = 0;
  const out: LoadPoint[] = [];
  days.forEach((d, i) => {
    ctl = ctl + ctlK * (d.tss - ctl);
    atl = atl + atlK * (d.tss - atl);
    const acute = mean(days.slice(Math.max(0, i - 6), i + 1).map((x) => x.tss));
    const chronicWindow = days.slice(Math.max(0, i - 27), i + 1).map((x) => x.tss);
    const chronic = mean(chronicWindow);
    out.push({
      date: d.date,
      tss: d.tss,
      ctl: round1(ctl),
      atl: round1(atl),
      tsb: round1(ctl - atl),
      acwr: i >= 13 && chronic > 0 ? round2(acute / chronic) : null,
    });
  });
  return out;
}

export type AcwrZone = "low" | "optimal" | "elevated" | "high";

/** Ampel für das acute:chronic-Verhältnis. */
export function acwrZone(acwr: number | null): AcwrZone | null {
  if (acwr === null || !Number.isFinite(acwr)) return null;
  if (acwr < 0.8) return "low";
  if (acwr <= 1.3) return "optimal";
  if (acwr <= 1.5) return "elevated";
  return "high";
}

export interface FosterResult {
  monotony: number | null;
  strain: number | null;
  weeklyLoad: number;
}

/** Monotonie = Mittel/Standardabweichung der Tageslast, Strain = Wochenlast × Monotonie. */
export function fosterMonotony(weekLoads: number[]): FosterResult {
  const weeklyLoad = round1(weekLoads.reduce((s, x) => s + x, 0));
  if (weekLoads.length < 2) return { monotony: null, strain: null, weeklyLoad };
  const m = mean(weekLoads);
  const variance = mean(weekLoads.map((x) => (x - m) ** 2));
  const sd = Math.sqrt(variance);
  if (sd === 0) return { monotony: null, strain: null, weeklyLoad };
  const monotony = round2(m / sd);
  return { monotony, strain: round1(weeklyLoad * monotony), weeklyLoad };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}
export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
