// Gamification – Phase 4: Challenge-Katalog (clientseitig).
// Fortschritt/Status/XP kommen aus der RPC public.sync_my_challenges();
// hier leben nur Titel, Beschreibungen, Icons und Anzeige-Formatierung.
// Die keys MUESSEN mit dem Seed in 20260921170000_challenges.sql uebereinstimmen.

import type { Locale } from "@/lib/i18n";

export type Difficulty = "easy" | "medium" | "hard" | "epic";
export type ChallengeScope = "monthly" | "yearly";
export type ChallengeMetric =
  | "gym_sessions"
  | "sport_sessions"
  | "endurance_km"
  | "total_volume_kg"
  | "checkins"
  | "active_days"
  | "total_sessions";

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
];

export const CHALLENGE_BY_KEY: Record<string, ChallengeDef> = Object.fromEntries(
  CHALLENGES.map((c) => [c.key, c]),
);

/** Formatiert Fortschritts-/Zielwerte je Metrik fuer die Anzeige. */
export function formatChallengeValue(metric: ChallengeMetric | null, value: number): string {
  const v = Math.max(0, value || 0);
  switch (metric) {
    case "endurance_km":
      return `${Math.round(v)} km`;
    case "total_volume_kg":
      return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)} t` : `${Math.round(v)} kg`;
    default:
      return `${Math.round(v)}`;
  }
}
