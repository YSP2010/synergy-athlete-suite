// Server-only: analysiert ein hochgeladenes Food-Scan-Bild via Lovable AI Gateway.
// Erstellt einen food_scans Datensatz und gibt die extrahierten Daten zurück.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  imagePath: z.string().min(1),
  goalContext: z.string().optional(),
});

interface Extracted {
  name: string;
  portion_desc: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  health_score: number; // 0-10
  plan_fit_score: number; // 0-10
  reasoning: string;
  tags: string[];
}

const SYSTEM_PROMPT = `Du bist ein Sport-Ernährungscoach für hybride Athlet:innen (Fußball/Tennis/etc. + Krafttraining).
Analysiere das Foto einer Mahlzeit oder eines Lebensmittels und antworte AUSSCHLIESSLICH mit JSON in genau diesem Schema:
{
 "name": string,
 "portion_desc": string,
 "kcal": number,
 "protein_g": number,
 "carbs_g": number,
 "fat_g": number,
 "health_score": number,
 "plan_fit_score": number,
 "reasoning": string,
 "tags": string[]
}

Regeln:
- Schätze Nährwerte realistisch pro erkennbarer Portion.
- health_score 0-10 (10 = optimal für Sportler:innen, roh/vollwertig/nährstoffreich).
- plan_fit_score 0-10 basierend auf dem übermittelten Kontext (Trainingsziel, Tagesbedarf, Timing).
- reasoning kurz (max 2 Sätze), deutsch, sachlich.
- tags: 2-5 Kurz-Labels wie ["high-protein","post-workout","zuckerreich"].
Keine Erklärung außerhalb des JSON. Kein Markdown-Codeblock.`;

export const analyzeFoodScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => InputSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Bild aus Storage laden (RLS: nur eigenes)
    const dl = await supabase.storage.from("food-scans").download(data.imagePath);
    if (dl.error || !dl.data) throw new Error(`Bild nicht gefunden: ${dl.error?.message ?? "unknown"}`);
    const buf = new Uint8Array(await dl.data.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const mime = dl.data.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${b64}`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const userPrompt =
      `Analysiere die Mahlzeit auf dem Bild.` +
      (data.goalContext ? `\n\nKontext des Athleten heute:\n${data.goalContext}` : "");

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
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
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
    let parsed: Extracted;
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      parsed = JSON.parse(cleaned) as Extracted;
    } catch {
      throw new Error("Konnte AI-Antwort nicht als JSON lesen.");
    }

    // Normalisieren / clampen
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, Number(n) || 0));
    const extracted: Extracted = {
      name: String(parsed.name ?? "Unbekannt").slice(0, 120),
      portion_desc: parsed.portion_desc ? String(parsed.portion_desc).slice(0, 120) : null,
      kcal: Math.round(clamp(parsed.kcal, 0, 5000)),
      protein_g: Number(clamp(parsed.protein_g, 0, 300).toFixed(1)),
      carbs_g: Number(clamp(parsed.carbs_g, 0, 500).toFixed(1)),
      fat_g: Number(clamp(parsed.fat_g, 0, 300).toFixed(1)),
      health_score: Number(clamp(parsed.health_score, 0, 10).toFixed(1)),
      plan_fit_score: Number(clamp(parsed.plan_fit_score, 0, 10).toFixed(1)),
      reasoning: String(parsed.reasoning ?? "").slice(0, 400),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5).map((t) => String(t).slice(0, 30)) : [],
    };

    const ins = await supabase
      .from("food_scans")
      .insert({
        user_id: userId,
        image_path: data.imagePath,
        product_name: extracted.name,
        extracted: JSON.parse(JSON.stringify(extracted)),
        health_score: extracted.health_score,
        plan_fit_score: extracted.plan_fit_score,
        reasoning: extracted.reasoning,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);

    return { id: ins.data.id as string, extracted };
  });
