// Server-only: analysiert ein Body-Foto via Lovable AI Gateway und leitet einen
// TRAININGS-Fokus-Vorschlag ab (welche Muskelgruppen betonen). Das Foto wird
// direkt nach dem Einlesen aus dem Storage gelöscht (transient). Es werden
// KEINE Körperfett-/Gewichts-/Bewertungswerte erzeugt oder gespeichert.
// Für Minderjährige (< 16) ist die Funktion komplett gesperrt.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMinor } from "@/lib/youth";
import { ALL_MUSCLE_GROUPS } from "@/lib/plan-types";

const InputSchema = z.object({
  imagePath: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[a-f0-9-]{36}\/[\w.-]+$/i, "Ungültiger Bildpfad"),
  locale: z.enum(["de", "en", "uk"]).optional(),
});

const RESPONSE_LANGUAGE = { de: "German", en: "English", uk: "Ukrainian" } as const;

const DAILY_LIMIT = 3;

/** body_scans ist noch nicht in den generierten Supabase-Typen enthalten. */
interface BodyScanTable {
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

interface BodyScanSuggestion {
  emphasize: string[];
  note: string;
}

export const analyzeBodyScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => InputSchema.parse(v))
  .handler(async ({ data, context }): Promise<{ suggestion: BodyScanSuggestion }> => {
    const { supabase, userId } = context;

    // Pfad-Härtung: nur eigener Storage-Ordner
    if (!data.imagePath.startsWith(`${userId}/`)) throw new Error("Ungültiger Pfad");

    // Jugendschutz: Body-Scan für unter 16 komplett gesperrt.
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("birth_date")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (isMinor(prof?.birth_date ?? null)) {
      // Falls doch ein Bild hochgeladen wurde: entfernen.
      await supabase.storage
        .from("body-scans")
        .remove([data.imagePath])
        .catch(() => {});
      throw new Error("Der Body-Scan ist für unter 16-Jährige nicht verfügbar.");
    }

    // Rate-Limit: max. DAILY_LIMIT / 24h
    const bodyScans = (supabase as unknown as { from: (table: string) => BodyScanTable }).from(
      "body_scans",
    );
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error: cntErr } = await bodyScans
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if (cntErr) throw new Error(cntErr.message);
    if ((count ?? 0) >= DAILY_LIMIT)
      throw new Error(`Scan-Limit erreicht (max. ${DAILY_LIMIT} pro 24 Stunden).`);

    // Bild laden und SOFORT wieder löschen (transient – nichts bleibt gespeichert).
    const dl = await supabase.storage.from("body-scans").download(data.imagePath);
    await supabase.storage
      .from("body-scans")
      .remove([data.imagePath])
      .catch(() => {});
    if (dl.error || !dl.data)
      throw new Error(`Bild nicht gefunden: ${dl.error?.message ?? "unknown"}`);
    const buf = new Uint8Array(await dl.data.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const mime = dl.data.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${b64}`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const language = RESPONSE_LANGUAGE[data.locale ?? "de"];
    const system = `You are a supportive strength & conditioning coach. Look at the athlete photo and suggest which muscle groups they could EMPHASISE in training to build a balanced, proportionate physique. Respond ONLY with JSON: {"emphasize": string[], "note": string}. "emphasize" must be a subset of these ids: [${ALL_MUSCLE_GROUPS.join(", ")}]. "note" is ONE short, supportive sentence written in ${language}. Do NOT estimate body fat, weight, measurements or attractiveness. Do NOT judge or rate the body. If unsure, suggest a balanced selection. No markdown, no text outside the JSON.`;

    const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: "Suggest training emphasis for this athlete." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (gwRes.status === 429) throw new Error("AI-Limit erreicht. Bitte kurz warten.");
    if (gwRes.status === 402) throw new Error("AI-Guthaben aufgebraucht.");
    if (!gwRes.ok) {
      const t = await gwRes.text().catch(() => "");
      console.error("[bodyscan] AI gateway error", gwRes.status, t);
      throw new Error("KI-Dienst nicht erreichbar, bitte später erneut versuchen");
    }

    const json = (await gwRes.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    let parsed: { emphasize?: unknown; note?: unknown };
    try {
      const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Konnte AI-Antwort nicht als JSON lesen.");
    }

    const allowed = new Set(ALL_MUSCLE_GROUPS);
    const emphasize = Array.isArray(parsed.emphasize)
      ? Array.from(new Set(parsed.emphasize.map((g) => String(g))))
          .filter((g) => allowed.has(g))
          .slice(0, 8)
      : [];
    const note = String(parsed.note ?? "").slice(0, 300);

    // Aufruf protokollieren (nur Zeitstempel) – für das Rate-Limit.
    const { error: insErr } = await bodyScans.insert({ user_id: userId });
    if (insErr) console.error("[bodyscan] log insert failed:", insErr.message);

    return { suggestion: { emphasize, note } };
  });
