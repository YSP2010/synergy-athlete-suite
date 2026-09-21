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

// ---------- Muskelgruppen-Fokus ----------

export type FocusLevel = "off" | "less" | "normal" | "focus";

/** Feine Muskelgruppen, gruppiert in 6 Regionen. IDs sind i18n-Keys-Suffixe. */
export const MUSCLE_REGIONS: { id: string; groups: string[] }[] = [
  { id: "chest", groups: ["chest_upper", "chest_lower"] },
  { id: "back", groups: ["back_lats", "back_upper", "back_lower"] },
  { id: "shoulders", groups: ["delts_front", "delts_side", "delts_rear"] },
  { id: "arms", groups: ["biceps", "triceps", "forearms"] },
  { id: "core", groups: ["abs", "obliques"] },
  { id: "legs", groups: ["glutes", "quads", "hamstrings", "calves"] },
];

export const ALL_MUSCLE_GROUPS: string[] = MUSCLE_REGIONS.flatMap((r) => r.groups);

export interface TrainingFocus {
  preset?: string;
  /** Nur abweichende Gruppen speichern; fehlende = "normal". */
  groups: Record<string, FocusLevel>;
}

export const EMPTY_FOCUS: TrainingFocus = { preset: "balanced", groups: {} };

/** Vordefinierte Fokus-Vorlagen. Labels liegen in messages.ts (focus.preset.*). */
export const FOCUS_PRESETS: { id: string; groups: Record<string, FocusLevel> }[] = [
  { id: "balanced", groups: {} },
  {
    id: "hourglass",
    groups: {
      glutes: "focus",
      delts_side: "focus",
      delts_rear: "focus",
      back_lats: "focus",
      obliques: "less",
    },
  },
  {
    id: "upper",
    groups: {
      chest_upper: "focus",
      chest_lower: "focus",
      back_lats: "focus",
      back_upper: "focus",
      delts_front: "focus",
      delts_side: "focus",
      biceps: "focus",
      triceps: "focus",
    },
  },
  {
    id: "lower",
    groups: { glutes: "focus", quads: "focus", hamstrings: "focus", calves: "focus" },
  },
  {
    id: "push",
    groups: {
      chest_upper: "focus",
      chest_lower: "focus",
      delts_front: "focus",
      delts_side: "focus",
      triceps: "focus",
    },
  },
  {
    id: "pull",
    groups: { back_lats: "focus", back_upper: "focus", delts_rear: "focus", biceps: "focus" },
  },
  { id: "custom", groups: {} },
];

export function focusGroupLevel(
  focus: TrainingFocus | null | undefined,
  group: string,
): FocusLevel {
  return focus?.groups?.[group] ?? "normal";
}

/** Regionen, bei denen ALLE Untergruppen auf "off" stehen (für die Warnung). */
export function fullyExcludedRegions(focus: TrainingFocus | null | undefined): string[] {
  if (!focus) return [];
  return MUSCLE_REGIONS.filter((r) => r.groups.every((g) => focus.groups?.[g] === "off")).map(
    (r) => r.id,
  );
}

/** Zerlegt den Fokus in Listen für Generator/KI-Prompt. */
export function focusLists(focus: TrainingFocus | null | undefined): {
  emphasize: string[];
  reduce: string[];
  exclude: string[];
} {
  const emphasize: string[] = [];
  const reduce: string[] = [];
  const exclude: string[] = [];
  for (const [g, lvl] of Object.entries(focus?.groups ?? {})) {
    if (lvl === "focus") emphasize.push(g);
    else if (lvl === "less") reduce.push(g);
    else if (lvl === "off") exclude.push(g);
  }
  return { emphasize, reduce, exclude };
}
