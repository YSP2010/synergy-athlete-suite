// Server-only: erstellt eine KI-Fortschrittsauswertung der letzten 14 Tage.
//
// SICHERHEIT: An die KI werden AUSSCHLIESSLICH selbst berechnete, numerische/kategoriale
// Aggregatwerte (Durchschnitte, Zähler, Trends) gesendet – NIEMALS Freitext-Felder
// (journal.content, daily_stats.notes, workouts_*.notes usw.). Dadurch ist Prompt-Injection
// über Nutzer-Rohdaten strukturell ausgeschlossen (kein Härtungs-Overhead nötig).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Aggregat-Metriken (in TypeScript berechnet, nicht von der KI) ----------

interface TrendMetric {
  avg: number | null; // Durchschnitt über den gesamten Zeitraum
  firstHalf: number | null; // Ø erste 7 Tage
  secondHalf: number | null; // Ø zweite 7 Tage
  trend: "up" | "down" | "flat" | "unknown"; // zweite vs. erste Wochenhälfte
}

interface Metrics {
  periodDays: number;
  daysWithCheckin: number;
  sleepHours: TrendMetric;
  soreness: TrendMetric;
  stress: TrendMetric;
  mood: TrendMetric;
  avgSleepQuality: number | null;
  workouts: {
    completed: number;
    planned: number;
    skipped: number;
    total: number;
  };
  nutrition: {
    daysTracked: number;
    avgKcal: number | null;
    avgProteinG: number | null;
    proteinPerKg: number | null;
    proteinTargetG: number | null; // 2 x weight_kg
  };
  profile: {
    weightKg: number | null;
    goal: string | null;
  };
}

interface ParsedInsight {
  summary: string;
  recovery: string;
  training: string;
  nutrition: string;
  tips: string[];
}

const SYSTEM_PROMPT = `Du bist ein sachlicher Coach-Assistent für Hybrid-Athleten (Fußball + Krafttraining). Du bekommst ausschließlich aggregierte Kennzahlen der letzten 14 Tage, keine Freitexte. Antworte AUSSCHLIESSLICH mit einem JSON-Objekt der Form {"summary": string, "recovery": string, "training": string, "nutrition": string, "tips": string[]}. Jedes Textfeld max. 2 kurze Sätze, sachlich, ohne medizinische Diagnosen oder Heilsversprechen, auf Deutsch. tips enthält 2-3 konkrete, umsetzbare Empfehlungen.`;

// ---------- Aggregations-Helfer ----------

