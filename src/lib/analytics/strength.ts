/**
 * Kraftlast: übersetzt Gym-Sessions (Session-RPE nach Foster) in die
 * gleiche TSS-Skala wie die Ausdauerbelastung, damit Kraft und Cardio in
 * einer gemeinsamen Form-Kurve (CTL/ATL/TSB) zusammenlaufen. Reine Funktionen.
 */
import { round1, type DailyLoad } from "./load";

export interface GymExerciseLite {
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  rpe: number | null;
}

export interface GymSessionLite {
  date: string; // ISO yyyy-mm-dd
  session_type: string;
  duration_min: number | null;
  exercises: GymExerciseLite[];
}

/**
 * Kalibrierung so, dass die Kraftlast größenordnungsgleich mit der
 * Ausdauer-TSS ist: Dauer(min) × Session-RPE / 6.
 * 60 min @ RPE 5 ≈ 50, 60 min @ RPE 8 ≈ 80.
 */
const TSS_DIVISOR = 6;
/** Fallback-Dauer je Satz, wenn keine Session-Dauer erfasst wurde (min). */
const MIN_PER_SET = 3;
/** Angenommene Session-Intensität (RPE) je Typ, wenn keine RPE erfasst wurde. */
const TYPE_RPE: Record<string, number> = {
  mobility: 3,
  light: 4,
  push: 6.5,
  pull: 6.5,
  upper: 6.5,
  lower: 6.5,
  legs: 7.5,
  full: 7,
};
const DEFAULT_RPE = 6;

function clampRpe(x: number): number {
  if (!Number.isFinite(x)) return DEFAULT_RPE;
  return Math.max(1, Math.min(10, x));
}

/** Satz-gewichtetes Mittel der Übungs-RPE; Fallback auf die Typ-RPE. */
export function sessionRpe(session: GymSessionLite): number {
  let num = 0;
  let den = 0;
  for (const e of session.exercises) {
    if (e.rpe != null && e.rpe > 0) {
      const w = Math.max(1, e.sets ?? 1);
      num += e.rpe * w;
      den += w;
    }
  }
  if (den > 0) return clampRpe(num / den);
  return TYPE_RPE[session.session_type] ?? DEFAULT_RPE;
}

/** Geschätzte Dauer aus der Satzanzahl, wenn keine erfasst wurde. */
function estimateDurationMin(session: GymSessionLite): number {
  const sets = session.exercises.reduce((s, e) => s + Math.max(0, e.sets ?? 0), 0);
  return sets * MIN_PER_SET;
}

/** Belastung einer einzelnen Krafteinheit auf der TSS-Skala. */
export function gymSessionLoad(session: GymSessionLite): number {
  const dur =
    session.duration_min && session.duration_min > 0
      ? session.duration_min
      : estimateDurationMin(session);
  if (dur <= 0) return 0;
  return round1((dur * sessionRpe(session)) / TSS_DIVISOR);
}

/** Tageslasten aus Krafteinheiten (gleiches Datum wird später aufsummiert). */
export function gymDailyLoads(sessions: GymSessionLite[]): DailyLoad[] {
  return sessions
    .filter((s) => s.date)
    .map((s) => ({ date: s.date.slice(0, 10), tss: gymSessionLoad(s) }))
    .filter((d) => d.tss > 0);
}
