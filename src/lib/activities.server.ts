import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { findDuplicate, fingerprintOf, type ActivityFingerprint } from "./import/duplicates";
import { downsampleTrack } from "./import/downsample";
import { geometryFromTrack, matchCourse, type CourseGeometry } from "./import/match";
import type { ParsedActivity } from "./import/types";
import { looksMultisport, segmentsFromLaps } from "./triathlon/segments";

type DB = SupabaseClient<Database>;

/** Ergebnis der Persistierung einer geparsten Aktivität. */
export type PersistResult =
  | { kind: "inserted"; activityId: string; matchedCourses: number }
  | { kind: "duplicate"; reason: "device_key" | "heuristic" }
  | { kind: "route_only" };

/**
 * Sucht mögliche Duplikate: gleiche Geräte-Signatur oder Startzeit im
 * ±5-Minuten-Fenster (Heuristik prüft danach Dauer/Distanz).
 */
async function loadDuplicateCandidates(
  db: DB,
  userId: string,
  a: ParsedActivity,
): Promise<ActivityFingerprint[]> {
  const rows: ActivityFingerprint[] = [];

  if (a.deviceActivityKey) {
    const { data } = await db
      .from("activities")
      .select("device_activity_key, started_at, duration_s, distance_m")
      .eq("user_id", userId)
      .eq("device_activity_key", a.deviceActivityKey)
      .limit(5);
    rows.push(...toFingerprints(data));
  }
  if (a.startedAt) {
    const start = Date.parse(a.startedAt);
    const { data } = await db
      .from("activities")
      .select("device_activity_key, started_at, duration_s, distance_m")
      .eq("user_id", userId)
      .gte("started_at", new Date(start - 300_000).toISOString())
      .lte("started_at", new Date(start + 300_000).toISOString())
      .limit(20);
    rows.push(...toFingerprints(data));
  }
  return rows;
}

function toFingerprints(
  data:
    | {
        device_activity_key: string | null;
        started_at: string | null;
        duration_s: number | null;
        distance_m: number | null;
      }[]
    | null,
): ActivityFingerprint[] {
  return (data ?? []).map((r) => ({
    deviceActivityKey: r.device_activity_key,
    startedAt: r.started_at,
    durationS: r.duration_s,
    distanceM: r.distance_m,
  }));
}