function round1(n: number): number {
  return Number(n.toFixed(1));
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return round1(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * Baut eine TrendMetric für einen numerischen Tageswert.
 * `rows` sind nach Datum aufsteigend sortiert; `firstDates`/`secondDates` teilen
 * den 14-Tage-Zeitraum in zwei 7-Tage-Hälften.
 */
function buildTrend(
  values: { date: string; value: number | null }[],
  firstDates: Set<string>,
): TrendMetric {
  const all = values.filter((v) => v.value !== null).map((v) => v.value as number);
  const first = values
    .filter((v) => v.value !== null && firstDates.has(v.date))
    .map((v) => v.value as number);
  const second = values
    .filter((v) => v.value !== null && !firstDates.has(v.date))
    .map((v) => v.value as number);

  const firstAvg = avg(first);
  const secondAvg = avg(second);

  let trend: TrendMetric["trend"] = "unknown";
  if (firstAvg !== null && secondAvg !== null) {
    const diff = secondAvg - firstAvg;
    trend = Math.abs(diff) < 0.3 ? "flat" : diff > 0 ? "up" : "down";
  }

  return { avg: avg(all), firstHalf: firstAvg, secondHalf: secondAvg, trend };
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const generateProgressInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Rate-Limit: max. 3 Analysen / 24h
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error: cntErr } = await supabase
      .from("progress_insights")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if (cntErr) throw new Error(cntErr.message);
    if ((count ?? 0) >= 3) throw new Error("Tageslimit erreicht (3 Analysen pro 24h).");

    // Zeitraum: heute und die 13 Tage davor (= 14 Tage inkl. heute)
    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 13);
    const periodEnd = toISO(end);
    const periodStart = toISO(start);

    // Grenze zwischen erster und zweiter Wochenhälfte (erste 7 Tage: start .. start+6)
    const firstDates = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      firstDates.add(toISO(d));
    }

    // NUR numerische/kategoriale Spalten – kein Freitext.
    const [statsRes, gymRes, sportRes, nutRes, profRes] = await Promise.all([
      supabase
        .from("daily_stats")
        .select("date,sleep_hours,sleep_quality,soreness,stress,mood")
        .eq("user_id", userId)
        .gte("date", periodStart)
        .lte("date", periodEnd)
        .order("date", { ascending: true }),
      supabase
        .from("workouts_gym")
        .select("date,session_type,status")
        .eq("user_id", userId)
        .gte("date", periodStart)
        .lte("date", periodEnd),
      supabase
        .from("workouts_sport")
        .select("date,kind,intensity,status")
        .eq("user_id", userId)
        .gte("date", periodStart)
        .lte("date", periodEnd),
      supabase
        .from("nutrition_logs")
        .select("date,kcal,protein_g,carbs_g,fat_g")
        .eq("user_id", userId)
        .gte("date", periodStart)
        .lte("date", periodEnd),
      supabase.from("profiles").select("weight_kg,goal").eq("id", userId).maybeSingle(),
    ]);

    if (statsRes.error) throw new Error(statsRes.error.message);
    if (gymRes.error) throw new Error(gymRes.error.message);
    if (sportRes.error) throw new Error(sportRes.error.message);
    if (nutRes.error) throw new Error(nutRes.error.message);
    if (profRes.error) throw new Error(profRes.error.message);

    const stats = statsRes.data ?? [];
    const gym = gymRes.data ?? [];
    const sport = sportRes.data ?? [];
    const nut = nutRes.data ?? [];
    const profile = profRes.data;

    // ----- Recovery-Trends -----
    const sleepHours = buildTrend(
      stats.map((s) => ({ date: s.date, value: num(s.sleep_hours) })),
      firstDates,
    );
    const soreness = buildTrend(
      stats.map((s) => ({ date: s.date, value: num(s.soreness) })),
      firstDates,
    );
    const stress = buildTrend(
      stats.map((s) => ({ date: s.date, value: num(s.stress) })),
      firstDates,
    );
    const mood = buildTrend(
      stats.map((s) => ({ date: s.date, value: num(s.mood) })),
      firstDates,
    );
    const avgSleepQuality = avg(
      stats.map((s) => num(s.sleep_quality)).filter((v): v is number => v !== null),
    );

    // ----- Trainings-Konsistenz: Status-Zähler beider Workout-Tabellen zusammen -----
    // session_status: "planned" | "done" | "skipped" -> "done" zählt als completed.
    let completed = 0;
    let planned = 0;
    let skipped = 0;
    for (const w of [...gym, ...sport]) {
      if (w.status === "done") completed++;
      else if (w.status === "skipped") skipped++;
      else planned++;
    }

    // ----- Ernährungs-Zieltreue -----
    const nutDays = new Set<string>();
    let kcalSum = 0;
    let proteinSum = 0;
    for (const r of nut) {
      nutDays.add(r.date);
      kcalSum += num(r.kcal) ?? 0;
      proteinSum += num(r.protein_g) ?? 0;
    }
    const daysTracked = nutDays.size;
    const avgKcal = daysTracked ? Math.round(kcalSum / daysTracked) : null;
    const avgProteinG = daysTracked ? round1(proteinSum / daysTracked) : null;
    const weightKg = num(profile?.weight_kg);
    const proteinPerKg =
      avgProteinG !== null && weightKg ? round1(avgProteinG / weightKg) : null;
    const proteinTargetG = weightKg ? round1(2 * weightKg) : null;

    const metrics: Metrics = {
      periodDays: 14,
      daysWithCheckin: stats.length,
      sleepHours,
      soreness,
      stress,
      mood,
      avgSleepQuality,
      workouts: { completed, planned, skipped, total: completed + planned + skipped },
      nutrition: {
        daysTracked,
        avgKcal,
        avgProteinG,
        proteinPerKg,
        proteinTargetG,
      },
      profile: {
        weightKg,
        goal: profile?.goal ?? null,
      },
    };

    // ----- Lovable AI Gateway -----
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(metrics) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (gwRes.status === 429) throw new Error("AI-Limit erreicht. Bitte kurz warten und erneut versuchen.");
    if (gwRes.status === 402) throw new Error("AI-Guthaben aufgebraucht. Bitte im Workspace-Billing aufladen.");
    if (!gwRes.ok) {
      const t = await gwRes.text().catch(() => "");
      throw new Error(`AI-Fehler ${gwRes.status}: ${t.slice(0, 200)}`);
    }

    const json = (await gwRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    let parsed: ParsedInsight;
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      parsed = JSON.parse(cleaned) as ParsedInsight;
    } catch {
      throw new Error("Konnte AI-Antwort nicht als JSON lesen.");
    }

    // Defensiv clampen (analog zum Scanner mit .slice(...))
    const result: ParsedInsight = {
      summary: String(parsed.summary ?? "").slice(0, 400),
      recovery: String(parsed.recovery ?? "").slice(0, 400),
      training: String(parsed.training ?? "").slice(0, 400),
      nutrition: String(parsed.nutrition ?? "").slice(0, 400),
      tips: Array.isArray(parsed.tips)
        ? parsed.tips.slice(0, 3).map((t) => String(t).slice(0, 200))
        : [],
    };

    // content = strukturiertes JSON der vier Textfelder + Tipps, metrics = Aggregat-JSON.
    const ins = await supabase
      .from("progress_insights")
      .insert({
        user_id: userId,
        period_start: periodStart,
        period_end: periodEnd,
        content: JSON.stringify(result),
        metrics: JSON.parse(JSON.stringify(metrics)),
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);

    return { id: ins.data.id as string, insight: result, metrics, periodStart, periodEnd };
  });
