import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity as ActivityIcon, Loader2, MapPin, Timer, Gauge, HeartPulse, ShieldCheck } from "lucide-react";
import { fmtDistance, fmtDuration, fmtPace, sportLabel } from "@/lib/activities";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/activities/")({
  head: () => ({
    meta: [
      { title: "Aktivitäten – Hybrid Athlete" },
      { name: "description", content: "Alle importierten Garmin-Aktivitäten mit Distanz, Zeit, Puls und Pace im Überblick." },
      { property: "og:title", content: "Aktivitäten – Hybrid Athlete" },
      { property: "og:description", content: "Importierte Trainings mit Distanz, Zeit, Puls und Pace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select(
          "id, sport, name, started_at, duration_s, moving_duration_s, distance_m, avg_hr, elevation_gain_m, verified",
        )
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ActivityIcon className="h-6 w-6 text-primary" /> Aktivitäten
          </h1>
          <p className="text-sm text-muted-foreground">Importierte Einheiten aus deinem Garmin-Export.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/courses">Strecken</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/import">Import</Link>
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Noch keine Aktivitäten. Lade deinen Garmin-Export unter „Import“ hoch.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((a) => (
            <li key={a.id}>
              <Link
                to="/activities/$id"
                params={{ id: a.id }}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="min-w-[180px] flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    {a.name || sportLabel(a.sport)}
                    {a.verified && <ShieldCheck className="h-4 w-4 text-primary" aria-label="Geräteverifiziert" />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {sportLabel(a.sport)} ·{" "}
                    {a.started_at ? new Date(a.started_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "ohne Datum"}
                  </div>
                </div>
                <Metric icon={<MapPin className="h-4 w-4" />} value={fmtDistance(a.distance_m)} />
                <Metric icon={<Timer className="h-4 w-4" />} value={fmtDuration(a.moving_duration_s ?? a.duration_s)} />
                <Metric icon={<Gauge className="h-4 w-4" />} value={fmtPace(a.distance_m, a.moving_duration_s ?? a.duration_s)} />
                <Metric icon={<HeartPulse className="h-4 w-4" />} value={a.avg_hr ? `${a.avg_hr} bpm` : "–"} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="text-primary">{icon}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
