import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sha256Hex, sniffFileType } from "./import/detect";
import { unzipRecursive } from "./import/zip";
import { parseGpx, parseTcx } from "./import/gpx";
import { parseFitMessages, mapFitSport } from "./import/fit";
import { fingerprintOf } from "./import/duplicates";
import type { ImportFileType, ParsedActivity } from "./import/types";

export const IMPORT_BUCKET = "imports";
/** Wie viele Dateien pro Server-Aufruf verarbeitet werden (Worker-CPU-Budget). */
export const BATCH_FILES = 8;
/** Wie viele ZIP-Einträge pro Server-Aufruf verarbeitet werden. */
export const BATCH_ZIP_ENTRIES = 250;

type DB = SupabaseClient<Database>;

export interface BatchResult {
  jobId: string;
  status: "processing" | "done" | "failed";
  totalFiles: number;
  processedFiles: number;
  importedActivities: number;
  duplicateFiles: number;
  failedFiles: number;
  remaining: number;
}

/** Dateitypen, die die Pipeline auswertet. */
const PARSEABLE: ImportFileType[] = ["fit", "gpx", "tcx"];

async function decodeFit(bytes: Uint8Array): Promise<ParsedActivity> {
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const stream = Stream.fromByteArray(Array.from(bytes));
  if (!Decoder.isFIT(stream)) throw new Error("Keine gültige FIT-Datei");
  const decoder = new Decoder(stream);
  const { messages } = decoder.read({
    applyScaleAndOffset: true,
    convertTypesToStrings: true,
    convertDateTimesToDates: true,
    expandSubFields: true,
    expandComponents: true,
    mergeHeartRates: true,
  });
  return parseFitMessages(messages as Record<string, Record<string, unknown>[]>);
}

/** Wertet einen Datei-Inhalt aus und liefert das normalisierte Ergebnis. */
export async function parseBytes(
  bytes: Uint8Array,
  type: ImportFileType,
): Promise<ParsedActivity> {
  if (type === "fit") return decodeFit(bytes);
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (type === "gpx") return parseGpx(text);
  if (type === "tcx") return parseTcx(text);
  throw new Error(`Nicht unterstützter Dateityp: ${type}`);
}

interface FileOutcome {
  status: "done" | "skipped" | "failed";
  fileType: ImportFileType;
  contentHash: string;
  skipReason?: string;
  error?: string;
  activity?: ParsedActivity;
}

/** Verarbeitet einen einzelnen Datei-Inhalt (ohne DB-Zugriff) – gut testbar. */
export async function evaluateFile(bytes: Uint8Array): Promise<FileOutcome> {
  const fileType = sniffFileType(bytes);
  const contentHash = await sha256Hex(bytes);
  if (!PARSEABLE.includes(fileType)) {
    return { status: "skipped", fileType, contentHash, skipReason: `unsupported_${fileType}` };
  }
  try {
    const activity = await parseBytes(bytes, fileType);
    if (activity.routeOnly && !activity.samples.length) {
      return { status: "skipped", fileType, contentHash, skipReason: "empty" };
    }
    return { status: "done", fileType, contentHash, activity };
  } catch (e) {
    return { status: "failed", fileType, contentHash, error: (e as Error).message.slice(0, 300) };
  }
}

/** Kurzfassung für die UI/Job-Zusammenfassung. */
export function activitySummary(a: ParsedActivity) {
  return {
    sport: a.sport,
    startedAt: a.startedAt,
    distanceKm: a.distanceM != null ? Number((a.distanceM / 1000).toFixed(2)) : null,
    durationMin: a.durationS != null ? Math.round(a.durationS / 60) : null,
    verified: a.verified,
    fingerprint: fingerprintOf(a),
  };
}

