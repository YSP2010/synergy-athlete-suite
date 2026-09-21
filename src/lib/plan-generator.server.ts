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
  WeekFocus,
} from "./plan-types";
import { gymPlanWeeks, sportPlanWeeks } from "./plan-types";

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

function buildGymSessions(input: PlanProfileInput): PlanSession[] {
  const days = (input.gym_days ?? []).length || 3;
  const split = gymSplit(days);
  const { sets, reps } = repScheme(input.goal, input.experience_level ?? "intermediate");
  return split.map((title, i) => ({
    day: `Einheit ${i + 1}`,
    title: `Gym · ${title}`,
    focus: title,
    exercises: (GYM_EXERCISES[title] ?? GYM_EXERCISES["Ganzkörper A"]).map((name, idx) => ({
      name,
      sets: idx === 0 ? sets + 1 : sets,
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

function buildWeeklyFocus(weeks: number): WeekFocus[] {
  const out: WeekFocus[] = [];
  for (let w = 1; w <= weeks; w++) {
    let phase = "Aufbau";
    let focus = "Progression: Volumen/Intensität leicht steigern";
    if (w === weeks) {
      phase = "Deload";
      focus = "Entlastung: Volumen ca. −40 %, Technik & Regeneration";
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

function buildScaffold(input: PlanProfileInput, type: PlanType): PlanContent {
  const weeks = type === "gym" ? gymPlanWeeks(input.goal) : sportPlanWeeks(input.sport);
  const sessions = type === "gym" ? buildGymSessions(input) : buildSportSessions(input);

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
    weekly_focus: buildWeeklyFocus(weeks),
    sessions,
    macros,
    notes: [
      "Vor jeder Einheit 8–10 min Aufwärmen.",
      "Progression wöchentlich anpassen (Last, Wiederholungen oder Umfang).",
      "Bei schlechter Erholung eine Einheit durch Mobility/Regeneration ersetzen.",
    ],
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
): Promise<PlanContent> {
  const gateway = createLovableAiGatewayProvider(key);
  const context = [
    `type=${scaffold.type}`,
    `sport=${input.sport ?? "n/a"}`,
    `position=${input.position ?? "n/a"}`,
    `goal=${scaffold.goal ?? "n/a"}`,
    `experience=${scaffold.experience}`,
    `weeks=${scaffold.weeks}`,
  ].join(", ");

  const prompt = `You are an experienced strength & conditioning coach. Improve the following DRAFT training plan for an athlete (${context}). Make the exercise selection specific and appropriate to the athlete's sport, goal and experience level. Keep exactly the same JSON structure and keys. Do NOT change "type", "weeks", "version" or "macros". Keep the number of sessions similar. Write ALL text (titles, focus, notes, summary, exercise names) in ${RESPONSE_LANGUAGE[locale]}. Return ONLY valid minified JSON, no markdown, no commentary.\n\nDRAFT:\n${JSON.stringify(scaffold)}`;

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
): Promise<PlanContent> {
  const scaffold = buildScaffold(input, type);
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return scaffold;
  try {
    return await refineWithAI(scaffold, input, key, locale);
  } catch (e) {
    console.error("[plan] AI refinement failed, using rule-based scaffold:", e);
    return scaffold;
  }
}
