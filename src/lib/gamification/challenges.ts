// Gamification – Phase 4: Challenge-Katalog (clientseitig).
// Fortschritt/Status/XP kommen aus der RPC public.sync_my_challenges();
// hier leben nur Titel, Beschreibungen, Icons und Anzeige-Formatierung.
// Die keys MUESSEN mit dem Seed in 20260921170000_challenges.sql uebereinstimmen.

import type { Locale } from "@/lib/i18n";

export type Difficulty = "easy" | "medium" | "hard" | "epic";
export type ChallengeScope = "monthly" | "yearly" | "seasonal";
export type ChallengeMetric =
  | "gym_sessions"
  | "sport_sessions"
  | "endurance_km"
  | "total_volume_kg"
  | "checkins"
  | "active_days"
  | "total_sessions"
  | "swim_km"
  | "run_km"
  | "interval_sessions"
  | "steps";

export type Focus = "swim" | "run" | "intervals" | "strength";

/** Eine Zeile wie sie sync_my_challenges() zurueckgibt. */
export interface ChallengeRow {
  key: string;
  scope: ChallengeScope;
  category: string;
  difficulty: Difficulty;
  xp_reward: number;
  metric: ChallengeMetric | null;
  target_value: number | null;
  progress_value: number;
  status: "active" | "completed" | "expired";
  period_start: string;
  confirmed_manually: boolean;
  focus: Focus | null;
}

export interface ChallengeDef {
  key: string;
  icon: string; // lucide-Name
  title: Record<Locale, string>;
  desc: Record<Locale, string>;
}

export const DIFFICULTY_META: Record<
  Difficulty,
  { color: string; accent: string; label: Record<Locale, string> }
> = {
  easy: { color: "#38a169", accent: "#68d391", label: { de: "Leicht", en: "Easy", uk: "Легко" } },
  medium: {
    color: "#d69e2e",
    accent: "#ecc94b",
    label: { de: "Mittel", en: "Medium", uk: "Середньо" },
  },
  hard: { color: "#e0533a", accent: "#f2946f", label: { de: "Schwer", en: "Hard", uk: "Важко" } },
  epic: { color: "#8b5cf6", accent: "#b794f6", label: { de: "Episch", en: "Epic", uk: "Епічно" } },
};

/** Meta fuer den saisonalen Fokus (kommt aus der Spalte focus der RPC). */
export const FOCUS_META: Record<
  Focus,
  { icon: string; color: string; label: Record<Locale, string> }
> = {
  swim: {
    icon: "Waves",
    color: "#2b9fd6",
    label: { de: "Schwimmen", en: "Swimming", uk: "Плавання" },
  },
  run: {
    icon: "Footprints",
    color: "#2fa9a0",
    label: { de: "Ausdauerlauf", en: "Endurance Run", uk: "Біг" },
  },
  intervals: {
    icon: "Zap",
    color: "#d69e2e",
    label: { de: "Intervalle & Schritte", en: "Intervals & Steps", uk: "Інтервали і кроки" },
  },
  strength: {
    icon: "Dumbbell",
    color: "#e0384f",
    label: { de: "Kraftsport", en: "Strength", uk: "Силові" },
  },
};

