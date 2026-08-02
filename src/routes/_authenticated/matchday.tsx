import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Timer,
  Utensils,
  Droplets,
  Activity,
  HeartPulse,
  Moon,
  Apple,
  CalendarClock,
} from "lucide-react";
import { buildMatchdayPlan, formatCountdown, type CountdownItem } from "@/lib/matchday";
import { toAthleteProfile, sportName } from "@/lib/planner";
import { humanError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toISODate } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/matchday")({
  head: () => ({
    meta: [
      { title: "Spieltag-Countdown – Hybrid Athlete" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MatchdayPage,
});

const ICONS: Record<CountdownItem["icon"], typeof Timer> = {
  meal: Utensils,
  snack: Apple,
  drink: Droplets,
  warmup: Activity,
  recovery: HeartPulse,
  sleep: Moon,
};

function ageFrom(birth: string | null): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86_400_000));
}

function MatchdayPage() {
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["matchday"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const today = toISODate(new Date());
      const [prof, match] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase
          .from("workouts_sport")
          .select("id,date,kind,match_hardness,kickoff_at,opponent,location")
          .eq("user_id", u.user.id)
          .eq("kind", "match")
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      return { profile: prof.data, match: match.data };
    },
  });

  const [form, setForm] = useState({ time: "15:00", opponent: "", location: "" });
  useEffect(() => {
    if (data?.match) {
      setForm({
        time: data.match.kickoff_at
          ? new Date(data.match.kickoff_at).toTimeString().slice(0, 5)
          : "15:00",
        opponent: data.match.opponent ?? "",
        location: data.match.location ?? "",
      });
    }
  }, [data?.match]);

  const saveKickoff = useMutation({
    mutationFn: async () => {
      if (!data?.match) throw new Error("Kein Spiel geplant");
      const kickoff = new Date(`${data.match.date}T${form.time}:00`);
      const { error } = await supabase
        .from("workouts_sport")
        .update({
          kickoff_at: kickoff.toISOString(),
          opponent: form.opponent || null,
          location: form.location || null,
        })
        .eq("id", data.match.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matchday"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Spieltag aktualisiert");
    },
    onError: (e) => toast.error(humanError(e)),
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Lade…</div>;

  const match = data?.match;
  const profile = toAthleteProfile(data?.profile);
  const sportLabel = sportName(data?.profile?.sport);

  if (!match) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 pb-8">
        <h1 className="font-display text-3xl font-bold">Spieltag</h1>
        <div className="card-elevated space-y-3 p-6 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Kein kommendes Spiel eingetragen. Lege im Sport-Log ein Spiel an, dann bekommst du hier
            deinen Countdown mit Ess- und Trinkplan.
          </p>
          <Button asChild>
            <Link to="/sport">Zum Sport-Log</Link>
          </Button>
        </div>
      </div>
    );
  }

  const kickoffAt = match.kickoff_at ?? `${match.date}T15:00:00`;
  const plan = buildMatchdayPlan({
    profile,
    ageYears: ageFrom(data?.profile?.birth_date ?? null),
    kickoffAt,
    hardness: (match.match_hardness ?? "normal") as "easy" | "normal" | "hard",
    now: new Date(Date.now() + tick * 0),
  });

  const upcoming = plan.items.filter((i) => !i.done);
  const next = upcoming[0];

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Spieltag</h1>
        <p className="text-sm text-muted-foreground">
          {sportLabel}
          {match.opponent ? ` vs. ${match.opponent}` : ""} ·{" "}
          {new Date(kickoffAt).toLocaleString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {match.location ? ` · ${match.location}` : ""}
        </p>
      </div>

      <div className="card-elevated space-y-1 p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Timer className="h-4 w-4" />
          {plan.minutesToKickoff > 0
            ? "Bis zum Anstoß"
            : plan.phase === "live"
              ? "Spiel läuft"
              : "Nach dem Spiel"}
        </div>
        <div className="font-display text-4xl font-bold text-primary">
          {formatCountdown(plan.minutesToKickoff)}
        </div>
        {next && (
          <p className="pt-2 text-sm text-muted-foreground">
            Als Nächstes: <span className="text-foreground">{next.title}</span> um{" "}
            {new Date(next.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Carbs vorher" value={`${plan.preCarbsG} g`} />
        <Stat label="Flüssigkeit" value={`${plan.preFluidMl} ml`} />
        <Stat label="Recovery-Protein" value={`${plan.recoveryProteinG} g`} />
      </div>

      <div className="card-elevated p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Ablaufplan</h2>
        <ol className="space-y-3">
          {plan.items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <li
                key={item.offsetMin}
                className={cn(
                  "flex gap-3 rounded-lg border border-border p-3",
                  item.done ? "opacity-50" : "bg-elevated/40",
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.at).toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {item.offsetMin >= 0 ? "vor" : "nach"} Anstoß
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="card-elevated space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Anstoß & Gegner</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Anstoßzeit</Label>
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
          <div>
            <Label>Gegner</Label>
            <Input
              value={form.opponent}
              onChange={(e) => setForm({ ...form, opponent: e.target.value })}
              placeholder="z. B. SV Muster"
            />
          </div>
        </div>
        <div>
          <Label>Ort</Label>
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Heim / Auswärts"
          />
        </div>
        <Button
          className="w-full"
          onClick={() => saveKickoff.mutate()}
          disabled={saveKickoff.isPending}
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-elevated p-4 text-center">
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
