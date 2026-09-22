// Hybrid-Trainingsplan-Generator (Server-Only).
// Regelbasiertes Gerüst (aus planner.ts abgeleitete Logik) + optionale
// KI-Verfeinerung über das Lovable AI Gateway. Fällt bei fehlendem Key oder
// KI-Fehler robust auf das regelbasierte Gerüst zurück.
//
// WICHTIG: Nur aus Server-Handlern importieren (nutzt process.env / generateText).

import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { calcDailyMacros, toAthleteProfile } from "./planner";
import type {
  Experience,
  PlanContent,
  PlanLocale,
  PlanSession,
  PlanType,
  TrainingFocus,
  WeekFocus,
} from "./plan-types";
import { focusLists, gymPlanWeeks, sportPlanWeeks } from "./plan-types";
import type { PlanRecovery, RecoveryState } from "./plan-recovery";

const RESPONSE_LANGUAGE: Record<PlanLocale, string> = {
  de: "German",
  en: "English",
  uk: "Ukrainian",
};

/** Rohdaten aus der profiles-Zeile, die der Generator benötigt. */
export interface PlanProfileInput {
  sex: string | null;
  height_cm: number | string | null;
  weight_kg: number | string | null;
  birth_date: string | null;
  goal: string | null;
  sport: string | null;
  position: string | null;
  gym_days: number[] | null;
  sport_days: number[] | null;
  match_days: number[] | null;
  experience_level: Experience | null;
  focus: TrainingFocus | null;
}

/** Lokales Sport-Label inkl. Triathlon (planner.SPORT_LABELS kennt Triathlon nicht). */
const SPORT_LABEL: Record<string, string> = {
  football: "Fußball",
  tennis: "Tennis",
  basketball: "Basketball",
  handball: "Handball",
  running: "Laufen",
  triathlon: "Triathlon",
  other: "Sport",
};

function sportLabel(sport: string | null): string {
  return (sport && SPORT_LABEL[sport]) || "Sport";
}

function ageFromBirth(birth: string | null): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

// ---------- Regelbasiertes Gerüst: Gym ----------

function gymSplit(days: number): string[] {
  const d = Math.max(1, Math.min(6, days));
  if (d <= 2) return ["Ganzkörper A", "Ganzkörper B"].slice(0, Math.max(1, d));
  if (d === 3) return ["Push", "Pull", "Beine"];
  if (d === 4) return ["Oberkörper", "Unterkörper", "Push", "Pull"];
  if (d === 5) return ["Push", "Pull", "Beine", "Oberkörper", "Unterkörper"];
  return ["Push", "Pull", "Beine", "Oberkörper", "Unterkörper", "Ganzkörper"];
}

const GYM_EXERCISES: Record<string, string[]> = {
  Push: ["Bankdrücken", "Schulterdrücken", "Schrägbankdrücken (KH)", "Seitheben", "Trizepsdrücken"],
  Pull: ["Klimmzüge", "Langhantelrudern", "Latzug", "Face Pulls", "Bizeps-Curls"],
  Beine: ["Kniebeugen", "Rumänisches Kreuzheben", "Beinpresse", "Ausfallschritte", "Wadenheben"],
  Oberkörper: ["Bankdrücken", "Rudern", "Schulterdrücken", "Klimmzüge", "Armzusatz"],
  Unterkörper: ["Kniebeugen", "Kreuzheben", "Beinpresse", "Beinbeuger", "Wadenheben"],
  "Ganzkörper A": ["Kniebeugen", "Bankdrücken", "Rudern", "Schulterdrücken", "Plank"],
  "Ganzkörper B": ["Kreuzheben", "Schrägbankdrücken", "Klimmzüge", "Ausfallschritte", "Core"],
};