async function insertChildRow(
  db: DB,
  userId: string,
  jobId: string,
  relativePath: string,
  outcome: FileOutcome,
): Promise<"done" | "skipped" | "failed" | "duplicate"> {
  const { data, error } = await db
    .from("import_files")
    .insert({
      job_id: jobId,
      user_id: userId,
      relative_path: relativePath,
      file_type: outcome.fileType,
      content_hash: outcome.contentHash,
      status: outcome.status,
      skip_reason: outcome.skipReason ?? null,
      error: outcome.error ?? null,
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) {
    // 23505 = unique_violation auf (user_id, content_hash) → schon importiert.
    if (error.code === "23505") return "duplicate";
    throw error;
  }
  if (outcome.status !== "done" || !outcome.activity) return outcome.status;
  return storeActivity(db, userId, data.id as string, outcome.activity);
}

/** Schreibt die Aktivität und spiegelt Duplikate/Routen in der Datei-Zeile. */
async function storeActivity(
  db: DB,
  userId: string,
  fileId: string,
  activity: ParsedActivity,
): Promise<"done" | "skipped" | "duplicate"> {
  const { persistActivity } = await import("./activities.server");
  const res = await persistActivity(db, userId, fileId, activity);
  if (res.kind === "duplicate") {
    await db
      .from("import_files")
      .update({ status: "skipped", skip_reason: `duplicate_${res.reason}` })
      .eq("id", fileId);
    return "duplicate";
  }
  if (res.kind === "route_only") {
    await db
      .from("import_files")
      .update({ status: "skipped", skip_reason: "route_only" })
      .eq("id", fileId);
    return "skipped";
  }
  return "done";
}

interface Counters {
  processed: number;
  imported: number;
  duplicates: number;
  failed: number;
}

async function handleZip(
  db: DB,
  userId: string,
  jobId: string,
  row: { id: string; relative_path: string },
  bytes: Uint8Array,
  counters: Counters,
): Promise<boolean> {
  const { entries, rejected } = unzipRecursive(bytes, undefined, row.relative_path);
  const { count } = await db
    .from("import_files")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .like("relative_path", `${row.relative_path}/%`);
  const offset = count ?? 0;
  const slice = entries.slice(offset, offset + BATCH_ZIP_ENTRIES);

  for (const entry of slice) {
    const outcome = await evaluateFile(entry.bytes);
    const result = await insertChildRow(db, userId, jobId, entry.relativePath, outcome);
    counters.processed += 1;
    if (result === "duplicate") counters.duplicates += 1;
    else if (result === "done") counters.imported += 1;
    else if (result === "failed") counters.failed += 1;
  }

  const finished = offset + slice.length >= entries.length;
  if (finished) {
    await db
      .from("import_files")
      .update({
        status: "done",
        processed_at: new Date().toISOString(),
        skip_reason: rejected.length ? `${rejected.length} Einträge übersprungen` : null,
      })
      .eq("id", row.id);
  } else {
    await db.from("import_files").update({ status: "processing" }).eq("id", row.id);
  }
  // total_files wächst dynamisch mit den entpackten Einträgen.
  await db
    .from("import_jobs")
    .update({ total_files: 1 + entries.length })
    .eq("id", jobId);
  return finished;
}

/**
 * Verarbeitet die nächste Charge eines Import-Jobs. Der Client ruft die
 * Funktion so lange auf, bis `remaining === 0`.
 */
export async function runJobBatch(db: DB, userId: string, jobId: string): Promise<BatchResult> {
  const { data: job, error: jobErr } = await db
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (jobErr) throw jobErr;
  if (!job) throw new Error("Import-Job nicht gefunden");

  await db
    .from("import_jobs")
    .update({ status: "processing", started_at: job.started_at ?? new Date().toISOString() })
    .eq("id", jobId);

  const { data: pending, error: pendErr } = await db
    .from("import_files")
    .select("id, relative_path, storage_path, status")
    .eq("job_id", jobId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: true })
    .limit(BATCH_FILES);
  if (pendErr) throw pendErr;

  const counters: Counters = { processed: 0, imported: 0, duplicates: 0, failed: 0 };

  for (const row of pending ?? []) {
    if (!row.storage_path) {
      await db
        .from("import_files")
        .update({ status: "failed", error: "Keine Datei hochgeladen" })
        .eq("id", row.id);
      counters.processed += 1;
      counters.failed += 1;
      continue;
    }
    try {
      const dl = await db.storage.from(IMPORT_BUCKET).download(row.storage_path);
      if (dl.error) throw dl.error;
      const bytes = new Uint8Array(await dl.data.arrayBuffer());

      if (sniffFileType(bytes) === "zip") {
        const finished = await handleZip(db, userId, jobId, row, bytes, counters);
        if (finished) counters.processed += 1;
        // ZIPs blockieren die Charge; weitere Dateien folgen im nächsten Aufruf.
        break;
      }

      const outcome = await evaluateFile(bytes);
      const { error } = await db
        .from("import_files")
        .update({
          file_type: outcome.fileType,
          content_hash: outcome.contentHash,
          status: outcome.status,
          skip_reason: outcome.skipReason ?? null,
          error: outcome.error ?? null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      counters.processed += 1;
      if (error?.code === "23505") {
        await db
          .from("import_files")
          .update({ status: "skipped", skip_reason: "duplicate_content" })
          .eq("id", row.id);
        counters.duplicates += 1;
      } else if (error) {
        throw error;
      } else if (outcome.status === "done") counters.imported += 1;
      else if (outcome.status === "failed") counters.failed += 1;
    } catch (e) {
      console.error("[import] file failed", row.id, e);
      await db
        .from("import_files")
        .update({ status: "failed", error: (e as Error).message.slice(0, 300) })
        .eq("id", row.id);
      counters.processed += 1;
      counters.failed += 1;
    }
  }

  const { count: remaining } = await db
    .from("import_files")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .in("status", ["queued", "processing"]);

  const { data: fresh } = await db
    .from("import_jobs")
    .select("processed_files, imported_activities, duplicate_files, failed_files, total_files")
    .eq("id", jobId)
    .maybeSingle();

  const processedFiles = (fresh?.processed_files ?? 0) + counters.processed;
  const importedActivities = (fresh?.imported_activities ?? 0) + counters.imported;
  const duplicateFiles = (fresh?.duplicate_files ?? 0) + counters.duplicates;
  const failedFiles = (fresh?.failed_files ?? 0) + counters.failed;
  const done = (remaining ?? 0) === 0;

  await db
    .from("import_jobs")
    .update({
      processed_files: processedFiles,
      imported_activities: importedActivities,
      duplicate_files: duplicateFiles,
      failed_files: failedFiles,
      status: done ? "done" : "processing",
      finished_at: done ? new Date().toISOString() : null,
    })
    .eq("id", jobId);

  return {
    jobId,
    status: done ? "done" : "processing",
    totalFiles: fresh?.total_files ?? 0,
    processedFiles,
    importedActivities,
    duplicateFiles,
    failedFiles,
    remaining: remaining ?? 0,
  };
}

export { mapFitSport };
