/**
 * Mannschafts-Cockpit: Belastungs- und Erholungsampel je Spieler.
 * Kein medizinisches Urteil – nur eine Orientierung für das Trainingsgespräch.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/components/ui/query-error";
import { AlertTriangle, Activity, CalendarOff, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  athleteReadiness,
  sortByRisk,
  type AthleteReadiness,
  type TeamReadinessRow,
} from "@/lib/readiness";

const DOT: Record<AthleteReadiness["level"], string> = {
  red: "bg-danger",
  amber: "bg-warn",
  green: "bg-success",
  grey: "bg-muted-foreground/30",
};

const LABEL: Record<AthleteReadiness["level"], string> = {
  red: "Achtung",
  amber: "Beobachten",
  green: "Bereit",
  grey: "Zu wenig Daten",
};

export function TeamCockpit({ teamId }: { teamId: string }) {
  const { data, isError, refetch, isPending } = useQuery({
    queryKey: ["team-readiness", teamId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_team_readiness", { _team_id: teamId });
      if (error) throw error;
      return sortByRisk(
        ((data ?? []) as unknown as TeamReadinessRow[]).map((r) =>
          athleteReadiness({
            ...r,
            acute_load: Number(r.acute_load ?? 0),
            chronic_load: Number(r.chronic_load ?? 0),
            sleep_hours: r.sleep_hours == null ? null : Number(r.sleep_hours),
          }),
        ),
      );
    },
  });

  if (isError) return <QueryError onRetry={() => refetch()} />;

  const rows = data ?? [];
  const counts = {
    red: rows.filter((r) => r.level === "red").length,
    amber: rows.filter((r) => r.level === "amber").length,
    green: rows.filter((r) => r.level === "green").length,
    grey: rows.filter((r) => r.level === "grey").length,
  };
  const stale = rows.filter((r) => r.daysSinceCheckin == null || r.daysSinceCheckin >= 3);

  if (!isPending && rows.length === 0) {
    return (
      <div className="card-elevated p-6 text-center">
        <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Noch keine aktiven Spieler. Erstelle im Reiter „Einladen" einen Einladungslink und teile
          ihn mit der Mannschaft.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["red", "amber", "green", "grey"] as const).map((lvl) => (
          <div key={lvl} className="card-elevated p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("h-2.5 w-2.5 rounded-full", DOT[lvl])} />
              {LABEL[lvl]}
            </div>
            <div className="tabular mt-1 font-display text-2xl font-bold">{counts[lvl]}</div>
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.userId} className="card-elevated p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT[r.level])}
                    title={LABEL[r.level]}
                  />
                  {r.name}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.reason}</p>
                <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="tabular">
                    Belastungsverhältnis: {r.acwr != null ? r.acwr.toFixed(2) : "–"}
                  </span>
                  <span className="tabular">Erholung: {r.recovery ?? "–"}</span>
                  <span>{r.measured ? "gemessen" : "geschätzt"}</span>
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/athletes/$id" params={{ id: r.userId }}>
                  Ansicht
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {stale.length > 0 && (
        <div className="card-elevated p-4">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <CalendarOff className="h-4 w-4" /> Kein Check-in seit 3+ Tagen
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {stale.map((r) => r.name).join(", ")}
          </p>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-lg border border-border bg-elevated p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Die Ampel ist eine grobe Orientierung aus Trainingsbelastung und Selbsteinschätzung. Sie
        ist keine medizinische Aussage. Bei Schmerzen oder Beschwerden gehört die Entscheidung zu
        Arzt oder Physiotherapie.
      </p>

      {counts.red > 0 && (
        <p className="flex items-center gap-2 text-xs text-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          Sprich die rot markierten Spieler vor der nächsten Einheit an.
        </p>
      )}
    </div>
  );
}