const EXERCISE_GROUP: Record<string, string> = {
  Bankdrücken: "chest_lower",
  "Schrägbankdrücken (KH)": "chest_upper",
  Schrägbankdrücken: "chest_upper",
  Schulterdrücken: "delts_front",
  Seitheben: "delts_side",
  Trizepsdrücken: "triceps",
  Klimmzüge: "back_lats",
  Langhantelrudern: "back_upper",
  Latzug: "back_lats",
  "Face Pulls": "delts_rear",
  "Bizeps-Curls": "biceps",
  Kniebeugen: "quads",
  "Rumänisches Kreuzheben": "hamstrings",
  Beinpresse: "quads",
  Ausfallschritte: "glutes",
  Wadenheben: "calves",
  Rudern: "back_upper",
  Armzusatz: "biceps",
  Kreuzheben: "hamstrings",
  Beinbeuger: "hamstrings",
  Plank: "abs",
  Core: "abs",
};

function exerciseGroup(name: string): string {
  return EXERCISE_GROUP[name] ?? "";
}

const GROUP_EN: Record<string, string> = {
  chest_upper: "upper chest",
  chest_lower: "mid/lower chest",
  back_lats: "lats (back width)",
  back_upper: "upper back/traps",
  back_lower: "lower back",
  delts_front: "front delts",
  delts_side: "side delts",
  delts_rear: "rear delts",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  abs: "abs",
  obliques: "obliques",
  glutes: "glutes",
  quads: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
};

function groupsEn(ids: string[]): string {
  return ids.map((g) => GROUP_EN[g] ?? g).join(", ");
}

/** Wendet den Muskelgruppen-Fokus auf die Gym-Einheiten an (nur Gym). */
function applyFocus(sessions: PlanSession[], focus: TrainingFocus | null): PlanSession[] {
  if (!focus) return sessions;
  const { emphasize, reduce, exclude } = focusLists(focus);
  if (!emphasize.length && !reduce.length && !exclude.length) return sessions;
  const eset = new Set(emphasize);
  const rset = new Set(reduce);
  const xset = new Set(exclude);
  const out: PlanSession[] = [];
  for (const session of sessions) {
    const exercises = session.exercises
      .filter((e) => !xset.has(exerciseGroup(e.name)))
      .map((e) => {
        const g = exerciseGroup(e.name);
        let sets = e.sets;
        if (eset.has(g)) sets += 1;
        else if (rset.has(g)) sets = Math.max(2, sets - 1);
        return { ...e, sets };
      });
    if (exercises.length) out.push({ ...session, exercises });
  }
  return out;
}

function repScheme(goal: string | null, exp: Experience): { sets: number; reps: string } {
  const setsBase = exp === "beginner" ? 3 : exp === "advanced" ? 4 : 3;
  switch (goal) {
    case "muscle_gain":
      return { sets: setsBase + 1, reps: "8–12" };
    case "performance":
      return { sets: setsBase + 1, reps: "3–6" };
    case "recomp":
      return { sets: setsBase, reps: "10–12" };
    case "maintain":
    default:
      return { sets: setsBase, reps: "8–10" };
  }
}

function buildGymSessions(input: PlanProfileInput, loadFactor = 1): PlanSession[] {
  const days = (input.gym_days ?? []).length || 3;
  const split = gymSplit(days);
  const { sets, reps } = repScheme(input.goal, input.experience_level ?? "intermediate");
  const scale = (n: number) => Math.max(2, Math.round(n * loadFactor));
  return split.map((title, i) => ({
    day: `Einheit ${i + 1}`,
    title: `Gym · ${title}`,
    focus: title,
    exercises: (GYM_EXERCISES[title] ?? GYM_EXERCISES["Ganzkörper A"]).map((name, idx) => ({
      name,
      sets: idx === 0 ? scale(sets + 1) : scale(sets),
      reps,
    })),
  }));
}

// ---------- Regelbasiertes Gerüst: Sport ----------