/** Legt Aktivität, Runden und (ausgedünnten) Verlauf an – inkl. Duplikatschutz. */
export async function persistActivity(
  db: DB,
  userId: string,
  importFileId: string | null,
  a: ParsedActivity,
): Promise<PersistResult> {
  if (a.routeOnly) return { kind: "route_only" };

  const dup = findDuplicate(fingerprintOf(a), await loadDuplicateCandidates(db, userId, a));
  if (dup) return { kind: "duplicate", reason: dup.reason };

  const { data: inserted, error } = await db
    .from("activities")
    .insert({
      user_id: userId,
      import_file_id: importFileId,
      sport: a.sport,
      name: a.name ?? null,
      started_at: a.startedAt ?? null,
      timezone_offset_min: a.timezoneOffsetMin ?? null,
      duration_s: a.durationS ?? null,
      moving_duration_s: a.movingDurationS ?? null,
      distance_m: a.distanceM ?? null,
      elevation_gain_m: a.elevationGainM ?? null,
      elevation_loss_m: a.elevationLossM ?? null,
      avg_speed_mps: a.avgSpeedMps ?? null,
      max_speed_mps: a.maxSpeedMps ?? null,
      avg_hr: a.avgHr ?? null,
      max_hr: a.maxHr ?? null,
      avg_cadence: a.avgCadence ?? null,
      max_cadence: a.maxCadence ?? null,
      avg_power_w: a.avgPowerW ?? null,
      max_power_w: a.maxPowerW ?? null,
      normalized_power_w: a.normalizedPowerW ?? null,
      calories: a.calories ?? null,
      avg_temperature_c: a.avgTemperatureC ?? null,
      avg_ground_contact_ms: a.avgGroundContactMs ?? null,
      avg_vertical_oscillation_cm: a.avgVerticalOscillationCm ?? null,
      avg_vertical_ratio: a.avgVerticalRatio ?? null,
      avg_stride_length_m: a.avgStrideLengthM ?? null,
      gct_balance_pct: a.gctBalancePct ?? null,
      aerobic_te: a.aerobicTe ?? null,
      anaerobic_te: a.anaerobicTe ?? null,
      training_load: a.trainingLoad ?? null,
      device_activity_key: a.deviceActivityKey ?? null,
      device_name: a.deviceName ?? null,
      device_manufacturer: a.deviceManufacturer ?? null,
      verified: a.verified,
      route_only: false,
    })
    .select("id")
    .single();

  if (error) {
    // Eindeutiger Index auf (user_id, device_activity_key).
    if (error.code === "23505") return { kind: "duplicate", reason: "device_key" };
    throw error;
  }
  const activityId = inserted.id as string;

  if (a.laps.length) {
    const laps = a.laps.slice(0, 500).map((l) => ({
      activity_id: activityId,
      user_id: userId,
      lap_index: l.lapIndex,
      sport: l.sport ?? null,
      duration_s: l.durationS ?? null,
      distance_m: l.distanceM ?? null,
      avg_hr: l.avgHr ?? null,
      avg_speed_mps: l.avgSpeedMps ?? null,
      avg_power_w: l.avgPowerW ?? null,
      avg_cadence: l.avgCadence ?? null,
      elevation_gain_m: l.elevationGainM ?? null,
    }));
    const { error: lapErr } = await db.from("activity_laps").insert(laps);
    if (lapErr) console.error("[import] laps failed", lapErr);

    // Multisport: Runden zu Segmenten (Schwimmen/T1/Rad/T2/Laufen) zusammenfassen.
    if (a.sport === "multisport" || looksMultisport(a.laps)) {
      const segments = segmentsFromLaps(a.laps, a.startedAt ?? null).map((s) => ({
        ...s,
        activity_id: activityId,
        user_id: userId,
      }));
      if (segments.length) {
        const { error: segErr } = await db.from("multisport_segments").insert(segments);
        if (segErr) console.error("[import] segments failed", segErr);
      }
    }
  }


  const { points, bounds } = downsampleTrack(a.samples);
  if (points.length) {
    const { error: trackErr } = await db.from("activity_tracks").insert({
      activity_id: activityId,
      user_id: userId,
      point_count: points.length,
      points: points as unknown as Json,
      bounds: bounds as unknown as Json,
    });
    if (trackErr) console.error("[import] track failed", trackErr);
  }

  const matchedCourses = await matchActivityAgainstCourses(db, userId, activityId, a, points);
  return { kind: "inserted", activityId, matchedCourses };
}

/** Gleicht eine frisch importierte Aktivität mit den eigenen Strecken ab. */
export async function matchActivityAgainstCourses(
  db: DB,
  userId: string,
  activityId: string,
  a: ParsedActivity,
  points: ReturnType<typeof downsampleTrack>["points"],
): Promise<number> {
  if (!points.length) return 0;
  const { data: courses } = await db
    .from("courses")
    .select("id, sport, distance_m, geometry")
    .eq("user_id", userId)
    .limit(50);
  if (!courses?.length) return 0;

  let matched = 0;
  for (const c of courses) {
    const geometry: CourseGeometry = {
      points: (c.geometry as unknown as [number, number][]) ?? [],
      distanceM: Number(c.distance_m ?? 0),
    };
    const res = matchCourse(geometry, points, a.distanceM ?? null);
    if (!res.matched) continue;
    const { error } = await db.from("course_efforts").upsert(
      {
        course_id: c.id,
        activity_id: activityId,
        user_id: userId,
        started_at: a.startedAt ?? null,
        duration_s: a.movingDurationS ?? a.durationS ?? 0,
        distance_m: a.distanceM ?? null,
        avg_hr: a.avgHr ?? null,
        avg_speed_mps: a.avgSpeedMps ?? null,
        match_score: res.score,
        verified: a.verified,
      },
      { onConflict: "course_id,activity_id" },
    );
    if (!error) matched += 1;
  }
  return matched;
}

export { geometryFromTrack };
