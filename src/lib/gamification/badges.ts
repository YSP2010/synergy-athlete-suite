// Gamification – Phase 3: Badge-Katalog (clientseitig).
// Die verdienten Badges liegen in public.user_badges; sync_my_badges()
// vergibt sie aus den Trainingsdaten. Hier leben nur Namen, Kategorien
// und mehrsprachige Beschreibungen – die badge_key-Werte MUESSEN mit der
// Migration 20260921150000_badges.sql uebereinstimmen.

import type { Locale } from "@/lib/i18n";

export type BadgeCategory = "milestone" | "strength" | "endurance" | "consistency" | "special";

export interface BadgeDef {
  key: string;
  category: BadgeCategory;
  /** Fuer die farbliche Abstufung innerhalb einer Kategorie (0 = Einstieg). */
  weight: number;
  title: Record<Locale, string>;
  desc: Record<Locale, string>;
}

export interface CategoryMeta {
  /** lucide-react Icon-Name (im Grid gemappt). */
  icon: string;
  color: string;
  accent: string;
  label: Record<Locale, string>;
}

export const BADGE_CATEGORIES: BadgeCategory[] = [
  "milestone",
  "strength",
  "endurance",
  "consistency",
  "special",
];

export const CATEGORY_META: Record<BadgeCategory, CategoryMeta> = {
  milestone: {
    icon: "Flag",
    color: "#8b5cf6",
    accent: "#b794f6",
    label: { de: "Meilensteine", en: "Milestones", uk: "Віхи" },
  },
  strength: {
    icon: "Dumbbell",
    color: "#e0384f",
    accent: "#f5808f",
    label: { de: "Kraft", en: "Strength", uk: "Сила" },
  },
  endurance: {
    icon: "Footprints",
    color: "#2fa9a0",
    accent: "#6fd6cd",
    label: { de: "Ausdauer", en: "Endurance", uk: "Витривалість" },
  },
  consistency: {
    icon: "Flame",
    color: "#e0834a",
    accent: "#f5b183",
    label: { de: "Konstanz", en: "Consistency", uk: "Постійність" },
  },
  special: {
    icon: "Sparkles",
    color: "#4f83d6",
    accent: "#8fb4f0",
    label: { de: "Spezial", en: "Special", uk: "Особливі" },
  },
};

const bench = (kg: number, w: number): BadgeDef => ({
  key: `bench_${kg}`,
  category: "strength",
  weight: w,
  title: { de: `Bankdrücken ${kg} kg`, en: `Bench Press ${kg} kg`, uk: `Жим лежачи ${kg} кг` },
  desc: {
    de: `Drücke ${kg} kg auf der Bank.`,
    en: `Bench press ${kg} kg.`,
    uk: `Вижми ${kg} кг лежачи.`,
  },
});

const squat = (kg: number, w: number): BadgeDef => ({
  key: `squat_${kg}`,
  category: "strength",
  weight: w,
  title: { de: `Kniebeuge ${kg} kg`, en: `Squat ${kg} kg`, uk: `Присідання ${kg} кг` },
  desc: { de: `Beuge ${kg} kg.`, en: `Squat ${kg} kg.`, uk: `Присядь з ${kg} кг.` },
});

const dead = (kg: number, w: number): BadgeDef => ({
  key: `deadlift_${kg}`,
  category: "strength",
  weight: w,
  title: { de: `Kreuzheben ${kg} kg`, en: `Deadlift ${kg} kg`, uk: `Станова тяга ${kg} кг` },
  desc: { de: `Hebe ${kg} kg.`, en: `Deadlift ${kg} kg.`, uk: `Підійми ${kg} кг.` },
});