const SPORT_SESSION_TEMPLATES: Record<string, { title: string; focus: string; items: string[] }[]> =
  {
    football: [
      {
        title: "Technik & Ballkontrolle",
        focus: "Technik",
        items: ["Passspiel", "Ballannahme", "1-gegen-1", "Torabschluss"],
      },
      {
        title: "Kondition & Intervalle",
        focus: "Ausdauer",
        items: ["Warmlaufen 10 min", "4×4 min Intervalle", "Cooldown"],
      },
      {
        title: "Schnelligkeit & Agilität",
        focus: "Speed",
        items: ["Sprints 6×30 m", "Leiter-Drills", "Richtungswechsel"],
      },
      {
        title: "Spielformen",
        focus: "Spielverständnis",
        items: ["Kleinfeldspiele 4v4", "Standardsituationen"],
      },
    ],
    triathlon: [
      {
        title: "Schwimmen · Technik",
        focus: "Schwimmen",
        items: ["Einschwimmen", "Technik-Drills", "8×100 m Intervalle"],
      },
      { title: "Rad · Grundlage", focus: "Rad", items: ["Zone-2 60–90 min", "3×8 min Tempo"] },
      {
        title: "Lauf · Tempo",
        focus: "Laufen",
        items: ["Einlaufen", "5×1 km Schwellentempo", "Auslaufen"],
      },
      {
        title: "Koppeltraining (Brick)",
        focus: "Kombination",
        items: ["Rad 45 min", "direkt Lauf 20 min"],
      },
      {
        title: "Lange Grundlageneinheit",
        focus: "Ausdauer",
        items: ["Langer Lauf oder Rad in Zone 2"],
      },
    ],
  };

function sportSessionTemplates(sport: string | null) {
  if (sport && SPORT_SESSION_TEMPLATES[sport]) return SPORT_SESSION_TEMPLATES[sport];
  return [
    {
      title: `${sportLabel(sport)}-Training`,
      focus: "Technik",
      items: ["Sportartspezifische Technik", "Wettkampfnahe Übungen"],
    },
    { title: "Kondition", focus: "Ausdauer", items: ["Intervalltraining", "Grundlagenausdauer"] },
    {
      title: "Athletik & Schnelligkeit",
      focus: "Athletik",
      items: ["Sprints", "Sprung- & Agilitätsübungen"],
    },
  ];
}

function buildSportSessions(input: PlanProfileInput): PlanSession[] {
  const wanted = (input.sport_days ?? []).length || 3;
  const templates = sportSessionTemplates(input.sport);
  return templates.slice(0, Math.max(2, wanted)).map((t, i) => ({
    day: `Einheit ${i + 1}`,
    title: t.title,
    focus: t.focus,
    exercises: t.items.map((name) => ({ name, sets: 1, reps: "" })),
  }));
}

// ---------- Wochenphasen ----------

/** Volumen-Faktor auf die Startsätze je aktuellem Erholungszustand. */
function loadFactor(state?: RecoveryState): number {
  switch (state) {
    case "overreached":
      return 0.85;
    case "fatigued":
      return 0.95;
    case "fresh":
      return 1.05;
    default:
      return 1;
  }
}

/** Notiz zum aktuellen Formstand (deutsch; KI-Schritt übersetzt bei Bedarf). */
const RECOVERY_NOTE: Record<RecoveryState, string> = {
  overreached:
    "Aktueller Formstand: stark ermüdet – die erste Woche ist als Entlastung angelegt und das Startvolumen reduziert. Achte besonders auf Schlaf und Regeneration.",
  fatigued:
    "Aktueller Formstand: leicht ermüdet – das Startvolumen ist zu Beginn etwas reduziert.",
  fresh: "Aktueller Formstand: frisch/erholt – ein etwas höheres Startvolumen ist möglich.",
  balanced: "Aktueller Formstand: ausgeglichen – normale Progression.",
  unknown: "",
};

const BASE_NOTES = [
  "Vor jeder Einheit 8–10 min Aufwärmen.",
  "Progression wöchentlich anpassen (Last, Wiederholungen oder Umfang).",
  "Bei schlechter Erholung eine Einheit durch Mobility/Regeneration ersetzen.",
];

/** Basis-Hinweise, bei bekanntem Formstand um eine Recovery-Notiz ergänzt. */
function planNotes(recovery?: PlanRecovery): string[] {
  if (recovery && recovery.state !== "unknown" && RECOVERY_NOTE[recovery.state]) {
    return [RECOVERY_NOTE[recovery.state], ...BASE_NOTES];
  }
  return [...BASE_NOTES];
}

