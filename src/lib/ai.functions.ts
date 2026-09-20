import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

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

export const generateTrainingTip = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TrainingTipInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured: missing LOVABLE_API_KEY");

    const language = RESPONSE_LANGUAGE[data.locale ?? "en"];
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("openai/gpt-5.6-sol"),
      prompt: `Give one concise, actionable training tip for a hybrid athlete who plays ${data.sport} and trains in the gym. Focus: ${data.focus}. ${data.context ?? ""} Respond in ${language}. Maximum two sentences, no preamble.`,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });

    return { tip: text.trim() };
  });
