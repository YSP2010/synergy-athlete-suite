// Geteilte Typen & Konstanten für den Trainingsplan-Generator.
// Reine Typen/Funktionen, client-safe (keine Server-Only-Importe).

export type PlanType = "gym" | "sport";
export type Experience = "beginner" | "intermediate" | "advanced";
export type PlanLocale = "de" | "en" | "uk";

export interface PlanExercise {
  name: string;
  /** Anzahl Sätze (bei Ausdauer-/Sporteinheiten ggf. 1). */
  sets: number;
  /** Wiederholungen oder Dauer, z. B. "8–12" oder "30 min". */
  reps: string;
  note?: string;
}

export interface PlanSession {
  /** z. B. "Einheit 1" oder Wochentag. */
  day: string;
  title: string;
  focus: string;
  exercises: PlanExercise[];
}

export interface WeekFocus {
  week: number;
  phase: string;
  focus: string;
}

export interface PlanMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface PlanContent {
  version: number;
  type: PlanType;
  goal: string | null;
  experience: Experience;
  weeks: number;
  summary: string;
  weekly_focus: WeekFocus[];
  sessions: PlanSession[];
  macros?: PlanMacros | null;
  notes: string[];
  generated_by: "hybrid" | "rules";
  generated_at: string;
}

/** Blocklänge (Wochen) für den Gym-Plan je Ziel. */
export const GYM_PLAN_WEEKS: Record<string, number> = {
  muscle_gain: 12,
  recomp: 8,
  performance: 8,
  maintain: 4,
};

export function gymPlanWeeks(goal: string | null | undefined): number {
  return (goal && GYM_PLAN_WEEKS[goal]) || 8;
}

/** Blocklänge (Wochen) für den Sport-Plan je Sportart. */
export function sportPlanWeeks(sport: string | null | undefined): number {
  if (sport === "triathlon") return 12;
  if (sport === "football") return 8;
  return 8;
}

/** Sperre: neuer Plan je Typ frühestens alle 4 Wochen. */
export const PLAN_COOLDOWN_DAYS = 28;

export interface PlanTypeStatus {
  lastGeneratedAt: string | null;
  canGenerate: boolean;
  /** ISO-Zeitpunkt, ab dem wieder generiert werden darf (null = sofort). */
  nextAvailableAt: string | null;
}

export interface PlanStatus {
  gym: PlanTypeStatus;
  sport: PlanTypeStatus;
}

/** Berechnet den Cooldown-Status aus dem Zeitpunkt der letzten Generierung. */
export function planTypeStatus(lastGeneratedAt: string | null): PlanTypeStatus {
  if (!lastGeneratedAt) {
    return { lastGeneratedAt: null, canGenerate: true, nextAvailableAt: null };
  }
  const next = new Date(new Date(lastGeneratedAt).getTime() + PLAN_COOLDOWN_DAYS * 86_400_000);
  const canGenerate = Date.now() >= next.getTime();
  return {
    lastGeneratedAt,
    canGenerate,
    nextAvailableAt: canGenerate ? null : next.toISOString(),
  };
}
