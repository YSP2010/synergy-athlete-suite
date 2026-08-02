/**
 * Spieltag-Countdown (Etappe D).
 * Baut auf `calcDailyMacros` auf – kein zweites Ernährungsmodell:
 * die Tagesziele kommen aus dem Planner, hier werden sie nur auf die
 * Stunden vor und nach dem Anstoß verteilt.
 */
import { calcDailyMacros, type AthleteProfile, type DailyMacros, type SportSession } from "./planner";

export interface MatchdayInput {
  profile: AthleteProfile;
  ageYears: number | null;
  kickoffAt: string;
  hardness: "easy" | "normal" | "hard";
  /** Aktuelle Uhrzeit (Tests übergeben einen festen Wert). */
  now?: Date;
}

export interface CountdownItem {
  /** Minuten vor dem Anstoß (negativ = danach). */
  offsetMin: number;
  at: string;
  title: string;
  detail: string;
  icon: "meal" | "snack" | "drink" | "warmup" | "recovery" | "sleep";
  done: boolean;
}

export interface MatchdayPlan {
  kickoff: Date;
  minutesToKickoff: number;
  phase: "far" | "today" | "warmup" | "live" | "after";
  macros: DailyMacros;
  /** Kohlenhydrate für die Vorbereitung (g). */
  preCarbsG: number;
  /** Flüssigkeit bis zum Anstoß (ml). */
  preFluidMl: number;
  /** Regenerationsprotein nach Abpfiff (g). */
  recoveryProteinG: number;
  items: CountdownItem[];
}

function at(kickoff: Date, offsetMin: number): string {
  return new Date(kickoff.getTime() - offsetMin * 60_000).toISOString();
}

/** Erstellt den individuellen Spieltagsplan rund um den Anstoß. */
export function buildMatchdayPlan(input: MatchdayInput): MatchdayPlan {
  const now = input.now ?? new Date();
  const kickoff = new Date(input.kickoffAt);
  const weight = input.profile.weight_kg ?? 75;

  const session: SportSession = {
    date: kickoff.toISOString().slice(0, 10),
    kind: "match",
    intensity: "high",
    match_hardness: input.hardness,
    duration_min: 90,
  };
  const macros = calcDailyMacros(input.profile, input.ageYears, session, undefined, false);

  // Vorbereitung: ~55 % der Tages-Carbs bis zum Anstoß.
  const preCarbsG = Math.round(macros.carbs_g * 0.55);
  const preFluidMl = Math.round(weight * 12);
  const recoveryProteinG = Math.round(Math.min(40, Math.max(25, weight * 0.4)));

  const mainMealCarbs = Math.round(preCarbsG * 0.6);
  const snackCarbs = Math.round(preCarbsG * 0.25);
  const boostCarbs = Math.max(0, preCarbsG - mainMealCarbs - snackCarbs);

  const raw: Omit<CountdownItem, "at" | "done">[] = [
    {
      offsetMin: 720,
      title: "Frühstück & Hydration starten",
      detail: `Kohlenhydratreich starten, ${Math.round(preFluidMl * 0.35)} ml über den Vormittag trinken.`,
      icon: "meal",
    },
    {
      offsetMin: 210,
      title: "Hauptmahlzeit",
      detail: `Ca. ${mainMealCarbs} g Kohlenhydrate, wenig Fett & Ballaststoffe (z. B. Reis, Nudeln, mageres Protein).`,
      icon: "meal",
    },
    {
      offsetMin: 90,
      title: "Snack",
      detail: `Leicht verdaulich, ca. ${snackCarbs} g Kohlenhydrate (Banane, Reiswaffeln) + ${Math.round(preFluidMl * 0.25)} ml trinken.`,
      icon: "snack",
    },
    {
      offsetMin: 45,
      title: "Aufwärmen",
      detail: "Mobilisation, Aktivierung, Sprints steigern – kein Muskelkater-Programm.",
      icon: "warmup",
    },
    {
      offsetMin: 15,
      title: "Letzter Boost",
      detail: boostCarbs > 0
        ? `${boostCarbs} g schnelle Kohlenhydrate + 150–250 ml Wasser.`
        : "150–250 ml Wasser, nichts Schweres mehr.",
      icon: "drink",
    },
    {
      offsetMin: -30,
      title: "Recovery-Shake",
      detail: `${recoveryProteinG} g Protein + ${Math.round(weight)} g Kohlenhydrate innerhalb von 30 Minuten.`,
      icon: "recovery",
    },
    {
      offsetMin: -150,
      title: "Mahlzeit & Flüssigkeit auffüllen",
      detail: `Vollwertige Mahlzeit, zusätzlich ${Math.round(preFluidMl * 0.5)} ml trinken.`,
      icon: "meal",
    },
    {
      offsetMin: -600,
      title: "Schlaf priorisieren",
      detail: "Mindestens 8 Stunden einplanen – morgen Check-in nicht vergessen.",
      icon: "sleep",
    },
  ];

  const items: CountdownItem[] = raw.map((r) => {
    const ts = at(kickoff, r.offsetMin);
    return { ...r, at: ts, done: Date.parse(ts) <= now.getTime() };
  });

  const minutesToKickoff = Math.round((kickoff.getTime() - now.getTime()) / 60_000);
  const phase: MatchdayPlan["phase"] =
    minutesToKickoff <= -105
      ? "after"
      : minutesToKickoff <= 0
        ? "live"
        : minutesToKickoff <= 60
          ? "warmup"
          : minutesToKickoff <= 60 * 18
            ? "today"
            : "far";

  return { kickoff, minutesToKickoff, phase, macros, preCarbsG, preFluidMl, recoveryProteinG, items };
}

/** Formatiert eine Restzeit als „3 h 12 min“. */
export function formatCountdown(minutes: number): string {
  const abs = Math.abs(minutes);
  const d = Math.floor(abs / 1440);
  const h = Math.floor((abs % 1440) / 60);
  const m = abs % 60;
  if (d > 0) return `${d} T ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}
