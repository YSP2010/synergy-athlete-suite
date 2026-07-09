import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_today_status",
  title: "Heutiger Status",
  description:
    "Gibt die heutigen Daily-Stats zurück (Schlaf, Muskelkater, Stimmung, Recovery-Score, Makros).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Nicht angemeldet" }], isError: true };
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabaseForUser(ctx)
      .from("daily_stats")
      .select("*")
      .eq("user_id", ctx.getUserId()!)
      .eq("date", today)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        { type: "text", text: data ? JSON.stringify(data, null, 2) : "Noch kein Check-in heute." },
      ],
      structuredContent: { date: today, stats: data },
    };
  },
});
