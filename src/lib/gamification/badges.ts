// Gamification – Badge-Katalog (clientseitig, 73 Badges / 12 Kategorien).
// Die verdienten Badges liegen in public.user_badges; sync_my_badges()
// vergibt sie aus den Trainingsdaten. Die badge_key-Werte MUESSEN mit den
// Migrationen 20260921150000_badges.sql + 20260921160000_badges_more.sql
// uebereinstimmen.

import type { Locale } from "@/lib/i18n";

export type BadgeCategory =
  | "milestone"
  | "strength"
  | "endurance"
  | "tempo"
  | "climbing"
  | "calories"
  | "intensity"
  | "consistency"
  | "lifestyle"
  | "variety"
  | "recovery"
  | "special";

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
  "tempo",
  "climbing",
  "calories",
  "intensity",
  "consistency",
  "lifestyle",
  "variety",
  "recovery",
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
  tempo: {
    icon: "Timer",
    color: "#d69e2e",
    accent: "#ecc94b",
    label: { de: "Tempo", en: "Pace", uk: "Темп" },
  },
  climbing: {
    icon: "Mountain",
    color: "#8a6d3b",
    accent: "#b8935a",
    label: { de: "Höhenmeter", en: "Climbing", uk: "Набір висоти" },
  },
  calories: {
    icon: "Zap",
    color: "#e0533a",
    accent: "#f2946f",
    label: { de: "Kalorien", en: "Calories", uk: "Калорії" },
  },
  intensity: {
    icon: "HeartPulse",
    color: "#d53f8c",
    accent: "#ed64a6",
    label: { de: "Intensität", en: "Intensity", uk: "Інтенсивність" },
  },
  consistency: {
    icon: "Flame",
    color: "#e0834a",
    accent: "#f5b183",
    label: { de: "Konstanz", en: "Consistency", uk: "Постійність" },
  },
  lifestyle: {
    icon: "Clock",
    color: "#6b46c1",
    accent: "#9f7aea",
    label: { de: "Lifestyle", en: "Lifestyle", uk: "Стиль життя" },
  },
  variety: {
    icon: "Layers",
    color: "#38a169",
    accent: "#68d391",
    label: { de: "Vielseitigkeit", en: "Variety", uk: "Різнобічність" },
  },
  recovery: {
    icon: "Moon",
    color: "#4c51bf",
    accent: "#7f9cf5",
    label: { de: "Erholung", en: "Recovery", uk: "Відновлення" },
  },
  special: {
    icon: "Sparkles",
    color: "#4f83d6",
    accent: "#8fb4f0",
    label: { de: "Spezial", en: "Special", uk: "Особливі" },
  },
};

