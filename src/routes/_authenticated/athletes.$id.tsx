import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Lock, Dumbbell, Trophy, HeartPulse, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toISODate, today, startOfWeek, addDays } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/athletes/$id")({
  head: () => ({ meta: [{ title: "Athlet – Hybrid Athlete" }] }),
  component: AthleteView,
});

function AthleteView() {
  const { id } = Route.useParams();
  const weekStart = startOfWeek(today());
  const weekEnd = addDays(weekStart, 6);

  const { data: profile, isError } = useQuery({
    queryKey: ["coach-athlete", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: stat } = useQuery({
    queryKey: ["coach-athlete-stat", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_stats").select("*").eq("user_id", id)
        .order("date", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });

  const { data: gym } = useQuery({
    queryKey: ["coach-athlete-gym", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts_gym").select("*").eq("user_id", id)
        .gte("date", toISODate(weekStart)).lte("date", toISODate(weekEnd))
        .order("date");
      return data ?? [];
    },
  });

  const { data: sport } = useQuery({
    queryKey: ["coach-athlete-sport", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts_sport").select("*").eq("user_id", id)
        .gte("date", toISODate(weekStart)).lte("date", toISODate(weekEnd))
        .order("date");
      return data ?? [];
    },
  });

  if (isError || (profile === null)) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">Kein Zugriff</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Du kannst diesen Athleten nur einsehen, wenn er ein aktives Mitglied deines Teams ist.
        </p>
        <Button asChild className="mt-4" variant="outline"><Link to="/team"><ArrowLeft className="mr-2 h-4 w-4" />Zurück</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/team"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="font-display text-2xl font-bold">{profile?.name ?? "Athlet"}</h1>
          <p className="text-xs text-muted-foreground">
            {profile?.sport ?? "–"} · Ziel: {profile?.goal ?? "–"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-neon/20 bg-neon-soft/40 p-3 text-xs text-muted-foreground">
        🔒 Ernährungslog, Food-Scans und Tagebuch dieses Athleten sind privat und für dich nicht sichtbar.
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<HeartPulse className="h-4 w-4" />} label="Letzter Check-in" value={stat ? stat.date : "–"}
          detail={stat ? `Schlaf ${stat.sleep_hours ?? "–"}h · Soreness ${stat.soreness ?? "–"}/5` : "kein Eintrag"} />
        <StatCard icon={<Dumbbell className="h-4 w-4" />} label="Gym diese Woche" value={String(gym?.length ?? 0)} />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Sport diese Woche" value={String(sport?.length ?? 0)} />
      </section>

      <section className="card-elevated p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4" /> Diese Woche</div>
        <div className="space-y-2">
          {[...(gym ?? []).map((g) => ({ ...g, k: "gym" as const })), ...(sport ?? []).map((s) => ({ ...s, k: "sport" as const }))]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((r: any) => (
              <div key={`${r.k}-${r.id}`} className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">
                    {r.k === "gym" ? `Gym · ${r.session_type}` : r.kind === "match" ? `Spiel (${r.match_hardness ?? "normal"})` : `Training (${r.intensity})`}
                  </div>
                  <div className="text-xs text-muted-foreground">{r.date} · Status {r.status}</div>
                </div>
              </div>
            ))}
          {(gym?.length ?? 0) + (sport?.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground">Nichts geloggt diese Woche.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
      {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}
