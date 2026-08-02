// Server-only: berechnet die Bestenlisten-Einträge des angemeldeten Nutzers neu.
// Es zählen ausschließlich verifizierte Geräte-Aktivitäten; Gesundheitskategorien
// nur, wenn die gesonderte Einwilligung vorliegt.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeAllEntries, type LbInput } from "@/lib/leaderboard/compute";

/** Mindestabstand zwischen zwei Neuberechnungen (Missbrauchsschutz). */
const RATE_LIMIT_MS = 5 * 60 * 1000;

export const recomputeMyLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("leaderboard_opt_in, leaderboard_share_health, weight_kg")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.leaderboard_opt_in) {
      await supabase.from("leaderboard_entries").delete().eq("user_id", userId);
      return { ok: true, entries: 0, skipped: "opt_out" as const };
    }

    const { data: last } = await supabase
      .from("leaderboard_entries")
      .select("computed_at")
      .eq("user_id", userId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last?.computed_at && Date.now() - Date.parse(last.computed_at) < RATE_LIMIT_MS) {
      return { ok: true, entries: 0, skipped: "rate_limit" as const };
    }

    const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);

    const [acts, sleep, hrv, wellness, metrics, segments] = await Promise.all([
      supabase
        .from("activities")
        .select(
          "id, sport, started_at, duration_s, moving_duration_s, distance_m, elevation_gain_m, avg_hr, avg_speed_mps, avg_power_w, normalized_power_w, avg_vertical_ratio, verified",
        )
        .eq("user_id", userId)
        .eq("route_only", false)
        .eq("verified", true)
        .limit(5000),
      supabase.from("sleep_logs").select("date, sleep_score").eq("user_id", userId).gte("date", since),
      supabase.from("hrv_logs").select("date, last_night_avg_ms").eq("user_id", userId).gte("date", since),
      supabase.from("wellness_daily").select("date, resting_hr").eq("user_id", userId).gte("date", since),
      supabase.from("user_metrics").select("date, chronic_load").eq("user_id", userId).gte("date", since),
      supabase.from("multisport_segments").select("activity_id, segment_type, duration_s").eq("user_id", userId),
    ]);

    const input: LbInput = {
      activities: (acts.data ?? []) as LbInput["activities"],
      sleep: (sleep.data ?? []) as LbInput["sleep"],
      hrv: (hrv.data ?? []) as LbInput["hrv"],
      wellness: (wellness.data ?? []) as LbInput["wellness"],
      metrics: (metrics.data ?? []) as LbInput["metrics"],
      segments: ((segments.data ?? []) as { activity_id: string; segment_type: string; duration_s: number }[]).map(
        (s) => ({ ...s, duration_s: Number(s.duration_s) }),
      ),
      weightKg: profile.weight_kg ? Number(profile.weight_kg) : null,
    };

    let drafts = computeAllEntries(input);
    if (!profile.leaderboard_share_health) {
      const health = new Set(["sleep_score_avg", "hrv_consistency", "resting_hr"]);
      drafts = drafts.filter((d) => !health.has(d.category_key));
      await supabase
        .from("leaderboard_entries")
        .delete()
        .eq("user_id", userId)
        .in("category_key", [...health]);
    }

    if (!drafts.length) return { ok: true, entries: 0 };

    const rows = drafts.map((d) => ({ ...d, user_id: userId, computed_at: new Date().toISOString() }));
    const { error } = await supabase
      .from("leaderboard_entries")
      .upsert(rows, { onConflict: "user_id,category_key,period,period_start" });
    if (error) {
      console.error("[leaderboard] upsert failed", error);
      throw new Error("Die Bestenliste konnte nicht aktualisiert werden.");
    }
    return { ok: true, entries: rows.length };
  });
