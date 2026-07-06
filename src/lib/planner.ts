// Kern-Logik: Recovery-Score, Makro-Berechnung, Wochenplan-Generierung.
// Reine Funktionen, client-safe.

import { addDays, isoDow, toISODate } from "./dates";

// ---------- Types ----------

export type Goal = "muscle_gain" | "maintain" | "recomp" | "performance";
export type Sex = "male" | "female" | "other";
export type GymType = "push" | "pull" | "legs" | "upper" | "lower" | "full" | "light" | "mobility";
export type SportKind = "training" | "match";
export type Intensity = "low" | "mid" | "high";
export type MatchHardness = "easy" | "normal" | "hard";

/** Gym-Einheiten mit hoher Systembelastung (für 48h-Regel & Recovery-Ersatz). */
export const HARD_GYM_TYPES: GymType[] = ["push", "pull", "legs", "upper", "lower", "full"];

export interface AthleteProfile {
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  goal: Goal;
  gym_days: number[]; // ISO 0=Mo
  sport_days: number[];
  match_days: number[];
  sport?: string | null;
}

/**
 * Wandelt ein rohes `profiles`-DB-Objekt in den `AthleteProfile`-Typ um.
 * Deckt die drei identischen Mappings aus dashboard/nutrition/plan ab.
 * Numerische Felder kommen aus Supabase als String (NUMERIC) und werden hier
 * defensiv nach Number konvertiert.
 */
type ProfileRowLike = {
  sex?: string | null;
  height_cm?: number | string | null;
  weight_kg?: number | string | null;
  birth_date?: string | null;
  goal?: string | null;
  gym_days?: number[] | null;
  sport_days?: number[] | null;
  match_days?: number[] | null;
  sport?: string | null;
};

export function toAthleteProfile(profile: ProfileRowLike | null | undefined): AthleteProfile {
  return {
    sex: (profile?.sex as Sex | null) ?? null,
    height_cm: profile?.height_cm ? Number(profile.height_cm) : null,
    weight_kg: profile?.weight_kg ? Number(profile.weight_kg) : null,
    birth_date: profile?.birth_date ?? null,
    goal: (profile?.goal as Goal | null) ?? "performance",
    gym_days: profile?.gym_days ?? [],
    sport_days: profile?.sport_days ?? [],
    match_days: profile?.match_days ?? [],
    sport: profile?.sport ?? null,
  };
}

export const SPORT_LABELS: Record<string, string> = {
  football: "Fußball",
  tennis: "Tennis",
  basketball: "Basketball",
  handball: "Handball",
  running: "Laufen",
  other: "Sport",
};

export function sportName(sport?: string | null): string {
  if (!sport) return "Sport";
  return SPORT_LABELS[sport] ?? "Sport";
}

export function sportTrainingLabel(sport?: string | null): string {
  const n = sportName(sport);
  if (sport === "running") return "Lauftraining";
  if (sport === "other") return "Sport-Training";
  return `${n}training`;
}

export function sportTrainingDetail(sport?: string | null): string {
  switch (sport) {
    case "tennis":
      return "Technik, Aufschlag & Bewegung";
    case "basketball":
    case "handball":
      return "Technik, Wurf & Ausdauer";
    case "running":
      return "Ausdauer & Tempo";
    case "football":
      return "Technik & Kondition";
    default:
      return "Training";
  }
}

export interface DailyStat {
  date: string;
  weight_kg: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
}

export interface SportSession {
  id?: string;
  date: string;
  kind: SportKind;
  intensity: Intensity;
  match_hardness?: MatchHardness | null;
  duration_min?: number | null;
}

export interface GymSession {
  date: string;
  session_type: GymType;
  duration_min?: number | null;
}

// ---------- Recovery ----------

export type RecoveryLevel = "green" | "amber" | "red";

export interface RecoveryResult {
  score: number; // 0-100
  level: RecoveryLevel;
  factors: {
    sleep: number;
    quality: number;
    soreness: number;
    stress: number;
    load: number;
  };
}

/** Berechnet Recovery aus letztem daily_stat + Trainings-Load der letzten 72h. */
export function calcRecovery(
  stat: DailyStat | null,
  recentSport: SportSession[],
  recentGym: GymSession[],
): RecoveryResult {
  // Schlaf-Stunden 0..10 → normalisiert. Ideal 8h.
  const h = stat?.sleep_hours ?? 7;
  const sleepScore = Math.max(0, Math.min(1, 1 - Math.abs(h - 8) / 4));

  const q = stat?.sleep_quality ?? 3;
  const qScore = (q - 1) / 4;

  const sor = stat?.soreness ?? 2; // 1 = kein, 5 = extrem
  const sorScore = 1 - (sor - 1) / 4;

  const str = stat?.stress ?? 2;
  const strScore = 1 - (str - 1) / 4;

  // Load: sum(intensitätspunkte) der letzten 72h
  const points =
    recentSport.reduce((s, x) => s + intensityPoints(x.intensity, x.match_hardness), 0) +
    recentGym.reduce((s, x) => s + gymPoints(x.session_type), 0);
  // 0 Punkte → 1, 15+ Punkte → 0
  const loadScore = Math.max(0, Math.min(1, 1 - points / 15));

  const raw = sleepScore * 0.35 + qScore * 0.1 + sorScore * 0.2 + strScore * 0.1 + loadScore * 0.25;

  const score = Math.round(raw * 100);
  const level: RecoveryLevel = score >= 75 ? "green" : score >= 50 ? "amber" : "red";

  return {
    score,
    level,
    factors: {
      sleep: Math.round(sleepScore * 100),
      quality: Math.round(qScore * 100),
      soreness: Math.round(sorScore * 100),
      stress: Math.round(strScore * 100),
      load: Math.round(loadScore * 100),
    },
  };
}

