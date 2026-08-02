import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  RACE_PRESETS,
  buildPacingPlan,
  fmtDuration,
  taperPlan,
  type RaceType,
} from "@/lib/triathlon/pacing";
import { humanError } from "@/lib/errors";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/races/$id")({
  head: () => ({
    meta: [
      { title: "Wettkampf – Hybrid Athlete" },
      { name: "description", content: "Zielzeit, Splits und Vorbereitung für diesen Wettkampf." },
      { property: "og:title", content: "Wettkampf – Hybrid Athlete" },
      { property: "og:description", content: "Zielzeit, Splits und Vorbereitung im Detail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Wettkampf – Hybrid Athlete" },
      { name: "twitter:description", content: "Zielzeit, Splits und Vorbereitung im Detail." },
    ],
  }),
  component: RaceDetail,
});

/** "1:23:45" oder "45:00" nach Sekunden. */
function parseTime(v: string): number | null {
  const parts = v.trim().split(":").map((p) => Number(p));
  if (!parts.length || parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function RaceDetail() {
  const { id } = useParams({ from: "/_authenticated/races/$id" });
  const qc = useQueryClient();

  const { data: race, isLoading } = useQuery({
    queryKey: ["race", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("races").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [goal, setGoal] = useState({ total: "", swim: "", t1: "", bike: "", t2: "", run: "" });

  useEffect(() => {
    if (!race) return;
    const f = (s: number | null) => (s ? fmtDuration(s) : "");
    setGoal({
      total: f(race.goal_time_s),
      swim: f(race.goal_swim_s),
      t1: f(race.goal_t1_s),
      bike: f(race.goal_bike_s),
      t2: f(race.goal_t2_s),
      run: f(race.goal_run_s),
    });
  }, [race]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("races")
        .update({
          goal_time_s: parseTime(goal.total),
          goal_swim_s: parseTime(goal.swim),
          goal_t1_s: parseTime(goal.t1),
          goal_bike_s: parseTime(goal.bike),
          goal_t2_s: parseTime(goal.t2),
          goal_run_s: parseTime(goal.run),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zielzeiten gespeichert");
      qc.invalidateQueries({ queryKey: ["race", id] });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("races").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rennen gelöscht");
      qc.invalidateQueries({ queryKey: ["races"] });
      window.history.back();
    },
    onError: (e) => toast.error(humanError(e)),
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Lade…</div>;
  if (!race)
    return (
      <div className="py-20 text-center text-muted-foreground">
        Rennen nicht gefunden. <Link to="/races" className="text-neon underline">Zur Übersicht</Link>
      </div>
    );

  const preset = race.race_type !== "custom" ? RACE_PRESETS[race.race_type as keyof typeof RACE_PRESETS] : null;
  const distances = {
    swimM: Number(race.swim_distance_m ?? preset?.swimM ?? 0),
    bikeM: Number(race.bike_distance_m ?? preset?.bikeM ?? 0),
    runM: Number(race.run_distance_m ?? preset?.runM ?? 0),
  };
  const goalTotal = parseTime(goal.total) ?? race.goal_time_s ?? 0;
  const legs = goalTotal
    ? buildPacingPlan({
        distances,
        goalTimeS: goalTotal,
        goalSwimS: parseTime(goal.swim),
        goalT1S: parseTime(goal.t1),
        goalBikeS: parseTime(goal.bike),
        goalT2S: parseTime(goal.t2),
        goalRunS: parseTime(goal.run),
      })
    : [];
  const days = Math.ceil((Date.parse(`${race.race_date}T00:00:00Z`) - Date.now()) / 86_400_000);
  const taper = race.priority === "A" ? taperPlan(days) : [];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{race.name}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(`${race.race_date}T00:00:00Z`).toLocaleDateString("de-DE")}
            {days >= 0 && ` · in ${days} Tagen`}
          </p>
        </div>
        <Badge variant={race.priority === "A" ? "default" : "outline"}>Priorität {race.priority}</Badge>
      </div>

      <div className="card-elevated space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Zielzeiten</h2>
        <p className="text-xs text-muted-foreground">Format h:mm:ss oder mm:ss. Leere Felder werden verteilt.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Gesamt" value={goal.total} onChange={(v) => setGoal({ ...goal, total: v })} />
          {distances.swimM > 0 && (
            <Field label="Schwimmen" value={goal.swim} onChange={(v) => setGoal({ ...goal, swim: v })} />
          )}
          {distances.swimM > 0 && <Field label="Wechsel 1" value={goal.t1} onChange={(v) => setGoal({ ...goal, t1: v })} />}
          {distances.bikeM > 0 && <Field label="Rad" value={goal.bike} onChange={(v) => setGoal({ ...goal, bike: v })} />}
          {distances.bikeM > 0 && <Field label="Wechsel 2" value={goal.t2} onChange={(v) => setGoal({ ...goal, t2: v })} />}
          <Field label="Laufen" value={goal.run} onChange={(v) => setGoal({ ...goal, run: v })} />
        </div>
        <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
          Speichern
        </Button>
      </div>

      <div className="card-elevated space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Pacing-Plan</h2>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Drucken
          </Button>
        </div>
        {!legs.length ? (
          <p className="text-sm text-muted-foreground">Trage eine Gesamt-Zielzeit ein, dann rechnen wir die Aufteilung.</p>
        ) : (
          <div className="divide-y divide-border">
            {legs.map((l) => (
              <div key={l.key} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm font-medium">{l.label}</span>
                <span className="text-xs text-muted-foreground">{l.pace}</span>
                <span className="w-16 text-right font-display text-sm font-semibold">{fmtDuration(l.timeS)}</span>
                <span className="w-12 text-right text-xs text-muted-foreground">{l.sharePct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {taper.length > 0 && (
        <div className="card-elevated space-y-2 p-5">
          <h2 className="font-display text-lg font-semibold">Taper-Vorschlag</h2>
          {taper.map((t) => (
            <div key={t.weeksToRace} className="rounded-lg bg-elevated p-3 text-sm">
              <div className="font-medium">
                {t.weeksToRace} Woche{t.weeksToRace > 1 ? "n" : ""} vorher · Umfang {Math.round(t.volumeFactor * 100)} %
              </div>
              <div className="text-muted-foreground">{t.hint}</div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Vorschlag, kein Zwang – dein Wochenplan bleibt unverändert.</p>
        </div>
      )}

      <Button variant="ghost" className="w-full text-danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
        {remove.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
        Rennen löschen
      </Button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="2:30:00" inputMode="numeric" />
    </div>
  );
}
