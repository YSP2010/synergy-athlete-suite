import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { computeRecords, type RecordActivity } from "./analytics/records";

type DB = SupabaseClient<Database>;

const SELECT =
  "id, sport, started_at, duration_s, moving_duration_s, distance_m, elevation_gain_m, avg_power_w, normalized_power_w";

/** Rechnet die Bestleistungen aus allen Aktivitäten neu und schreibt sie weg. */
export async function refreshPersonalRecords(db: DB, userId: string): Promise<number> {
  const { data, error } = await db
    .from("activities")
    .select(SELECT)
    .eq("user_id", userId)
    .eq("route_only", false)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(2000);
  if (error) throw error;

  const records = computeRecords((data ?? []) as RecordActivity[]);
  if (!records.length) return 0;

  const payload = records.map((r) => ({
    user_id: userId,
    sport: r.sport,
    metric: r.metric,
    value: r.value,
    unit: r.unit,
    activity_id: r.activityId,
    achieved_at: r.achievedAt,
  }));

  const { error: upErr } = await db
    .from("personal_records")
    .upsert(payload, { onConflict: "user_id,sport,metric" });
  if (upErr) throw upErr;
  return payload.length;
}
