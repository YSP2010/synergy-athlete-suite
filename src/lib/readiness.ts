/**
 * Ampel-Logik für das Trainer-Cockpit.
 * Reine Funktionen ohne Datenbankzugriff – die Daten kommen aus get_team_readiness.
 */
import { calcRecovery, type DailyStat } from "@/lib/planner";

export type ReadinessLevel = "grey" | "green" | "amber" | "red";

export interface TeamReadinessRow {
  user_id: string;
  name: string;
  last_checkin: string | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
  acute_load: number;
  chronic_load: number;
  history_days: number;
  measured: boolean;
}

export interface AthleteReadiness {
  userId: string;
  name: string;
  level: ReadinessLevel;
  reason: string;
  acwr: number | null;
  recovery: number | null;
  soreness: number | null;
  daysSinceCheckin: number | null;
  measured: boolean;
}

/** Mindesthistorie, bevor ein ACWR-Wert überhaupt aussagekräftig ist. */
export const MIN_HISTORY_DAYS = 21;

/** Verhältnis akuter zu chronischer Belastung. Ohne genug Historie: null. */
export function acwr(row: {
  acute_load: number;
  chronic_load: number;
  history_days: number;
}): number | null {
  if (row.history_days < MIN_HISTORY_DAYS) return null;
  if (!row.chronic_load || row.chronic_load <= 0) return null;
  return Math.round((row.acute_load / row.chronic_load) * 100) / 100;
}

/** Tage seit dem letzten Check-in (null, wenn nie). */
export function daysSince(dateIso: string | null, today = new Date()): number | null {
  if (!dateIso) return null;
  const d = Date.parse(`${dateIso}T00:00:00.000Z`);
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((t - d) / 86_400_000));
}

/**
 * Ampel je Athlet. Grau heißt „zu wenig Daten" – niemals grün auf Verdacht.
 * Rot: ACWR > 1,5 oder Recovery < 40 oder Muskelkater ≥ 4.
 * Gelb: Grenzbereich (ACWR > 1,3 oder < 0,8, Recovery < 60, Muskelkater = 3,
 *       oder seit 3+ Tagen kein Check-in).
 */
export function athleteReadiness(row: TeamReadinessRow, today = new Date()): AthleteReadiness {
  const ratio = acwr(row);
  const since = daysSince(row.last_checkin, today);
  const hasCheckin = row.last_checkin != null && (since ?? 99) <= 2;

  const stat: DailyStat | null = hasCheckin
    ? {
        date: row.last_checkin as string,
        weight_kg: null,
        sleep_hours: row.sleep_hours,
        sleep_quality: row.sleep_quality,
        soreness: row.soreness,
        stress: row.stress,
        mood: row.mood,
      }
    : null;
  const recovery = stat ? calcRecovery(stat, [], []).score : null;

  const base: Omit<AthleteReadiness, "level" | "reason"> = {
    userId: row.user_id,
    name: row.name,
    acwr: ratio,
    recovery,
    soreness: row.soreness,
    daysSinceCheckin: since,
    measured: row.measured,
  };

  if (ratio == null && recovery == null) {
    return { ...base, level: "grey", reason: "Noch zu wenig Daten für eine Einschätzung." };
  }
  if (ratio != null && ratio > 1.5) {
    return { ...base, level: "red", reason: `Belastungssprung: Verhältnis ${ratio.toFixed(2)}.` };
  }
  if (recovery != null && recovery < 40) {
    return { ...base, level: "red", reason: `Erholung niedrig (${recovery}).` };
  }
  if (hasCheckin && (row.soreness ?? 0) >= 4) {
    return { ...base, level: "red", reason: `Starker Muskelkater (${row.soreness}/5).` };
  }
  if (ratio != null && (ratio > 1.3 || ratio < 0.8)) {
    return {
      ...base,
      level: "amber",
      reason:
        ratio > 1.3
          ? `Belastung steigt deutlich (Verhältnis ${ratio.toFixed(2)}).`
          : `Belastung zuletzt gering (Verhältnis ${ratio.toFixed(2)}).`,
    };
  }
  if (recovery != null && recovery < 60) {
    return { ...base, level: "amber", reason: `Erholung eingeschränkt (${recovery}).` };
  }
  if (hasCheckin && (row.soreness ?? 0) === 3) {
    return { ...base, level: "amber", reason: "Spürbarer Muskelkater (3/5)." };
  }
  if (since == null || since >= 3) {
    return {
      ...base,
      level: "amber",
      reason: since == null ? "Noch kein Check-in." : `Seit ${since} Tagen kein Check-in.`,
    };
  }
  if (ratio == null) {
    return { ...base, level: "grey", reason: "Belastungshistorie noch zu kurz." };
  }
  return { ...base, level: "green", reason: "Belastung und Erholung im grünen Bereich." };
}

/** Sortierung: Risiko zuerst (rot, gelb, grau, grün). */
export const LEVEL_ORDER: Record<ReadinessLevel, number> = {
  red: 0,
  amber: 1,
  grey: 2,
  green: 3,
};

export function sortByRisk(rows: AthleteReadiness[]): AthleteReadiness[] {
  return [...rows].sort(
    (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.name.localeCompare(b.name),
  );
}
