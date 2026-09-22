/**
 * Erholungs-Snapshot für den Trainingsplan-Generator. Nutzt dieselbe
 * Hybrid-Last (Ausdauer + Kraft) wie /analytics, damit Planer und Auswertung
 * konsistent sind. Reine Funktionen – die Datenbeschaffung passiert im
 * Server-Handler (plan.functions.ts).
 */
import {
  buildLoadSeriesHybrid,
  type AnalyticsActivity,
  type Thresholds,
} from "./analytics/aggregate";
import type { GymSessionLite } from "./analytics/strength";

export type RecoveryState = "fresh" | "balanced" | "fatigued" | "overreached" | "unknown";

export interface PlanRecovery {
  /** Form (TSB) des letzten Tages. */
  tsb: number | null;
  /** Acute:Chronic-Verhältnis des letzten Tages. */
  acwr: number | null;
  /** Garmin Training Readiness (0–100), falls vorhanden. */
  trainingReadiness: number | null;
  state: RecoveryState;
}

export const UNKNOWN_RECOVERY: PlanRecovery = {
  tsb: null,
  acwr: null,
  trainingReadiness: null,
  state: "unknown",
};

/** Leitet einen groben Erholungszustand aus TSB, ACWR und Readiness ab. */
export function recoveryState(
  tsb: number | null,
  acwr: number | null,
  readiness: number | null,
): RecoveryState {
  if (tsb === null && acwr === null && readiness === null) return "unknown";
  if (
    (acwr !== null && acwr > 1.5) ||
    (tsb !== null && tsb < -25) ||
    (readiness !== null && readiness < 25)
  ) {
    return "overreached";
  }
  if (
    (acwr !== null && acwr > 1.3) ||
    (tsb !== null && tsb < -10) ||
    (readiness !== null && readiness < 40)
  ) {
    return "fatigued";
  }
  if (
    (tsb !== null && tsb > 8 && (acwr === null || acwr < 1.0)) ||
    (readiness !== null && readiness > 75)
  ) {
    return "fresh";
  }
  return "balanced";
}

/** Berechnet den Erholungs-Snapshot aus Aktivitäten, Gym-Sessions und Readiness. */
export function computePlanRecovery(
  activities: AnalyticsActivity[],
  gymSessions: GymSessionLite[],
  thresholds: Thresholds,
  trainingReadiness: number | null,
): PlanRecovery {
  const series = buildLoadSeriesHybrid(activities, gymSessions, thresholds);
  const last = series[series.length - 1] ?? null;
  const tsb = last ? last.tsb : null;
  const acwr = last ? last.acwr : null;
  return { tsb, acwr, trainingReadiness, state: recoveryState(tsb, acwr, trainingReadiness) };
}
