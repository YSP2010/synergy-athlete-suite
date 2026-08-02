import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sportLabel } from "@/lib/activities";

export const Route = createFileRoute("/_authenticated/records")({
  head: () => ({
    meta: [
      { title: "Bestleistungen – Hybrid Athlete" },
      {
        name: "description",
        content: "Persönliche Bestzeiten, längste Einheiten und Höhenrekorde aus deinen Aktivitäten.",
      },
      { property: "og:title", content: "Bestleistungen – Hybrid Athlete" },
      { property: "og:description", content: "Persönliche Bestzeiten aus deinen Aktivitäten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecordsPage,
});

const METRIC_LABELS: Record<string, string> = {
  fastest_1k: "Schnellster 1 km",
  fastest_5k: "Schnellste 5 km",
  fastest_10k: "Schnellste 10 km",
  fastest_hm: "Schnellster Halbmarathon",
  fastest_marathon: "Schnellster Marathon",
  fastest_100m: "Schnellste 100 m",
  fastest_400m: "Schnellste 400 m",
  longest_distance: "Längste Distanz",
  longest_duration: "Längste Dauer",
  most_elevation: "Meiste Höhenmeter",
  max_power: "Höchste Leistung",
  max_speed: "Höchstes Tempo",
};

/** Klarname für eine Rekord-Kennzahl. */
function metricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric.replace(/_/g, " ");
}

function fmtValue(value: number, unit: string): string {
  if (unit === "s") {
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = Math.round(value % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} h`
      : `${m}:${String(s).padStart(2, "0")} min`;
  }
  if (unit === "m") return `${(value / 1000).toFixed(2)} km`;
  return `${Math.round(value)} ${unit}`;
}

function RecordsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["personal-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_records")
        .select("id, sport, metric, value, unit, activity_id, achieved_at")
        .order("sport", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const bySport = new Map<string, NonNullable<typeof data>>();
  for (const r of data ?? []) {
    const list = bySport.get(r.sport) ?? [];
    list.push(r);
    bySport.set(r.sport, list);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Bestleistungen</h1>
        <p className="text-sm text-muted-foreground">
          Automatisch aus deinen importierten Aktivitäten ermittelt.
        </p>
      </header>

      {!data?.length ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Trophy className="mx-auto mb-2 h-6 w-6" />
          Noch keine Bestleistungen. Importiere Aktivitäten unter{" "}
          <Link to="/import" className="text-primary underline">
            Import
          </Link>
          .
        </div>
      ) : (
        [...bySport.entries()].map(([sport, rows]) => (
          <section key={sport} className="space-y-3">
            <h2 className="text-lg font-semibold">{sportLabel(sport)}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r) => (
                <Card key={r.id}>
                  <CardContent className="space-y-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{metricLabel(r.metric)}</span>
                      <Badge variant="outline" className="shrink-0">
                        <Trophy className="mr-1 h-3 w-3" />
                        PR
                      </Badge>
                    </div>
                    <div className="font-mono text-xl font-bold tabular-nums">
                      {fmtValue(Number(r.value), r.unit)}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {r.achieved_at
                          ? new Date(r.achieved_at).toLocaleDateString("de-DE")
                          : "Datum unbekannt"}
                      </span>
                      {r.activity_id && (
                        <Link
                          to="/activities/$id"
                          params={{ id: r.activity_id }}
                          className="text-primary underline"
                        >
                          Einheit
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
