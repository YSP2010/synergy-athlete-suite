import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateProgressInsight } from "@/lib/insights.functions";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-error";
import { WEEKDAY_LONG, isoDow } from "@/lib/dates";
import { toast } from "sonner";
import {
  TrendingUp,
  Sparkles,
  Loader2,
  HeartPulse,
  Dumbbell,
  Utensils,
  Lightbulb,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({ meta: [{ title: "Fortschritt – Hybrid Athlete" }] }),
  component: InsightsPage,
});

interface ParsedInsight {
  summary: string;
  recovery: string;
  training: string;
  nutrition: string;
  tips: string[];
}

interface InsightRow {
  id: string;
  period_start: string;
  period_end: string;
  content: string;
  created_at: string;
}

/** Datum als "5. Juli 2026" formatieren. */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

/** content-JSON defensiv parsen. */
function parseContent(content: string): ParsedInsight | null {
  try {
    const p = JSON.parse(content) as ParsedInsight;
    return {
      summary: String(p.summary ?? ""),
      recovery: String(p.recovery ?? ""),
      training: String(p.training ?? ""),
      nutrition: String(p.nutrition ?? ""),
      tips: Array.isArray(p.tips) ? p.tips.map(String) : [],
    };
  } catch {
    return null;
  }
}

function InsightsPage() {
  const qc = useQueryClient();
  const generate = useServerFn(generateProgressInsight);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { data: rows, error } = await supabase
        .from("progress_insights")
        .select("id,period_start,period_end,content,created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (rows ?? []) as InsightRow[];
    },
  });

  const runAnalyze = useMutation({
    mutationFn: async () => generate({}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights"] });
      qc.invalidateQueries({ queryKey: ["dashboard-insight"] });
      toast.success("Analyse erstellt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Fortschritt</h1>
        <p className="text-sm text-muted-foreground">
          KI-Auswertung der letzten 14 Tage – Recovery-Trend, Trainings-Konsistenz &amp; Ernährungs-Zieltreue.
        </p>
      </div>

      <div className="card-elevated flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Auf Basis deiner aggregierten Kennzahlen – keine Tagebuch- oder Notiztexte fließen ein.
          <span className="mt-0.5 block text-[11px]">Max. 3 Analysen pro 24 Stunden.</span>
        </div>
        <Button
          onClick={() => runAnalyze.mutate()}
          disabled={runAnalyze.isPending}
          className="bg-neon text-neon-foreground hover:bg-neon/90 glow"
        >
          {runAnalyze.isPending ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Analysiere…
            </>
          ) : (
            <>
              <Sparkles className="mr-1 h-4 w-4" /> Analyse erstellen
            </>
          )}
        </Button>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Letzte Analysen
        </div>

        {isError ? (
          <QueryError onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="card-elevated p-6 text-center text-sm text-muted-foreground">Lade…</div>
        ) : !data?.length ? (
          <div className="card-elevated p-6 text-center text-sm text-muted-foreground">
            Noch keine Analyse. Erstelle deine erste Auswertung.
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((row) => (
              <InsightCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({ row }: { row: InsightRow }) {
  const ins = parseContent(row.content);
  if (!ins) {
    return (
      <div className="card-elevated p-4 text-sm text-muted-foreground">
        Analyse konnte nicht gelesen werden.
      </div>
    );
  }

  return (
    <div className="card-elevated space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {fmtDate(row.period_start)} – {fmtDate(row.period_end)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {WEEKDAY_LONG[isoDow(new Date(row.created_at))].slice(0, 2)} · {fmtDate(row.created_at)}
        </div>
      </div>

      {ins.summary && (
        <div className="rounded-lg bg-neon-soft p-3 text-sm text-foreground">{ins.summary}</div>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <Field icon={HeartPulse} label="Recovery" text={ins.recovery} />
        <Field icon={Dumbbell} label="Training" text={ins.training} />
        <Field icon={Utensils} label="Ernährung" text={ins.nutrition} />
      </div>

      {ins.tips.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Lightbulb className="h-3 w-3" /> Tipps
          </div>
          <ul className="space-y-1">
            {ins.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neon" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  text,
}: {
  icon: typeof HeartPulse;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-lg bg-elevated p-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-xs text-foreground">{text || "—"}</div>
    </div>
  );
}
