import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const TrainingTipInput = z.object({
  sport: z.enum(["football", "tennis", "running", "triathlon"]),
  focus: z.enum(["endurance", "strength", "speed", "recovery"]),
  context: z.string().max(500).optional(),
});

export const generateTrainingTip = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TrainingTipInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured: missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway("openai/gpt-5.6-sol"),
      prompt: `Give one concise, actionable training tip for a hybrid athlete who plays/plays ${data.sport} and trains in the gym. Focus: ${data.focus}. ${data.context ?? ""}`,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });

    return { tip: text.trim() };
  });
