import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TrainingTipInput = z.object({
  sport: z.enum(["football", "tennis", "running", "triathlon"]),
  focus: z.enum(["endurance", "strength", "speed", "recovery"]),
  locale: z.enum(["de", "en", "uk"]).optional(),
  context: z.string().max(500).optional(),
});

/** Zielsprache der Antwort – der Prompt bleibt Englisch, nur die Ausgabe wechselt. */
const RESPONSE_LANGUAGE = {
  de: "German",
  en: "English",
  uk: "Ukrainian",
} as const;

/** Max. Trainingstipps pro Nutzer:in und 24h – schützt das AI-Kontingent. */
const DAILY_TIP_LIMIT = 20;

/**
 * Minimaler Zugriff auf ai_tip_log. Die Tabelle ist noch nicht in den
 * generierten Supabase-Typen enthalten (Migration 20260920120000_ai_tip_log),
 * daher hier bewusst eng typisiert statt `any`.
 */
interface TipLogTable {
  select: (
    columns: string,
    options: { count: "exact"; head: true },
  ) => {
    eq: (
      column: string,
      value: string,
    ) => {
      gte: (
        column: string,
        value: string,
      ) => Promise<{ count: number | null; error: { message: string } | null }>;
    };
  };
  insert: (row: { user_id: string }) => Promise<{ error: { message: string } | null }>;
}

export const generateTrainingTip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TrainingTipInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // ai_tip_log ist noch nicht in den generierten Supabase-Typen enthalten
    // (Migration 20260920120000_ai_tip_log). Bis zur Neugenerierung: gezielter Cast.
    const tipLog = (supabase as unknown as { from: (table: string) => TipLogTable }).from(
      "ai_tip_log",
    );

    // Rate-Limit: max. DAILY_TIP_LIMIT Tipps / 24h (analog zu Scanner/Insights).
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error: cntErr } = await tipLog
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if (cntErr) throw new Error(cntErr.message);
    if ((count ?? 0) >= DAILY_TIP_LIMIT)
      throw new Error(`Tipp-Limit erreicht (max. ${DAILY_TIP_LIMIT} pro 24 Stunden).`);

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured: missing LOVABLE_API_KEY");

    const language = RESPONSE_LANGUAGE[data.locale ?? "en"];
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("openai/gpt-5.6-sol"),
      prompt: `Give one concise, actionable training tip for a hybrid athlete who plays ${data.sport} and trains in the gym. Focus: ${data.focus}. ${data.context ?? ""} Respond in ${language}. Maximum two sentences, no preamble.`,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });

    // Aufruf protokollieren (nur Zeitstempel, kein Inhalt) – für das Rate-Limit.
    const { error: insErr } = await tipLog.insert({ user_id: userId });
    if (insErr) console.error("[ai] tip-log insert failed:", insErr.message);

    return { tip: text.trim() };
  });
