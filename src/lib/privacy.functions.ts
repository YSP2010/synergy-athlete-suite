// Server-only: DSGVO-Funktionen – vollständiger Datenexport und Kontolöschung.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Tabellen, die in den Export gehören (alle nutzerbezogen). */
const EXPORT_TABLES = [
  "profiles",
  "activities",
  "activity_laps",
  "multisport_segments",
  "swim_metrics",
  "courses",
  "course_efforts",
  "races",
  "equipment",
  "daily_stats",
  "journal_entries",
  "nutrition_logs",
  "food_scans",
  "workouts_gym",
  "gym_exercises",
  "workouts_sport",
  "weekly_planner",
  "wellness_daily",
  "sleep_logs",
  "hrv_logs",
  "user_metrics",
  "personal_records",
  "progress_insights",
  "leaderboard_entries",
  "consents",
  "import_jobs",
  "import_files",
] as const;

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const out: Record<string, unknown> = {};

    for (const table of EXPORT_TABLES) {
      const column = table === "profiles" ? "id" : "user_id";
      const query = supabase.from(table).select("*") as unknown as {
        eq: (col: string, val: string) => { limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }> };
      };
      const { data, error } = await query.eq(column, userId).limit(5000);
      if (error) {
        console.error("[export] failed", table, error);
        continue;
      }
      out[table] = data ?? [];
    }

    return {
      exportedAt: new Date().toISOString(),
      userId,
      // Als JSON-Text, damit der Export beliebige Tabellenformen transportieren kann.
      tablesJson: JSON.stringify(out),
    };
  });

/** GPS-Verläufe einzeln, damit der Export nicht zu groß wird. */
export const exportMyTracks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("activity_tracks")
      .select("activity_id, points, bounds, point_count")
      .eq("user_id", userId)
      .limit(1000);
    if (error) {
      console.error("[export] tracks failed", error);
      return { tracksJson: "[]" };
    }
    return { tracksJson: JSON.stringify(data ?? []) };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirm: string }) => {
    if (input?.confirm !== "LÖSCHEN") throw new Error("Bitte LÖSCHEN eintippen, um zu bestätigen.");
    return input;
  })
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // 1) Rohdateien im Storage entfernen
    const { data: files } = await supabase
      .from("import_files")
      .select("storage_path")
      .eq("user_id", userId)
      .not("storage_path", "is", null)
      .limit(5000);
    const paths = (files ?? []).map((f) => f.storage_path).filter((p): p is string => !!p);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabase.storage.from("imports").remove(paths.slice(i, i + 100));
      if (error) console.error("[delete] storage imports", error);
    }
    const { data: scans } = await supabase
      .from("food_scans")
      .select("image_path")
      .eq("user_id", userId)
      .not("image_path", "is", null)
      .limit(5000);
    const scanPaths = (scans ?? []).map((s) => s.image_path).filter((p): p is string => !!p);
    for (let i = 0; i < scanPaths.length; i += 100) {
      const { error } = await supabase.storage.from("food-scans").remove(scanPaths.slice(i, i + 100));
      if (error) console.error("[delete] storage scans", error);
    }

    // 2) Bestenlisten-Einträge zuerst, danach das Konto (Kaskade räumt den Rest)
    await supabase.from("leaderboard_entries").delete().eq("user_id", userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[delete] auth user", error);
      throw new Error("Das Konto konnte nicht gelöscht werden. Bitte später erneut versuchen.");
    }
    return { ok: true };
  });
