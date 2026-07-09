import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_journal_entry",
  title: "Tagebuch-Eintrag erstellen",
  description:
    "Legt einen neuen Tagebuch-Eintrag für den angemeldeten Nutzer an. Datum optional (Default: heute).",
  inputSchema: {
    title: z.string().trim().min(1).describe("Kurzer Titel des Eintrags."),
    content: z.string().trim().min(1).describe("Freitext des Eintrags."),
    mood: z.number().int().min(1).max(5).optional().describe("Optionales Mood (1–5)."),
    tags: z.array(z.string().trim()).optional().describe("Optionale Tag-Liste."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("ISO-Datum YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, content, mood, tags, date }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Nicht angemeldet" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("journal_entries")
      .insert({
        user_id: ctx.getUserId()!,
        title,
        content,
        mood: mood ?? null,
        tags: tags ?? [],
        date: date ?? new Date().toISOString().slice(0, 10),
      })
      .select("id,date,title,mood,tags,content")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Eintrag angelegt (${data.id}).` }],
      structuredContent: { entry: data },
    };
  },
});