export const BADGES: BadgeDef[] = [
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
  {
    key: "bench_60",
    category: "strength",
    weight: 0,
    title: { de: "Bankdrücken 60 kg", en: "Bench Press 60 kg", uk: "Жим лежачи 60 кг" },
    desc: { de: "Drücke 60 kg auf der Bank.", en: "Bench press 60 kg.", uk: "Вижми 60 кг лежачи." },
  },
  {
    key: "bench_80",
    category: "strength",
    weight: 1,
    title: { de: "Bankdrücken 80 kg", en: "Bench Press 80 kg", uk: "Жим лежачи 80 кг" },
    desc: { de: "Drücke 80 kg auf der Bank.", en: "Bench press 80 kg.", uk: "Вижми 80 кг лежачи." },
  },
  {
    key: "bench_100",
    category: "strength",
    weight: 2,
    title: { de: "Bankdrücken 100 kg", en: "Bench Press 100 kg", uk: "Жим лежачи 100 кг" },
    desc: {
      de: "Drücke 100 kg auf der Bank.",
      en: "Bench press 100 kg.",
      uk: "Вижми 100 кг лежачи.",
    },
  },
  {
    key: "bench_120",
    category: "strength",
    weight: 3,
    title: { de: "Bankdrücken 120 kg", en: "Bench Press 120 kg", uk: "Жим лежачи 120 кг" },
    desc: {
      de: "Drücke 120 kg auf der Bank.",
      en: "Bench press 120 kg.",
      uk: "Вижми 120 кг лежачи.",
    },
  },
  {
    key: "bench_140",
    category: "strength",
    weight: 4,
    title: { de: "Bankdrücken 140 kg", en: "Bench Press 140 kg", uk: "Жим лежачи 140 кг" },
    desc: {
      de: "Drücke 140 kg auf der Bank.",
      en: "Bench press 140 kg.",
      uk: "Вижми 140 кг лежачи.",
    },
  },
  {
    key: "bench_160",
    category: "strength",
    weight: 5,
    title: { de: "Bankdrücken 160 kg", en: "Bench Press 160 kg", uk: "Жим лежачи 160 кг" },
    desc: {
      de: "Drücke 160 kg auf der Bank.",
      en: "Bench press 160 kg.",
      uk: "Вижми 160 кг лежачи.",
    },
  },
  {
    key: "bench_180",
    category: "strength",
    weight: 6,
    title: { de: "Bankdrücken 180 kg", en: "Bench Press 180 kg", uk: "Жим лежачи 180 кг" },
    desc: {
      de: "Drücke 180 kg auf der Bank.",
      en: "Bench press 180 kg.",
      uk: "Вижми 180 кг лежачи.",
    },
  },
  {
    key: "bench_200",
    category: "strength",
    weight: 7,
    title: { de: "Bankdrücken 200 kg", en: "Bench Press 200 kg", uk: "Жим лежачи 200 кг" },
    desc: {
      de: "Drücke 200 kg auf der Bank.",
      en: "Bench press 200 kg.",
      uk: "Вижми 200 кг лежачи.",
    },
  },
  {
    key: "squat_100",
    category: "strength",
    weight: 2,
    title: { de: "Kniebeuge 100 kg", en: "Squat 100 kg", uk: "Присідання 100 кг" },
    desc: { de: "Beuge 100 kg.", en: "Squat 100 kg.", uk: "Присядь з 100 кг." },
  },
  {
    key: "squat_140",
    category: "strength",
    weight: 4,
    title: { de: "Kniebeuge 140 kg", en: "Squat 140 kg", uk: "Присідання 140 кг" },
    desc: { de: "Beuge 140 kg.", en: "Squat 140 kg.", uk: "Присядь з 140 кг." },
  },
  {
    key: "squat_180",
    category: "strength",
    weight: 6,
    title: { de: "Kniebeuge 180 kg", en: "Squat 180 kg", uk: "Присідання 180 кг" },
    desc: { de: "Beuge 180 kg.", en: "Squat 180 kg.", uk: "Присядь з 180 кг." },
  },
  {
    key: "deadlift_120",
    category: "strength",
    weight: 3,
    title: { de: "Kreuzheben 120 kg", en: "Deadlift 120 kg", uk: "Станова тяга 120 кг" },
    desc: { de: "Hebe 120 kg.", en: "Deadlift 120 kg.", uk: "Підійми 120 кг." },
  },
  {
    key: "deadlift_180",
    category: "strength",
    weight: 5,
    title: { de: "Kreuzheben 180 kg", en: "Deadlift 180 kg", uk: "Станова тяга 180 кг" },
    desc: { de: "Hebe 180 kg.", en: "Deadlift 180 kg.", uk: "Підійми 180 кг." },
  },
  {
    key: "deadlift_220",
    category: "strength",
    weight: 7,
    title: { de: "Kreuzheben 220 kg", en: "Deadlift 220 kg", uk: "Станова тяга 220 кг" },
    desc: { de: "Hebe 220 kg.", en: "Deadlift 220 kg.", uk: "Підійми 220 кг." },
  },
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
  {
    key: "big_three_400",
    category: "strength",
    weight: 5,
    title: { de: "Kraftpaket", en: "Powerpack", uk: "Силовий пакет" },
    desc: {
      de: "Bank + Kniebeuge + Kreuzheben zusammen ≥ 400 kg.",
      en: "Bench + squat + deadlift total ≥ 400 kg.",
      uk: "Жим + присід + тяга разом ≥ 400 кг.",
    },
  },
  {
    key: "big_three_500",
    category: "strength",
    weight: 7,
    title: { de: "Powerhouse", en: "Powerhouse", uk: "Потужність" },
    desc: {
      de: "Kraftdreikampf-Summe ≥ 500 kg.",
      en: "Powerlifting total ≥ 500 kg.",
      uk: "Сума трьох вправ ≥ 500 кг.",
    },
  },
  {
    key: "daily_volume_10t",
    category: "strength",
    weight: 5,
    title: { de: "Schwerarbeiter", en: "Heavy Lifter", uk: "Важкоатлет" },
    desc: {
      de: "10 t Volumen an einem einzigen Gym-Tag.",
      en: "10 t of volume in a single gym day.",
      uk: "10 т об'єму за один день у залі.",
    },
  },
  {
    key: "sets_500",
    category: "strength",
    weight: 4,
    title: { de: "Satz-Sammler", en: "Set Collector", uk: "Колекціонер підходів" },
    desc: {
      de: "500 Sätze insgesamt absolviert.",
      en: "Completed 500 sets in total.",
      uk: "Виконано 500 підходів загалом.",
    },
  },
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
    key: "long_run_15",
    category: "endurance",
    weight: 2,
    title: { de: "Dauerläufer", en: "Distance Runner", uk: "Стаєр" },
    desc: {
      de: "15 km am Stück gelaufen.",
      en: "Ran 15 km in one go.",
      uk: "Пробіг 15 км поспіль.",
    },
  },
  {
    key: "gran_fondo",
    category: "endurance",
    weight: 5,
    title: { de: "Gran Fondo", en: "Gran Fondo", uk: "Гран Фондо" },
    desc: {
      de: "100 km Rad am Stück.",
      en: "100 km cycling in one ride.",
      uk: "100 км на велосипеді поспіль.",
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
    weight: 4,
    title: { de: "1000 km gesamt", en: "1000 km Total", uk: "1000 км разом" },
    desc: {
      de: "1000 km Gesamtstrecke.",
      en: "1000 km total distance.",
      uk: "1000 км загальної дистанції.",
    },
  },
  {
    key: "dist_2500",
    category: "endurance",
    weight: 5,
    title: { de: "Langstrecke", en: "Long Hauler", uk: "Далекобійник" },
    desc: {
      de: "2500 km Gesamtstrecke.",
      en: "2500 km total distance.",
      uk: "2500 км загальної дистанції.",
    },
  },
  {
    key: "dist_5000",
    category: "endurance",
    weight: 7,
    title: { de: "Weltenbummler", en: "Globetrotter", uk: "Мандрівник" },
    desc: {
      de: "5000 km Gesamtstrecke.",
      en: "5000 km total distance.",
      uk: "5000 км загальної дистанції.",
    },
  },
  {
    key: "hours_10",
    category: "endurance",
    weight: 1,
    title: { de: "Zeitinvestor", en: "Time Investor", uk: "Інвестор часу" },
    desc: {
      de: "10 Stunden Training gesamt.",
      en: "10 hours of training total.",
      uk: "10 годин тренувань загалом.",
    },
  },
  {
    key: "hours_50",
    category: "endurance",
    weight: 3,
    title: { de: "Dauerbrenner", en: "Steady Burner", uk: "Витривалий" },
    desc: {
      de: "50 Stunden Training gesamt.",
      en: "50 hours of training total.",
      uk: "50 годин тренувань загалом.",
    },
  },
  {
    key: "hours_100",
    category: "endurance",
    weight: 6,
    title: { de: "Centurion", en: "Centurion", uk: "Центуріон" },
    desc: {
      de: "100 Stunden Training gesamt.",
      en: "100 hours of training total.",
      uk: "100 годин тренувань загалом.",
    },
  },
  {
    key: "endurance_3h",
    category: "endurance",
    weight: 5,
    title: { de: "Grenzgänger", en: "Boundary Pusher", uk: "Довготривалий" },
    desc: {
      de: "3 Stunden Dauer in einer Aktivität.",
      en: "A single activity lasting 3 hours.",
      uk: "Активність тривалістю 3 години.",
    },
  },
  {
    key: "pace_5k_25",
    category: "tempo",
    weight: 2,
    title: { de: "Schneller Fünfer", en: "Quick 5K", uk: "Швидка п'ятірка" },
    desc: {
      de: "5 km unter 25 Minuten.",
      en: "5 km under 25 minutes.",
      uk: "5 км менш ніж за 25 хвилин.",
    },
  },
  {
    key: "pace_10k_50",
    category: "tempo",
    weight: 4,
    title: { de: "Zehner-Crack", en: "10K Ace", uk: "Десятка-ас" },
    desc: {
      de: "10 km unter 50 Minuten.",
      en: "10 km under 50 minutes.",
      uk: "10 км менш ніж за 50 хвилин.",
    },
  },
  {
    key: "pace_half_2h",
    category: "tempo",
    weight: 6,
    title: { de: "Sub-2", en: "Sub-2", uk: "Суб-2" },
    desc: {
      de: "Halbmarathon unter 2 Stunden.",
      en: "Half marathon under 2 hours.",
      uk: "Напівмарафон менш ніж за 2 години.",
    },
  },
  {
    key: "climb_1000",
    category: "climbing",
    weight: 1,
    title: { de: "Hügeljäger", en: "Hill Hunter", uk: "Мисливець за пагорбами" },
    desc: {
      de: "1000 Höhenmeter gesamt.",
      en: "1000 m of elevation gain total.",
      uk: "1000 м набору висоти загалом.",
    },
  },
  {
    key: "climb_everest",
    category: "climbing",
    weight: 4,
    title: { de: "Everest bezwungen", en: "Everested", uk: "Підкорений Еверест" },
    desc: {
      de: "8848 Höhenmeter gesamt.",
      en: "8848 m of elevation gain total.",
      uk: "8848 м набору висоти загалом.",
    },
  },
  {
    key: "climb_25000",
    category: "climbing",
    weight: 6,
    title: { de: "Wolkenstürmer", en: "Cloud Climber", uk: "Підкорювач хмар" },
    desc: {
      de: "25000 Höhenmeter gesamt.",
      en: "25000 m of elevation gain total.",
      uk: "25000 м набору висоти загалом.",
    },
  },
  {
    key: "climb_single_500",
    category: "climbing",
    weight: 3,
    title: { de: "Bergkönig", en: "King of the Mountain", uk: "Король гори" },
    desc: {
      de: "500 Höhenmeter in einer Aktivität.",
      en: "500 m of elevation in one activity.",
      uk: "500 м набору висоти за активність.",
    },
  },
  {
    key: "burn_10k",
    category: "calories",
    weight: 1,
    title: { de: "Brennofen", en: "Furnace", uk: "Піч" },
    desc: {
      de: "10.000 kcal insgesamt verbrannt.",
      en: "Burned 10,000 kcal in total.",
      uk: "Спалено 10 000 ккал загалом.",
    },
  },
  {
    key: "burn_100k",
    category: "calories",
    weight: 4,
    title: { de: "Hochofen", en: "Blast Furnace", uk: "Домна" },
    desc: {
      de: "100.000 kcal insgesamt verbrannt.",
      en: "Burned 100,000 kcal in total.",
      uk: "Спалено 100 000 ккал загалом.",
    },
  },
  {
    key: "burn_1000",
    category: "calories",
    weight: 2,
    title: { de: "Kalorienkiller", en: "Calorie Killer", uk: "Спалювач калорій" },
    desc: {
      de: "1000 kcal in einer Einheit.",
      en: "1000 kcal in a single session.",
      uk: "1000 ккал за одне тренування.",
    },
  },
  {
    key: "redline",
    category: "intensity",
    weight: 4,
    title: { de: "Grenzbereich", en: "Redline", uk: "Червона зона" },
    desc: {
      de: "Maximalpuls ≥ 190 in einer Aktivität.",
      en: "Max heart rate ≥ 190 in an activity.",
      uk: "Макс. пульс ≥ 190 в активності.",
    },
  },
  {
    key: "engine_20",
    category: "intensity",
    weight: 2,
    title: { de: "Motor", en: "Engine", uk: "Двигун" },
    desc: {
      de: "20 Aktivitäten mit Pulsdaten.",
      en: "20 activities with heart-rate data.",
      uk: "20 активностей з даними пульсу.",
    },
  },
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
    weight: 5,
    title: { de: "100-Tage-Serie", en: "100-Day Streak", uk: "Серія 100 днів" },
    desc: {
      de: "100 Tage in Folge aktiv.",
      en: "Active 100 days in a row.",
      uk: "Активність 100 днів поспіль.",
    },
  },
  {
    key: "streak_365",
    category: "consistency",
    weight: 7,
    title: { de: "Ganzjährig", en: "All Year Round", uk: "Цілий рік" },
    desc: {
      de: "365 Tage in Folge aktiv.",
      en: "Active 365 days in a row.",
      uk: "Активність 365 днів поспіль.",
    },
  },
  {
    key: "perfect_week",
    category: "consistency",
    weight: 3,
    title: { de: "Perfekte Woche", en: "Perfect Week", uk: "Ідеальний тиждень" },
    desc: {
      de: "7 aktive Tage in einer Kalenderwoche.",
      en: "7 active days in one calendar week.",
      uk: "7 активних днів за календарний тиждень.",
    },
  },
  {
    key: "big_month",
    category: "consistency",
    weight: 4,
    title: { de: "Starker Monat", en: "Big Month", uk: "Потужний місяць" },
    desc: {
      de: "20 Einheiten in einem Kalendermonat.",
      en: "20 sessions in one calendar month.",
      uk: "20 тренувань за календарний місяць.",
    },
  },
  {
    key: "weekend_warrior",
    category: "consistency",
    weight: 2,
    title: { de: "Wochenendkrieger", en: "Weekend Warrior", uk: "Воїн вихідного дня" },
    desc: {
      de: "An 10 Wochenenden trainiert.",
      en: "Trained on 10 weekends.",
      uk: "Тренування у 10 вихідних.",
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
  {
    key: "checkin_100",
    category: "consistency",
    weight: 4,
    title: { de: "Tagebuch-Profi", en: "Journal Pro", uk: "Профі щоденника" },
    desc: {
      de: "100 tägliche Check-ins erfasst.",
      en: "Logged 100 daily check-ins.",
      uk: "Зафіксовано 100 щоденних чек-інів.",
    },
  },
  {
    key: "early_bird",
    category: "lifestyle",
    weight: 3,
    title: { de: "Frühaufsteher", en: "Early Bird", uk: "Рання пташка" },
    desc: {
      de: "10 Einheiten vor 7 Uhr.",
      en: "10 sessions before 7 a.m.",
      uk: "10 тренувань до 7 ранку.",
    },
  },
  {
    key: "night_owl",
    category: "lifestyle",
    weight: 3,
    title: { de: "Nachteule", en: "Night Owl", uk: "Нічна сова" },
    desc: {
      de: "10 Einheiten nach 21 Uhr.",
      en: "10 sessions after 9 p.m.",
      uk: "10 тренувань після 21 години.",
    },
  },
  {
    key: "new_year_grind",
    category: "lifestyle",
    weight: 4,
    title: { de: "Neujahrsvorsatz", en: "New Year Grind", uk: "Новорічний запал" },
    desc: {
      de: "Training am 1. Januar.",
      en: "Trained on January 1st.",
      uk: "Тренування 1 січня.",
    },
  },
  {
    key: "festive_grind",
    category: "lifestyle",
    weight: 4,
    title: { de: "Trotzdem trainiert", en: "Festive Grind", uk: "Святковий запал" },
    desc: {
      de: "Training am 24. oder 25. Dezember.",
      en: "Trained on Dec 24th or 25th.",
      uk: "Тренування 24 або 25 грудня.",
    },
  },
  {
    key: "triathlete",
    category: "variety",
    weight: 5,
    title: { de: "Triathlet", en: "Triathlete", uk: "Тріатлоніст" },
    desc: {
      de: "Schwimmen, Radfahren und Laufen erfasst.",
      en: "Logged swimming, cycling and running.",
      uk: "Зафіксовано плавання, вело та біг.",
    },
  },
  {
    key: "multisport_5",
    category: "variety",
    weight: 3,
    title: { de: "Allrounder", en: "All-Rounder", uk: "Універсал" },
    desc: {
      de: "5 verschiedene Sportarten erfasst.",
      en: "Logged 5 different sports.",
      uk: "Зафіксовано 5 різних видів спорту.",
    },
  },
  {
    key: "gym_allround",
    category: "variety",
    weight: 4,
    title: { de: "Ganzkörper-Architekt", en: "Full-Body Architect", uk: "Архітектор тіла" },
    desc: {
      de: "Alle 6 Gym-Split-Typen trainiert.",
      en: "Trained all 6 gym split types.",
      uk: "Тренував усі 6 типів спліту.",
    },
  },
  {
    key: "well_rested",
    category: "recovery",
    weight: 3,
    title: { de: "Ausgeschlafen", en: "Well Rested", uk: "Виспаний" },
    desc: {
      de: "7 Nächte in Folge ≥ 8 h Schlaf.",
      en: "7 nights in a row with ≥ 8 h sleep.",
      uk: "7 ночей поспіль зі сном ≥ 8 год.",
    },
  },
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
  {
    key: "matches_10",
    category: "special",
    weight: 4,
    title: { de: "Stammspieler", en: "Regular", uk: "Основний гравець" },
    desc: {
      de: "10 Fußballspiele erfasst.",
      en: "Logged 10 football matches.",
      uk: "Зафіксовано 10 матчів.",
    },
  },
  {
    key: "matches_50",
    category: "special",
    weight: 6,
    title: { de: "Vereinslegende", en: "Club Legend", uk: "Легенда клубу" },
    desc: {
      de: "50 Fußballspiele erfasst.",
      en: "Logged 50 football matches.",
      uk: "Зафіксовано 50 матчів.",
    },
  },
  {
    key: "iron_matches",
    category: "special",
    weight: 5,
    title: { de: "Hartes Pflaster", en: "Iron Fixtures", uk: "Залізні матчі" },
    desc: {
      de: "5 Spiele mit Härte 'hart'.",
      en: "5 matches rated 'hard'.",
      uk: "5 матчів складності 'важко'.",
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
