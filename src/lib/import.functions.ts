// Thin wrapper: nur Server-Function-Deklarationen (tss-serverfn-split-sicher).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateJobInput = z.object({
  kind: z.enum(["single", "bulk", "garmin_export"]),
  originalFilename: z.string().max(300).optional(),
  files: z
    .array(
      z.object({
        relativePath: z.string().min(1).max(400),
        storagePath: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(200),
});

/** Legt einen Import-Job samt Datei-Zeilen an (Dateien liegen bereits im Bucket). */
export const createImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateJobInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const prefix = `${userId}/`;
    for (const f of data.files) {
      if (!f.storagePath.startsWith(prefix) || f.storagePath.includes("..")) {
        throw new Error("Ungültiger Speicherpfad");
      }
    }
    const { data: job, error } = await supabase
      .from("import_jobs")
      .insert({
        user_id: userId,
        kind: data.kind,
        original_filename: data.originalFilename ?? null,
        total_files: data.files.length,
        status: "queued",
      })
      .select("id")
      .single();
    if (error) throw error;

    const rows = data.files.map((f, i) => ({
      job_id: job.id,
      user_id: userId,
      relative_path: f.relativePath,
      storage_path: f.storagePath,
      // Platzhalter: der echte Hash entsteht beim Verarbeiten.
      content_hash: `pending:${job.id}:${i}`,
      status: "queued" as const,
    }));
    const { error: filesErr } = await supabase.from("import_files").insert(rows);
    if (filesErr) throw filesErr;
    return { jobId: job.id as string };
  });

/** Verarbeitet die nächste Charge; wird vom Client bis `remaining === 0` aufgerufen. */
export const processImportJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { runJobBatch } = await import("./import.server");
    try {
      return await runJobBatch(context.supabase, context.userId, data.jobId);
    } catch (e) {
      console.error("[import] batch failed", e);
      await context.supabase
        .from("import_jobs")
        .update({ status: "failed", error: (e as Error).message.slice(0, 300) })
        .eq("id", data.jobId)
        .eq("user_id", context.userId);
      throw new Error("Import fehlgeschlagen. Bitte erneut versuchen.");
    }
  });
