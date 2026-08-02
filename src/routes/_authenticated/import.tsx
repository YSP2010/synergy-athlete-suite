import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createImportJob, processImportJob } from "@/lib/import.functions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QueryError } from "@/components/ui/query-error";
import { toast } from "sonner";
import { humanError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleAlert, FileUp, Loader2, SkipForward, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Garmin-Import – Hybrid Athlete" },
      { name: "description", content: "FIT-, GPX- und TCX-Dateien hochladen und automatisch als Aktivitäten auswerten." },
      { property: "og:title", content: "Garmin-Import – Hybrid Athlete" },
      { property: "og:description", content: "FIT, GPX und TCX hochladen und auswerten lassen." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/import" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Garmin-Import – Hybrid Athlete" },
      { name: "twitter:description", content: "FIT, GPX und TCX hochladen und auswerten lassen." },
    ],
  }),
  component: ImportPage,
});

/** 200 MB pro Einzeldatei – darüber bricht die Worker-Verarbeitung ab. */
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const ACCEPT = ".fit,.gpx,.tcx,.zip";

interface Progressish {
  processed: number;
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
}

function ImportPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [live, setLive] = useState<Progressish | null>(null);
  const createJob = useServerFn(createImportJob);
  const processJob = useServerFn(processImportJob);

  const jobs = useQuery({
    queryKey: ["import-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("import_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Nicht angemeldet");
      const uid = u.user.id;
      const stamp = Date.now();

      const entries: { relativePath: string; storagePath: string }[] = [];
      for (const [i, file] of files.entries()) {
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`${file.name} ist größer als 200 MB`);
        }
        const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-120);
        const storagePath = `${uid}/${stamp}-${i}-${safeName}`;
        const { error } = await supabase.storage.from("imports").upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
        if (error) throw error;
        entries.push({ relativePath: file.name, storagePath });
      }

      const isZip = files.some((f) => f.name.toLowerCase().endsWith(".zip"));
      const { jobId } = await createJob({
        data: {
          kind: isZip ? "garmin_export" : files.length > 1 ? "bulk" : "single",
          originalFilename: files[0]?.name,
          files: entries,
        },
      });

      setLive({ processed: 0, total: files.length, imported: 0, duplicates: 0, failed: 0 });

      // Charge für Charge, bis nichts mehr offen ist.
      for (let guard = 0; guard < 500; guard++) {
        const res = await processJob({ data: { jobId } });
        setLive({
          processed: res.processedFiles,
          total: Math.max(res.totalFiles, res.processedFiles),
          imported: res.importedActivities,
          duplicates: res.duplicateFiles,
          failed: res.failedFiles,
        });
        qc.invalidateQueries({ queryKey: ["import-jobs"] });
        if (res.remaining === 0) return res;
      }
      throw new Error("Import dauert zu lange – bitte Datei aufteilen");
    },
    onSuccess: (res) => {
      toast.success(
        `Import fertig: ${res.importedActivities} Dateien gelesen, ${res.duplicateFiles} Duplikate, ${res.failedFiles} Fehler`,
      );
      setLive(null);
      qc.invalidateQueries({ queryKey: ["import-jobs"] });
    },
    onError: (e) => {
      setLive(null);
      toast.error(humanError(e));
    },
  });

  function pick(list: FileList | null) {
    if (!list || !list.length) return;
    upload.mutate(Array.from(list));
  }

  const pct = live && live.total > 0 ? Math.min(100, (live.processed / live.total) * 100) : 0;

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Garmin-Import</h1>
        <p className="text-sm text-muted-foreground">
          Lade einzelne Aktivitäten (FIT, GPX, TCX) oder deinen kompletten Garmin-Konto-Export
          (ZIP) hoch. Duplikate werden automatisch erkannt.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "card-elevated flex flex-col items-center gap-3 border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-neon bg-neon-soft" : "border-border",
        )}
      >
        <FileUp className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          Dateien hierher ziehen oder auswählen · max. 200 MB pro Datei
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          aria-label="Aktivitätsdateien auswählen"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Dateien auswählen
        </Button>
      </div>

      {live && (
        <div className="card-elevated space-y-2 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Verarbeite…</span>
            <span className="text-muted-foreground">
              {live.processed} / {live.total}
            </span>
          </div>
          <Progress value={pct} />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-neon" /> {live.imported} gelesen
            </span>
            <span className="flex items-center gap-1">
              <SkipForward className="h-3.5 w-3.5" /> {live.duplicates} Duplikate
            </span>
            <span className="flex items-center gap-1">
              <CircleAlert className="h-3.5 w-3.5 text-danger" /> {live.failed} Fehler
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Letzte Importe</h2>
        {jobs.isError && <QueryError onRetry={() => jobs.refetch()} />}
        {jobs.isLoading && <div className="text-sm text-muted-foreground">Lade…</div>}
        {jobs.data?.length === 0 && (
          <div className="card-elevated p-4 text-sm text-muted-foreground">
            Noch keine Importe. Starte mit einer FIT- oder GPX-Datei.
          </div>
        )}
        {jobs.data?.map((j) => (
          <div key={j.id} className="card-elevated p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{j.original_filename ?? j.kind}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(j.created_at).toLocaleString("de-DE")} ·{" "}
                  {j.processed_files}/{j.total_files} Dateien
                </div>
              </div>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
                  j.status === "done" && "bg-neon-soft text-neon",
                  j.status === "failed" && "bg-danger/15 text-danger",
                  (j.status === "queued" || j.status === "processing") &&
                    "bg-warn/15 text-warn",
                )}
              >
                {j.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{j.imported_activities} gelesen</span>
              <span>{j.duplicate_files} Duplikate</span>
              <span>{j.failed_files} Fehler</span>
            </div>
            {j.error && <div className="mt-2 text-xs text-danger">{j.error}</div>}
          </div>
        ))}
      </div>

      <div className="card-elevated p-4 text-xs text-muted-foreground">
        <div className="mb-2 font-semibold text-foreground">Hinweise zum Konto-Export</div>
        <ul className="space-y-1">
          <li>• Garmin liefert den Export als ZIP mit verschachtelten Archiven – beides klappt.</li>
          <li>• FIT-Dateien enthalten die Geräte-Signatur und gelten deshalb als verifiziert.</li>
          <li>• GPX ohne Zeitstempel wird als reine Route erkannt, nicht als Aktivität.</li>
        </ul>
      </div>
    </div>
  );
}