function buildWeeklyFocus(weeks: number, state?: RecoveryState): WeekFocus[] {
  const startDeload = state === "overreached" || state === "fatigued";
  const out: WeekFocus[] = [];
  for (let w = 1; w <= weeks; w++) {
    let phase = "Aufbau";
    let focus = "Progression: Volumen/Intensität leicht steigern";
    if (w === weeks) {
      phase = "Deload";
      focus = "Entlastung: Volumen ca. −40 %, Technik & Regeneration";
    } else if (startDeload && w === 1) {
      phase = "Entlastung";
      focus = "Reduziertes Volumen zum Einstieg – aktueller Formstand erfordert Erholung.";
    } else if (w <= Math.max(1, Math.round(weeks * 0.25))) {
      phase = "Grundlage";
      focus = "Technik festigen, moderate Lasten, Gewöhnung";
    } else if (w > Math.round(weeks * 0.75)) {
      phase = "Peak";
      focus = "Höchste Intensität, wettkampf-/zielnahe Belastung";
    }
    out.push({ week: w, phase, focus });
  }
  return out;
}

// ---------- Gerüst zusammenbauen ----------

function buildScaffold(
  input: PlanProfileInput,
  type: PlanType,
  recovery?: PlanRecovery,
): PlanContent {
  const weeks = type === "gym" ? gymPlanWeeks(input.goal) : sportPlanWeeks(input.sport);
  const factor = loadFactor(recovery?.state);
  const sessions =
    type === "gym"
      ? applyFocus(buildGymSessions(input, factor), input.focus)
      : buildSportSessions(input);

  let macros: PlanContent["macros"] = null;
  if (type === "gym") {
    const athlete = toAthleteProfile({
      sex: input.sex,
      height_cm: input.height_cm,
      weight_kg: input.weight_kg,
      birth_date: input.birth_date,
      goal: input.goal,
      gym_days: input.gym_days,
      sport_days: input.sport_days,
      match_days: input.match_days,
      sport: input.sport,
    });
    const m = calcDailyMacros(athlete, ageFromBirth(input.birth_date), undefined, undefined, false);
    macros = { kcal: m.kcal, protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g };
  }

  const summary =
    type === "gym"
      ? `${weeks}-Wochen-Gym-Plan (${sessions.length} Einheiten/Woche) mit Fokus auf dein Ziel.`
      : `${weeks}-Wochen-Plan zur Verbesserung in ${sportLabel(input.sport)}.`;

  return {
    version: 1,
    type,
    goal: input.goal,
    experience: input.experience_level ?? "intermediate",
    weeks,
    summary,
    weekly_focus: buildWeeklyFocus(weeks, recovery?.state),
    sessions,
    macros,
    notes: planNotes(recovery),
    generated_by: "rules",
    generated_at: new Date().toISOString(),
  };
}

// ---------- KI-Verfeinerung ----------

function parseJsonPlan(text: string): unknown | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeSessions(raw: unknown): PlanSession[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const sessions: PlanSession[] = [];
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const exRaw = Array.isArray(o.exercises) ? o.exercises : [];
    const exercises = exRaw
      .map((e) => {
        const eo = (e ?? {}) as Record<string, unknown>;
        return {
          name: String(eo.name ?? "").slice(0, 120),
          sets: Number.isFinite(Number(eo.sets)) ? Number(eo.sets) : 1,
          reps: String(eo.reps ?? ""),
          note: eo.note ? String(eo.note).slice(0, 200) : undefined,
        };
      })
      .filter((e) => e.name);
    sessions.push({
      day: String(o.day ?? `Einheit ${sessions.length + 1}`),
      title: String(o.title ?? "Einheit"),
      focus: String(o.focus ?? ""),
      exercises,
    });
  }
  return sessions.length ? sessions : null;
}

