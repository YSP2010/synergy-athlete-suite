import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Bike, CalendarDays, Footprints, Loader2, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { sportFamily } from "@/lib/analytics/aggregate";
import { disciplineBalance, RACE_PRESETS } from "@/lib/triathlon/pacing";

export const Route = createFileRoute("/_authenticated/triathlon")({
  head: () => ({
    meta: [
      { title: "Triathlon – Hybrid Athlete" },
      { name: "description", content: "Disziplin-Balance, kommende Rennen und Schwächen im Dreikampf erkennen." },
      { property: "og:title", content: "Triathlon – Hybrid Athlete" },
      { property: "og:description", content: "Disziplin-Balance und Rennplanung für Triathleten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TriathlonPage,
});

const FAM_LABEL = { swim: "Schwimmen", bike: "Rad", run: "Laufen" } as const;
const FAM_ICON = { swim: Waves, bike: Bike, run: Footprints } as const;

function TriathlonPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["triathlon-overview"],
    queryFn: async () => {
      const since = new Date(Date.now() - 84 * 86_400_000).toISOString();
      const [acts, races] = await Promise.all([
        supabase
          .from("activities")
          .select("id, sport, started_at, duration_s, moving_duration_s, distance_m")
          .eq("route_only", false)
          .gte("started_at", since)
          .limit(2000),
        supabase
          .from("races")
          .select("id, name, race_date, race_type, priority")
          .gte("race_date", new Date().toISOString().slice(0, 10))
          .order("race_date")
          .limit(5),
      ]);
      return { activities: acts.data ?? [], races: races.data ?? [] };
    },
  });

  const balance = useMemo(() => {
    const loads = (data?.activities ?? []).map((a) => ({
      family: sportFamily(a.sport),
      load: Number(a.moving_duration_s ?? a.duration_s ?? 0) / 60,
    }));
    return disciplineBalance(loads);
  }, [data]);

  if (isLoading)
    return (
      <div className="py-20 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const hasTriData = balance.swim + balance.bike + balance.run > 0;

  return (
    <div className="space-y-5 pb-10">
      <h1 className="font-display text-3xl font-bold">Triathlon</h1>

      <section className="card-elevated space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Disziplin-Balance (12 Wochen)</h2>
        {!hasTriData ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Ausdauereinheiten im Zeitraum.{" "}
            <Link to="/import" className="text-neon underline">
              Garmin-Daten importieren
            </Link>
            , dann siehst du hier die Verteilung.
          </p>
        ) : (
          <div className="space-y-3">
            {(["swim", "bike", "run"] as const).map((k) => {
              const Icon = FAM_ICON[k];
              return (
                <div key={k} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-neon" />
                    <span className="flex-1">{FAM_LABEL[k]}</span>
                    <span className="text-muted-foreground">{balance[k].toFixed(0)} %</span>
                  </div>
                  <Progress value={balance[k]} />
                </div>
              );
            })}
            {balance.weakest && (
              <p className="text-sm text-muted-foreground">
                Schwächste Disziplin gemessen am Zeitanteil: <strong>{FAM_LABEL[balance.weakest]}</strong>. Eine
                zusätzliche Einheit pro Woche bringt hier erfahrungsgemäß am meisten.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card-elevated space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Kommende Rennen</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/races">Alle Rennen</Link>
          </Button>
        </div>
        {!data?.races.length ? (
          <p className="text-sm text-muted-foreground">
            Noch kein Rennen geplant.{" "}
            <Link to="/races" className="text-neon underline">
              Wettkampf anlegen
            </Link>
            .
          </p>
        ) : (
          <div className="divide-y divide-border">
            {data.races.map((r) => {
              const days = Math.ceil((Date.parse(`${r.race_date}T00:00:00Z`) - Date.now()) / 86_400_000);
              return (
                <Link
                  key={r.id}
                  to="/races/$id"
                  params={{ id: r.id }}
                  className="flex items-center gap-3 py-2.5 hover:text-neon"
                >
                  <CalendarDays className="h-4 w-4 text-neon" />
                  <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.race_type !== "custom"
                      ? RACE_PRESETS[r.race_type as keyof typeof RACE_PRESETS]?.label
                      : "Eigene Distanz"}{" "}
                    · in {days} T
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="card-elevated space-y-2 p-5 text-sm text-muted-foreground">
        <h2 className="font-display text-lg font-semibold text-foreground">Weiter geht's</h2>
        <p>
          <Link to="/analytics" className="text-neon underline">
            Analyse
          </Link>{" "}
          zeigt Form, Zonen und Prognosen,{" "}
          <Link to="/equipment" className="text-neon underline">
            Ausrüstung
          </Link>{" "}
          zählt Kilometer je Schuh und Rad.
        </p>
      </section>
    </div>
  );
}