export const CHALLENGES: ChallengeDef[] = [
  {
    key: "m_gym_12",
    icon: "Dumbbell",
    title: { de: "12 Gym-Einheiten", en: "12 Gym Sessions", uk: "12 тренувань у залі" },
    desc: {
      de: "Absolviere 12 Kraft-Einheiten diesen Monat.",
      en: "Complete 12 strength sessions this month.",
      uk: "Виконай 12 силових тренувань цього місяця.",
    },
  },
  {
    key: "m_run_50",
    icon: "Footprints",
    title: { de: "50 km Ausdauer", en: "50 km Endurance", uk: "50 км витривалості" },
    desc: {
      de: "Sammle 50 km Ausdauer-Distanz diesen Monat.",
      en: "Cover 50 km of endurance distance this month.",
      uk: "Здолай 50 км витривалості цього місяця.",
    },
  },
  {
    key: "m_sport_8",
    icon: "Trophy",
    title: { de: "8 Sport-Einheiten", en: "8 Sport Sessions", uk: "8 спортивних тренувань" },
    desc: {
      de: "Logge 8 Fußball-/Sport-Einheiten diesen Monat.",
      en: "Log 8 football/sport sessions this month.",
      uk: "Запиши 8 футбольних/спортивних тренувань цього місяця.",
    },
  },
  {
    key: "m_active_20",
    icon: "CalendarCheck",
    title: { de: "20 aktive Tage", en: "20 Active Days", uk: "20 активних днів" },
    desc: {
      de: "Sei an 20 Tagen diesen Monat aktiv.",
      en: "Be active on 20 days this month.",
      uk: "Будь активним 20 днів цього місяця.",
    },
  },
  {
    key: "m_volume_40t",
    icon: "Weight",
    title: { de: "40 t Volumen", en: "40 t Volume", uk: "40 т об'єму" },
    desc: {
      de: "Bewege 40 Tonnen Gesamtvolumen im Kraftraum.",
      en: "Move 40 tonnes of total gym volume.",
      uk: "Переміщено 40 тонн загального об'єму.",
    },
  },
  {
    key: "m_checkin_10",
    icon: "HeartPulse",
    title: { de: "10 Check-ins", en: "10 Check-ins", uk: "10 чек-інів" },
    desc: {
      de: "Erfasse 10 tägliche Check-ins diesen Monat.",
      en: "Log 10 daily check-ins this month.",
      uk: "Зафіксуй 10 щоденних чек-інів цього місяця.",
    },
  },
  {
    key: "m_pr",
    icon: "Medal",
    title: { de: "Neue Bestleistung", en: "New Personal Best", uk: "Новий рекорд" },
    desc: {
      de: "Stelle diesen Monat eine neue Kraft-Bestleistung auf (selbst bestätigen).",
      en: "Set a new strength PB this month (self-confirm).",
      uk: "Встанови новий силовий рекорд цього місяця (підтвердь сам).",
    },
  },
  {
    key: "y_sessions_150",
    icon: "Flame",
    title: { de: "150 Einheiten", en: "150 Sessions", uk: "150 тренувань" },
    desc: {
      de: "Absolviere 150 Trainingseinheiten dieses Jahr.",
      en: "Complete 150 training sessions this year.",
      uk: "Виконай 150 тренувань цього року.",
    },
  },
  {
    key: "y_endurance_1000",
    icon: "Footprints",
    title: { de: "1000 km Ausdauer", en: "1000 km Endurance", uk: "1000 км витривалості" },
    desc: {
      de: "Sammle 1000 km Ausdauer-Distanz dieses Jahr.",
      en: "Cover 1000 km of endurance distance this year.",
      uk: "Здолай 1000 км витривалості цього року.",
    },
  },
  {
    key: "y_active_250",
    icon: "CalendarCheck",
    title: { de: "250 aktive Tage", en: "250 Active Days", uk: "250 активних днів" },
    desc: {
      de: "Sei an 250 Tagen dieses Jahr aktiv.",
      en: "Be active on 250 days this year.",
      uk: "Будь активним 250 днів цього року.",
    },
  },
  {
    key: "ss_swim_20",
    icon: "Waves",
    title: { de: "20 km Schwimmen", en: "20 km Swimming", uk: "20 км плавання" },
    desc: {
      de: "Schwimme 20 km diese Saison.",
      en: "Swim 20 km this season.",
      uk: "Пропливи 20 км цього сезону.",
    },
  },
  {
    key: "ss_swim_40",
    icon: "Waves",
    title: { de: "40 km Schwimmen", en: "40 km Swimming", uk: "40 км плавання" },
    desc: {
      de: "Schwimme 40 km diese Saison.",
      en: "Swim 40 km this season.",
      uk: "Пропливи 40 км цього сезону.",
    },
  },
  {
    key: "ss_run_100",
    icon: "Footprints",
    title: { de: "100 km Laufen", en: "100 km Running", uk: "100 км бігу" },
    desc: {
      de: "Laufe 100 km diese Saison.",
      en: "Run 100 km this season.",
      uk: "Пробіжи 100 км цього сезону.",
    },
  },
  {
    key: "ss_run_200",
    icon: "Footprints",
    title: { de: "200 km Laufen", en: "200 km Running", uk: "200 км бігу" },
    desc: {
      de: "Laufe 200 km diese Saison.",
      en: "Run 200 km this season.",
      uk: "Пробіжи 200 км цього сезону.",
    },
  },
  {
    key: "ss_interval_12",
    icon: "Zap",
    title: {
      de: "12 Intervall-Einheiten",
      en: "12 Interval Sessions",
      uk: "12 інтервальних тренувань",
    },
    desc: {
      de: "Absolviere 12 Intervall-Einheiten diese Saison.",
      en: "Complete 12 interval sessions this season.",
      uk: "Виконай 12 інтервальних тренувань цього сезону.",
    },
  },
  {
    key: "ss_steps_500k",
    icon: "Activity",
    title: { de: "500.000 Schritte", en: "500,000 Steps", uk: "500 000 кроків" },
    desc: {
      de: "Sammle 500.000 Schritte diese Saison.",
      en: "Collect 500,000 steps this season.",
      uk: "Назбирай 500 000 кроків цього сезону.",
    },
  },
  {
    key: "ss_interval_manual",
    icon: "Timer",
    title: {
      de: "Intervall-Ziel (selbst bestätigen)",
      en: "Interval Goal (self-confirm)",
      uk: "Інтервальна ціль (підтвердь сам)",
    },
    desc: {
      de: "Erreiche dein Intervall-Ziel diese Saison (selbst bestätigen).",
      en: "Reach your interval goal this season (self-confirm).",
      uk: "Досягни своєї інтервальної цілі цього сезону (підтвердь сам).",
    },
  },
  {
    key: "ss_gym_24",
    icon: "Dumbbell",
    title: { de: "24 Gym-Einheiten", en: "24 Gym Sessions", uk: "24 тренування у залі" },
    desc: {
      de: "Absolviere 24 Gym-Einheiten diese Saison.",
      en: "Complete 24 gym sessions this season.",
      uk: "Виконай 24 тренування у залі цього сезону.",
    },
  },
  {
    key: "ss_volume_60t",
    icon: "Weight",
    title: { de: "60 t Volumen", en: "60 t Volume", uk: "60 т об'єму" },
    desc: {
      de: "Bewege 60 Tonnen Gesamtvolumen diese Saison.",
      en: "Move 60 tonnes of total volume this season.",
      uk: "Перемісти 60 тонн загального об'єму цього сезону.",
    },
  },
];

export const CHALLENGE_BY_KEY: Record<string, ChallengeDef> = Object.fromEntries(
  CHALLENGES.map((c) => [c.key, c]),
);

/** Formatiert Fortschritts-/Zielwerte je Metrik fuer die Anzeige. */
export function formatChallengeValue(metric: ChallengeMetric | null, value: number): string {
  const v = Math.max(0, value || 0);
  switch (metric) {
    case "endurance_km":
    case "swim_km":
    case "run_km":
      return `${Math.round(v)} km`;
    case "total_volume_kg":
      return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} t` : `${Math.round(v)} kg`;
    case "steps":
      return v >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`;
    default:
      return `${Math.round(v)}`;
  }
}
