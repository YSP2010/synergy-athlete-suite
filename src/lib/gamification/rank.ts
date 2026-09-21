// Rang- & Divisions-System ("Militaer/Divisionen").
// Der Rang wird rein clientseitig aus dem XP-Gesamtstand (profiles.total_xp)
// abgeleitet – in der DB liegt nur total_xp, kein Rang. So gibt es keine Drift.

import type { Locale } from "@/lib/i18n/messages";

export type DivisionKey = "recruit" | "soldier" | "veteran" | "commander" | "general";

export interface Division {
  key: DivisionKey;
  /** Anzeigename je Sprache. */
  names: Record<Locale, string>;
  /** Rahmen-/Emblemfarbe (CSS). */
  color: string;
  /** Hellerer Akzent fuer Verlaeufe. */
  accent: string;
}

export const DIVISIONS: Division[] = [
  {
    key: "recruit",
    names: { de: "Rekrut", en: "Recruit", uk: "Рекрут" },
    color: "#8b95a1",
    accent: "#c3ccd6",
  },
  {
    key: "soldier",
    names: { de: "Soldat", en: "Soldier", uk: "Солдат" },
    color: "#b07b3e",
    accent: "#e0a765",
  },
  {
    key: "veteran",
    names: { de: "Veteran", en: "Veteran", uk: "Ветеран" },
    color: "#4f83d6",
    accent: "#8fb4f0",
  },
  {
    key: "commander",
    names: { de: "Kommandant", en: "Commander", uk: "Командир" },
    color: "#8b5cf6",
    accent: "#b794f6",
  },
  {
    key: "general",
    names: { de: "General", en: "General", uk: "Генерал" },
    color: "#e0384f",
    accent: "#f5808f",
  },
];

/** Kumulierte Mindest-XP je Stufe (5 Divisionen x 5 Stufen = 25 Schritte). */
const STEP_MIN_XP: number[] = [
  0,
  100,
  250,
  450,
  700, // Rekrut I–V
  1000,
  1400,
  1900,
  2500,
  3200, // Soldat I–V
  4000,
  5000,
  6200,
  7600,
  9200, // Veteran I–V
  11000,
  13100,
  15500,
  18200,
  21200, // Kommandant I–V
  24600,
  28400,
  32700,
  37500,
  43000, // General I–V
];

export const TIERS_PER_DIVISION = 5;
export const MAX_STEP = STEP_MIN_XP.length - 1; // 24

const ROMAN = ["I", "II", "III", "IV", "V"];

export interface Rank {
  stepIndex: number; // 0..24
  division: Division;
  divisionIndex: number; // 0..4
  tier: number; // 1..5
  roman: string; // "I".."V"
  minXp: number; // Schwelle dieser Stufe
  nextMinXp: number | null; // Schwelle der naechsten Stufe (null = Maximum)
  isMax: boolean;
}

function clampXp(totalXp: number): number {
  return Number.isFinite(totalXp) && totalXp > 0 ? Math.floor(totalXp) : 0;
}

export function rankFromXp(totalXp: number): Rank {
  const xp = clampXp(totalXp);
  let step = 0;
  for (let i = 0; i < STEP_MIN_XP.length; i++) {
    if (xp >= STEP_MIN_XP[i]) step = i;
    else break;
  }
  const divisionIndex = Math.floor(step / TIERS_PER_DIVISION);
  const tier = (step % TIERS_PER_DIVISION) + 1;
  const isMax = step >= MAX_STEP;
  return {
    stepIndex: step,
    division: DIVISIONS[divisionIndex],
    divisionIndex,
    tier,
    roman: ROMAN[tier - 1],
    minXp: STEP_MIN_XP[step],
    nextMinXp: isMax ? null : STEP_MIN_XP[step + 1],
    isMax,
  };
}

/** Fortschritt innerhalb der aktuellen Stufe (0..1) und XP bis zur naechsten Stufe. */
export function rankProgress(totalXp: number): { pct: number; toNext: number; rank: Rank } {
  const rank = rankFromXp(totalXp);
  const xp = clampXp(totalXp);
  if (rank.isMax || rank.nextMinXp === null) {
    return { pct: 1, toNext: 0, rank };
  }
  const span = rank.nextMinXp - rank.minXp;
  const done = xp - rank.minXp;
  const pct = span > 0 ? Math.max(0, Math.min(1, done / span)) : 0;
  return { pct, toNext: Math.max(0, rank.nextMinXp - xp), rank };
}

export function divisionName(division: Division, locale: Locale): string {
  return division.names[locale] ?? division.names.de;
}

/** Vor dem ersten Training: "Anwaerter"-Zustand (noch kein Rang). */
export const PROSPECT_NAMES: Record<Locale, string> = {
  de: "Anwärter",
  en: "Prospect",
  uk: "Кандидат",
};
