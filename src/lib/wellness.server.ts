import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { WellnessBundle } from "./import/wellness";

type DB = SupabaseClient<Database>;

/**
 * Schreibt Wellness-Zeilen per Upsert auf (user_id, date) – ein erneuter
 * Garmin-Export aktualisiert vorhandene Tage, statt sie zu verdoppeln.
 */
export async function persistWellness(
  db: DB,
  userId: string,
  bundle: WellnessBundle,
): Promise<number> {
  let written = 0;
  written += await upsert(db, "wellness_daily", userId, bundle.wellness);
  written += await upsert(db, "sleep_logs", userId, bundle.sleep);
  written += await upsert(db, "hrv_logs", userId, bundle.hrv);
  written += await upsert(db, "user_metrics", userId, bundle.metrics);
  return written;
}

async function upsert(
  db: DB,
  table: "wellness_daily" | "sleep_logs" | "hrv_logs" | "user_metrics",
  userId: string,
  rows: { date: string }[],
): Promise<number> {
  if (!rows.length) return 0;
  const payload = rows.map((r) => ({ ...r, user_id: userId }));
  let written = 0;
  // In Blöcken schreiben: Konto-Exporte enthalten Jahre an Tagesdaten.
  for (let i = 0; i < payload.length; i += 200) {
    const chunk = payload.slice(i, i + 200);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from(table) as any).upsert(chunk, { onConflict: "user_id,date" });
    if (error) {
      console.error("[wellness] upsert failed", table, error.message);
      continue;
    }
    written += chunk.length;
  }
  return written;
}
