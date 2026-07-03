import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  addDays,
  isoDow,
  startOfWeek,
  toISODate,
  WEEKDAY_LONG,
} from "@/lib/dates";
import {
  generateWeekPlan,
  type AthleteProfile,
  type MatchHardness,
} from "@/lib/planner";
import { cn } from "@/lib/utils";
import { AlertTriangle, Flame } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({ meta: [{ title: "Wochenplan – Hybrid Athlete" }] }),
  component: PlanPage,
});

function PlanPage() {
  const qc = useQueryClient();
  const weekStart = startOfWeek();

  const { data, isLoading } = useQuery({
    queryKey: ["plan", toISODate(weekStart)],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const uid = u.user.id;
      const [profileRes, sportRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("workouts_sport")
          .select("id,date,kind,match_hardness,intensity,duration_min")
          .eq("user_id", uid)
          .gte("date", toISODate(weekStart))
          .lte("date", toISODate(addDays(weekStart, 6))),
      ]);
      if (profileRes.error) throw profileRes.error;
      const profile = profileRes.data;
      const sport = sportRes.data ?? [];
      return { profile, sport, uid };
    },
  });

  const setHardness = useMutation({
    mutationFn: async ({
      date,
      hardness,
    }: {
      date: string;
      hardness: MatchHardness;
    }) => {
      if (!data) return;
      const existing = data.sport.find(
        (s) => s.date === date && s.kind === "match",
      );
      if (existing) {
        const { error } = await supabase
          .from("workouts_sport")
          .update({ match_hardness: hardness })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workouts_sport").insert({
          user_id: data.uid,
          date,
          kind: "match",
          intensity: "high",
          match_hardness: hardness,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Spielhärte aktualisiert – Plan neu berechnet");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data)
    return <div className="py-20 text-center text-muted-foreground">Lade…</div>;

  const profile = data.profile;
  const ath: AthleteProfile = {
    sex: profile?.sex ?? null,
    height_cm: profile?.height_cm ? Number(profile.height_cm) : null,
    weight_kg: profile?.weight_kg ? Number(profile.weight_kg) : null,
    birth_date: profile?.birth_date ?? null,
    goal: profile?.goal ?? "performance",
    gym_days: profile?.gym_days ?? [],
    sport_days: profile?.sport_days ?? [],
    match_days: profile?.match_days ?? [],
    sport: profile?.sport ?? null,
  };

  const hardnessMap: Record<number, MatchHardness> = {};
  for (const s of data.sport) {
    if (s.kind === "match") {
      const d = new Date(s.date);
      hardnessMap[isoDow(d)] = (s.match_hardness ?? "normal") as MatchHardness;
    }
  }

  const plan = generateWeekPlan(ath, weekStart, hardnessMap, null);
  const todayIso = toISODate(new Date());

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Wochenplan</h1>
        <p className="text-sm text-muted-foreground">
          Automatisch aus deinem Rhythmus. Setze Spielhärte, um Beintraining zu blocken und
          Carbo-Loading auszulösen.
        </p>
      </div>

      <div className="space-y-2">
        {plan.map((slot) => (
          <div
            key={slot.date}
            className={cn(
              "card-elevated p-4",
              slot.date === todayIso && "border-neon",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {WEEKDAY_LONG[slot.dow]}
                  {slot.date === todayIso && (
                    <span className="rounded bg-neon-soft px-1.5 py-0.5 text-[9px] font-semibold text-neon">
                      HEUTE
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <SlotDot kind={slot.kind} />
                  <div className="font-display text-base font-semibold">{slot.label}</div>
                </div>
                <div className="text-sm text-muted-foreground">{slot.detail}</div>

                {slot.warning && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-warn">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{slot.warning}</span>
                  </div>
                )}
              </div>

              {slot.kind === "match" && (
                <div className="w-32">
                  <div className="mb-1 flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                    <Flame className="h-3 w-3" /> Härte
                  </div>
                  <Select
                    value={slot.hardness ?? "normal"}
                    onValueChange={(v) =>
                      setHardness.mutate({ date: slot.date, hardness: v as MatchHardness })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Locker</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="hard">Hart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card-elevated p-4 text-xs text-muted-foreground">
        <div className="mb-2 font-semibold text-foreground">Wie der Plan denkt</div>
        <ul className="space-y-1">
          <li>• Kein Beintraining in den 48h vor einem <strong>harten Spiel</strong>.</li>
          <li>• Am Vortag & Spieltag: automatisches Carbo-Loading (≈ 7–8 g/kg).</li>
          <li>• Bei niedrigem Recovery-Score wird die nächste harte Einheit zu Active Recovery.</li>
        </ul>
      </div>
    </div>
  );
}

function SlotDot({ kind }: { kind: string }) {
  const c: Record<string, string> = {
    match: "bg-danger",
    sport: "bg-chart-2",
    gym: "bg-neon",
    recovery: "bg-warn",
    rest: "bg-muted-foreground/30",
  };
  return <span className={cn("h-2.5 w-2.5 rounded-full", c[kind])} />;
}
