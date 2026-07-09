import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Wer bin ich",
  description:
    "Gibt das Profil des angemeldeten Nutzers zurück (Name, Rolle, Sportart, Ziel, Alter, Gewicht).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Nicht angemeldet" }], isError: true };
    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .select("name,role,sport,goal,birth_date,weight_kg,height_cm,gym_days,sport_days,match_days")
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? {}, null, 2) }],
      structuredContent: { profile: data },
    };
  },
});