function intensityPoints(i: Intensity, h?: MatchHardness | null): number {
  const base = i === "high" ? 4 : i === "mid" ? 2.5 : 1.2;
  if (h === "hard") return base + 3;
  if (h === "normal") return base + 1.5;
  if (h === "easy") return base + 0.5;
  return base;
}

function gymPoints(t: GymType): number {
  if (t === "legs" || t === "lower" || t === "full") return 4;
  if (t === "push" || t === "pull" || t === "upper") return 3;
  return 1;
}

// ---------- Macros ----------

export interface DailyMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  carbLoading: boolean;
  activityFactor: number;
}

/** Mifflin-St Jeor + Aktivitätsfaktor + Ziel + Carbo-Loading. */
export function calcDailyMacros(
  profile: AthleteProfile,
  ageYears: number | null,
  todaySport: SportSession | undefined,
  todayGym: GymSession | undefined,
  tomorrowMatchHard: boolean,
): DailyMacros {
  const w = profile.weight_kg ?? 75;
  const h = profile.height_cm ?? 178;
  const a = ageYears ?? 25;
  const sexFactor = profile.sex === "female" ? -161 : 5;
  const bmr = 10 * w + 6.25 * h - 5 * a + sexFactor;

  // Aktivitätsfaktor je nach heutigem Load
  let af = 1.4;
  if (todayGym) af += gymPoints(todayGym.session_type) * 0.04;
  if (todaySport) {
    af +=
      todaySport.kind === "match"
        ? 0.35
        : todaySport.intensity === "high"
          ? 0.25
          : todaySport.intensity === "mid"
            ? 0.15
            : 0.08;
  }
  af = Math.min(2.1, af);

  let kcal = bmr * af;
  if (profile.goal === "muscle_gain") kcal *= 1.1;
  else if (profile.goal === "recomp") kcal *= 0.95;
  else if (profile.goal === "performance") kcal *= 1.05;

  const isMatchDay = todaySport?.kind === "match";
  const carbLoading = isMatchDay || tomorrowMatchHard;

  const protein_g = Math.round(2.0 * w);
  const fat_g = Math.round((carbLoading ? 0.8 : 1.0) * w);
  const carbTarget = carbLoading ? Math.round(7.5 * w) : null;

  let carbs_g: number;
  if (carbTarget) {
    // Kcal anpassen, falls zu wenig für Carbs
    const needed = protein_g * 4 + fat_g * 9 + carbTarget * 4;
    kcal = Math.max(kcal, needed);
    carbs_g = carbTarget;
  } else {
    const rest = kcal - (protein_g * 4 + fat_g * 9);
    carbs_g = Math.max(0, Math.round(rest / 4));
  }

  return {
    kcal: Math.round(kcal),
    protein_g,
    carbs_g,
    fat_g,
    carbLoading,
    activityFactor: Number(af.toFixed(2)),
  };
}

// ---------- Week Plan ----------

export interface PlannedSlot {
  date: string;
  dow: number;
  label: string;
  kind: "gym" | "sport" | "match" | "recovery" | "rest";
  detail: string;
  warning?: string;
  hardness?: MatchHardness;
  /** Nur bei kind === "gym": zugrundeliegender Session-Typ (für Regel-Logik). */
  sessionType?: GymType;
  /** true, wenn dieser Slot durch ein manuelles Override überschrieben wurde. */
  overridden?: boolean;
}

/**
 * Manuelle Überschreibung eines Slots (pro Datum). Wird im
 * `weekly_planner.plan.overrides`-JSONB persistiert und mit `applyOverrides`
 * auf den generierten Plan angewandt.
 */
export interface SlotOverride {
  kind: PlannedSlot["kind"];
  sessionType?: GymType;
  label: string;
  detail?: string;
}

/**
 * Wendet manuelle Overrides (per `slot.date`-Key) auf einen generierten Plan an.
 * Reine Funktion – erzeugt eine neue Slot-Liste, ohne Eingaben zu mutieren.
 * Gematchte Slots erhalten die Override-Felder gemerged + `overridden: true`.
 */