async function refineWithAI(
  scaffold: PlanContent,
  input: PlanProfileInput,
  key: string,
  locale: PlanLocale,
  recovery?: PlanRecovery,
): Promise<PlanContent> {
  const gateway = createLovableAiGatewayProvider(key);
  const context = [
    `type=${scaffold.type}`,
    `sport=${input.sport ?? "n/a"}`,
    `position=${input.position ?? "n/a"}`,
    `goal=${scaffold.goal ?? "n/a"}`,
    `experience=${scaffold.experience}`,
    `weeks=${scaffold.weeks}`,
    `recovery=${recovery?.state ?? "n/a"}`,
  ].join(", ");

  const { emphasize, reduce, exclude } = focusLists(input.focus);
  const focusLine =
    emphasize.length || reduce.length || exclude.length
      ? ` Muscle-group focus (respect strictly): emphasise [${groupsEn(emphasize)}], reduce [${groupsEn(reduce)}], exclude entirely [${groupsEn(exclude)}]. Honour the exclusions, but keep the remaining plan balanced and injury-safe.`
      : "";

  const recoveryLine =
    recovery && (recovery.state === "fatigued" || recovery.state === "overreached")
      ? ` The athlete is currently ${recovery.state}: keep the first 1–2 weeks conservative (lower volume, more recovery) and progress more gradually.`
      : recovery && recovery.state === "fresh"
        ? " The athlete is currently fresh/well recovered: a slightly higher starting volume is acceptable."
        : "";

  const prompt = `You are an experienced strength & conditioning coach. Improve the following DRAFT training plan for an athlete (${context}). Make the exercise selection specific and appropriate to the athlete's sport, goal and experience level. Keep exactly the same JSON structure and keys. Do NOT change "type", "weeks", "version" or "macros". Keep the number of sessions similar.${focusLine}${recoveryLine} Write ALL text (titles, focus, notes, summary, exercise names) in ${RESPONSE_LANGUAGE[locale]}. Return ONLY valid minified JSON, no markdown, no commentary.\n\nDRAFT:\n${JSON.stringify(scaffold)}`;

  const { text } = await generateText({
    model: gateway("openai/gpt-5.6-sol"),
    prompt,
    providerOptions: { lovable: { reasoningEffort: "low" } },
  });

  const parsed = parseJsonPlan(text);
  if (!parsed || typeof parsed !== "object") return { ...scaffold, generated_by: "rules" };
  const p = parsed as Record<string, unknown>;

  const sessions = normalizeSessions(p.sessions) ?? scaffold.sessions;
  const weeklyFocus =
    Array.isArray(p.weekly_focus) && p.weekly_focus.length
      ? scaffold.weekly_focus
      : scaffold.weekly_focus;
  const notes = Array.isArray(p.notes)
    ? (p.notes as unknown[])
        .map((n) => String(n))
        .filter(Boolean)
        .slice(0, 8)
    : scaffold.notes;

  return {
    ...scaffold,
    summary:
      typeof p.summary === "string" && p.summary.trim() ? p.summary.trim() : scaffold.summary,
    sessions,
    weekly_focus: weeklyFocus,
    notes: notes.length ? notes : scaffold.notes,
    generated_by: "hybrid",
    generated_at: new Date().toISOString(),
  };
}

/**
 * Erzeugt einen Trainingsplan (Gym oder Sport). Baut zuerst ein regelbasiertes
 * Gerüst und verfeinert es – wenn ein LOVABLE_API_KEY gesetzt ist – per KI.
 * Schlägt die KI fehl, wird das Gerüst zurückgegeben (generated_by: "rules").
 */
export async function generatePlan(
  input: PlanProfileInput,
  type: PlanType,
  locale: PlanLocale = "de",
  recovery?: PlanRecovery,
): Promise<PlanContent> {
  const scaffold = buildScaffold(input, type, recovery);
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return scaffold;
  try {
    return await refineWithAI(scaffold, input, key, locale, recovery);
  } catch (e) {
    console.error("[plan] AI refinement failed, using rule-based scaffold:", e);
    return scaffold;
  }
}
