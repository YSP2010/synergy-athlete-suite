import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_gym_sessions",
  title: "Gym-Sessions anzeigen",
  description: "Listet die letzten Krafttraining-Sessions des Nutzers mit Datum, Typ und Status.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Anzahl Einträge (Default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Nicht angemeldet" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("workouts_gym")
      .select("id,date,session_type,duration_min,status,notes")
      .eq("user_id", ctx.getUserId()!)
      .order("date", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { sessions: data ?? [] },
    };
  },
});