export const BADGES: BadgeDef[] = [
  // --- Meilensteine (Sessions) ---
  {
    key: "first_workout",
    category: "milestone",
    weight: 0,
    title: { de: "Erster Schritt", en: "First Step", uk: "Перший крок" },
    desc: {
      de: "Schließe dein erstes Training ab.",
      en: "Complete your first workout.",
      uk: "Заверши перше тренування.",
    },
  },
  {
    key: "sessions_10",
    category: "milestone",
    weight: 1,
    title: { de: "10 Einheiten", en: "10 Sessions", uk: "10 тренувань" },
    desc: {
      de: "10 Trainings absolviert.",
      en: "Completed 10 sessions.",
      uk: "10 тренувань виконано.",
    },
  },
  {
    key: "sessions_50",
    category: "milestone",
    weight: 2,
    title: { de: "50 Einheiten", en: "50 Sessions", uk: "50 тренувань" },
    desc: {
      de: "50 Trainings absolviert.",
      en: "Completed 50 sessions.",
      uk: "50 тренувань виконано.",
    },
  },
  {
    key: "sessions_100",
    category: "milestone",
    weight: 3,
    title: { de: "100 Einheiten", en: "100 Sessions", uk: "100 тренувань" },
    desc: {
      de: "100 Trainings absolviert.",
      en: "Completed 100 sessions.",
      uk: "100 тренувань виконано.",
    },
  },
  {
    key: "sessions_250",
    category: "milestone",
    weight: 4,
    title: { de: "250 Einheiten", en: "250 Sessions", uk: "250 тренувань" },
    desc: {
      de: "250 Trainings absolviert.",
      en: "Completed 250 sessions.",
      uk: "250 тренувань виконано.",
    },
  },
  // --- Kraft ---
  bench(60, 0),
  bench(80, 1),
  bench(100, 2),
  bench(120, 3),
  bench(140, 4),
  bench(160, 5),
  bench(180, 6),
  bench(200, 7),
  squat(100, 2),
  squat(140, 4),
  squat(180, 6),
  dead(120, 3),
  dead(180, 5),
  dead(220, 7),
  {
    key: "tonnage_100t",
    category: "strength",
    weight: 4,
    title: { de: "100 Tonnen", en: "100 Tonnes", uk: "100 тонн" },
    desc: {
      de: "100 t Gesamtvolumen im Gym bewegt.",
      en: "Moved 100 t of total gym volume.",
      uk: "Переміщено 100 т загального об'єму.",
    },
  },
  {
    key: "tonnage_500t",
    category: "strength",
    weight: 7,
    title: { de: "500 Tonnen", en: "500 Tonnes", uk: "500 тонн" },
    desc: {
      de: "500 t Gesamtvolumen im Gym bewegt.",
      en: "Moved 500 t of total gym volume.",
      uk: "Переміщено 500 т загального об'єму.",
    },
  },
  // --- Ausdauer ---
  {
    key: "half_marathon",
    category: "endurance",
    weight: 2,
    title: { de: "Halbmarathon", en: "Half Marathon", uk: "Напівмарафон" },
    desc: {
      de: "Eine Aktivität über 21,1 km.",
      en: "A single activity over 21.1 km.",
      uk: "Активність понад 21,1 км.",
    },
  },
  {
    key: "marathon",
    category: "endurance",
    weight: 4,
    title: { de: "Marathon", en: "Marathon", uk: "Марафон" },
    desc: {
      de: "Eine Aktivität über 42,2 km.",
      en: "A single activity over 42.2 km.",
      uk: "Активність понад 42,2 км.",
    },
  },
  {
    key: "ultra",
    category: "endurance",
    weight: 6,
    title: { de: "Ultra", en: "Ultra", uk: "Ультра" },
    desc: {
      de: "Eine Aktivität über 50 km.",
      en: "A single activity over 50 km.",
      uk: "Активність понад 50 км.",
    },
  },
  {
    key: "dist_100",
    category: "endurance",
    weight: 1,
    title: { de: "100 km gesamt", en: "100 km Total", uk: "100 км разом" },
    desc: {
      de: "100 km Gesamtstrecke.",
      en: "100 km total distance.",
      uk: "100 км загальної дистанції.",
    },
  },
  {
    key: "dist_500",
    category: "endurance",
    weight: 3,
    title: { de: "500 km gesamt", en: "500 km Total", uk: "500 км разом" },
    desc: {
      de: "500 km Gesamtstrecke.",
      en: "500 km total distance.",
      uk: "500 км загальної дистанції.",
    },
  },
  {
    key: "dist_1000",
    category: "endurance",
    weight: 5,
    title: { de: "1000 km gesamt", en: "1000 km Total", uk: "1000 км разом" },
    desc: {
      de: "1000 km Gesamtstrecke.",
      en: "1000 km total distance.",
      uk: "1000 км загальної дистанції.",
    },
  },
  // --- Konstanz ---
  {
    key: "streak_7",
    category: "consistency",
    weight: 1,
    title: { de: "7-Tage-Serie", en: "7-Day Streak", uk: "Серія 7 днів" },
    desc: {
      de: "7 Tage in Folge aktiv.",
      en: "Active 7 days in a row.",
      uk: "Активність 7 днів поспіль.",
    },
  },
  {
    key: "streak_30",
    category: "consistency",
    weight: 3,
    title: { de: "30-Tage-Serie", en: "30-Day Streak", uk: "Серія 30 днів" },
    desc: {
      de: "30 Tage in Folge aktiv.",
      en: "Active 30 days in a row.",
      uk: "Активність 30 днів поспіль.",
    },
  },
  {
    key: "streak_100",
    category: "consistency",
    weight: 6,
    title: { de: "100-Tage-Serie", en: "100-Day Streak", uk: "Серія 100 днів" },
    desc: {
      de: "100 Tage in Folge aktiv.",
      en: "Active 100 days in a row.",
      uk: "Активність 100 днів поспіль.",
    },
  },
  {
    key: "checkin_30",
    category: "consistency",
    weight: 2,
    title: { de: "30 Check-ins", en: "30 Check-ins", uk: "30 чек-інів" },
    desc: {
      de: "30 tägliche Check-ins erfasst.",
      en: "Logged 30 daily check-ins.",
      uk: "Зафіксовано 30 щоденних чек-інів.",
    },
  },
  // --- Spezial ---
  {
    key: "hybrid_week",
    category: "special",
    weight: 5,
    title: { de: "Hybrid-Woche", en: "Hybrid Week", uk: "Гібридний тиждень" },
    desc: {
      de: "Gym, Sport und Ausdauer in derselben Woche.",
      en: "Gym, sport and endurance in the same week.",
      uk: "Зал, спорт і витривалість за один тиждень.",
    },
  },
  {
    key: "football_match",
    category: "special",
    weight: 2,
    title: { de: "Anpfiff", en: "Kickoff", uk: "Стартовий свисток" },
    desc: {
      de: "Erstes Fußballspiel erfasst.",
      en: "Logged your first football match.",
      uk: "Зафіксовано перший футбольний матч.",
    },
  },
];

export const BADGE_BY_KEY: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.key, b]),
);

/** Farbverlauf innerhalb einer Kategorie: Accent (leicht) -> Color (schwer). */
export function badgeTierColor(cat: BadgeCategory, weight: number): string {
  const maxW = Math.max(...BADGES.filter((b) => b.category === cat).map((b) => b.weight), 1);
  const meta = CATEGORY_META[cat];
  return weight >= maxW * 0.66 ? meta.color : meta.accent;
}