export function applyOverrides(
  slots: PlannedSlot[],
  overrides: Record<string, SlotOverride> | null | undefined,
): PlannedSlot[] {
  if (!overrides) return slots.map((s) => ({ ...s }));
  return slots.map((s) => {
    const ov = overrides[s.date];
    if (!ov) return { ...s };
    return {
      ...s,
      kind: ov.kind,
      label: ov.label,
      detail: ov.detail ?? s.detail,
      sessionType: ov.sessionType,
      overridden: true,
    };
  });
}

/**
 * Erzeugt Standard-Wochenplan:
 * - Match an match_days (Sonntag = default hard)
 * - Sport-Training an sport_days (mid)
 * - Gym an gym_days: Push/Pull/Legs-Rotation, aber Beintag NICHT in 48h vor Hard-Match → auto Light/Mobility
 * - Freie Tage = Rest oder Active Recovery bei niedrigem Score.
 */
export function generateWeekPlan(
  profile: AthleteProfile,
  weekStart: Date,
  matchHardness: Record<number, MatchHardness> = {},
  recoveryScore: number | null = null,
): PlannedSlot[] {
  const slots: PlannedSlot[] = [];
  const gymRotation: GymType[] = ["push", "pull", "legs"];
  let gymIdx = 0;

  // 1) Basis füllen
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dow = isoDow(date);
    const iso = toISODate(date);

    if (profile.match_days.includes(dow)) {
      const h = matchHardness[dow] ?? "normal";
      slots.push({
        date: iso,
        dow,
        label: h === "hard" ? "Spiel (hart)" : "Spiel",
        kind: "match",
        detail: h === "hard" ? "Volle Intensität" : "Wettkampf",
        hardness: h,
      });
      continue;
    }
    if (profile.sport_days.includes(dow)) {
      slots.push({
        date: iso,
        dow,
        label: sportTrainingLabel(profile.sport),
        kind: "sport",
        detail: sportTrainingDetail(profile.sport),
      });
      continue;
    }
    if (profile.gym_days.includes(dow)) {
      const type = gymRotation[gymIdx % gymRotation.length];
      gymIdx++;
      slots.push({
        date: iso,
        dow,
        label: labelForGym(type),
        kind: "gym",
        detail: gymDetail(type),
        sessionType: type,
      });
      continue;
    }
    slots.push({
      date: iso,
      dow,
      label: "Ruhetag",
      kind: "rest",
      detail: "Erholung",
    });
  }

  // 2) 48h-Regel: kein Legs vor hartem Spiel
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.kind === "match" && s.hardness === "hard") {
      for (let back = 1; back <= 2; back++) {
        const j = i - back;
        if (j < 0) continue;
        const prev = slots[j];
        if (prev.kind === "gym" && (prev.sessionType === "legs" || prev.sessionType === "lower")) {
          slots[j] = {
            ...prev,
            label: "Light Upper / Mobility",
            detail: "Beine schonen – kein Legs 48h vor Spiel",
            warning: "Ursprünglich Beintraining – wegen Spiel verschoben",
            sessionType: "light",
          };
        }
      }
    }
  }

  // 3) Carbo-Loading Hinweis am Vortag eines harten Spiels
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.kind === "match" && s.hardness === "hard" && i > 0) {
      const prev = slots[i - 1];
      slots[i - 1] = {
        ...prev,
        warning: (prev.warning ? prev.warning + " · " : "") + "Carbo-Loading empfohlen",
      };
    }
  }

  // 4) Recovery niedrig → erste harte Gym-Einheit → Active Recovery
  if (recoveryScore !== null && recoveryScore < 50) {
    const idx = slots.findIndex(
      (s) =>
        s.kind === "gym" && s.sessionType !== undefined && HARD_GYM_TYPES.includes(s.sessionType),
    );
    if (idx !== -1) {
      slots[idx] = {
        ...slots[idx],
        label: "Active Recovery",
        kind: "recovery",
        detail: "Mobility, Stretching, Zone-1 20 min",
        warning: "Recovery-Score niedrig – harte Einheit ersetzt",
        sessionType: "mobility",
      };
    }
  }

  return slots;
}

function labelForGym(t: GymType): string {
  const map: Record<GymType, string> = {
    push: "Gym · Push",
    pull: "Gym · Pull",
    legs: "Gym · Beine",
    upper: "Gym · Oberkörper",
    lower: "Gym · Unterkörper",
    full: "Gym · Ganzkörper",
    light: "Light Session",
    mobility: "Mobility",
  };
  return map[t];
}

function gymDetail(t: GymType): string {
  const map: Record<GymType, string> = {
    push: "Brust · Schulter · Trizeps",
    pull: "Rücken · Bizeps",
    legs: "Beine · Glutes · Core",
    upper: "Oberkörper leicht",
    lower: "Unterkörper leicht",
    full: "Ganzkörper",
    light: "Locker halten",
    mobility: "Beweglichkeit & Faszien",
  };
  return map[t];
}
