import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { addDays, isoDow, startOfWeek, toISODate, WEEKDAY_LONG } from "@/lib/dates";
import {
  applyOverrides,
  calcRecovery,
  generateWeekPlan,
  toAthleteProfile,
  type DailyStat,
  type GymSession,
  type GymType,
  type MatchHardness,
  type PlannedSlot,
  type SlotOverride,
  type SportSession,
} from "@/lib/planner";
import { QueryError } from "@/components/ui/query-error";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AlertTriangle, Flame, Lock, Pencil, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { humanError } from "@/lib/errors";

/** Auswahl-Optionen für manuelle Slot-Overrides. */
const OVERRIDE_OPTIONS: {
  value: string;
  label: string;
  build: () => SlotOverride;
}[] = [
  {
    value: "push",
    label: "Gym · Push",
    build: () => ({
      kind: "gym",
      sessionType: "push",
      label: "Gym · Push",
      detail: "Brust · Schulter · Trizeps",
    }),
  },
  {
    value: "pull",
    label: "Gym · Pull",
    build: () => ({
      kind: "gym",
      sessionType: "pull",
      label: "Gym · Pull",
      detail: "Rücken · Bizeps",
    }),
  },
  {
    value: "legs",
    label: "Gym · Beine",
    build: () => ({
      kind: "gym",
      sessionType: "legs",
      label: "Gym · Beine",
      detail: "Beine · Glutes · Core",
    }),
  },
  {
    value: "upper",
    label: "Gym · Oberkörper",
    build: () => ({
      kind: "gym",
      sessionType: "upper",
      label: "Gym · Oberkörper",
      detail: "Oberkörper leicht",
    }),
  },
  {
    value: "lower",
    label: "Gym · Unterkörper",
    build: () => ({
      kind: "gym",
      sessionType: "lower",
      label: "Gym · Unterkörper",
      detail: "Unterkörper leicht",
    }),
  },
  {
    value: "full",
    label: "Gym · Ganzkörper",
    build: () => ({
      kind: "gym",
      sessionType: "full",
      label: "Gym · Ganzkörper",
      detail: "Ganzkörper",
    }),
  },
  {
    value: "mobility",
    label: "Mobility",
    build: () => ({
      kind: "gym",
      sessionType: "mobility",
      label: "Mobility",
      detail: "Beweglichkeit & Faszien",
    }),
  },
  {
    value: "recovery",
    label: "Active Recovery",
    build: () => ({
      kind: "recovery",
      label: "Active Recovery",
      detail: "Mobility, Stretching, Zone-1 20 min",
    }),
  },
  {
    value: "rest",
    label: "Ruhetag",
    build: () => ({ kind: "rest", label: "Ruhetag", detail: "Erholung" }),
  },
];

/** Struktur des `weekly_planner.plan`-JSONB. */
interface PlannerPlan {
  overrides?: Record<string, SlotOverride>;
  snapshot?: PlannedSlot[];
}

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({ meta: [{ title: "Wochenplan – Hybrid Athlete" }] }),
  component: PlanPage,
});

function PlanPage() {
  const qc = useQueryClient();
  const weekStart = startOfWeek();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["plan", toISODate(weekStart)],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const uid = u.user.id;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = toISODate(today);
      const yesterdayIso = toISODate(addDays(today, -1));
      const threeDaysAgo = toISODate(addDays(today, -3));
      const weekEndIso = toISODate(addDays(weekStart, 6));

      // Bereich erweitert um die letzten 3 Tage vor "heute" (für den
      // Recovery-Score), damit generateWeekPlan – wie im Dashboard – die
      // echte Trainingslast berücksichtigt statt (Bug) immer `null`.
      const [profileRes, statRes, sportRes, gymRes, plannerRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("daily_stats")
          .select("*")
          .eq("user_id", uid)
          .in("date", [todayIso, yesterdayIso])
          .order("date", { ascending: false })
          .limit(1),
        supabase
          .from("workouts_sport")
          .select("id,date,kind,match_hardness,intensity,duration_min")
          .eq("user_id", uid)
          .gte("date", threeDaysAgo)
          .lte("date", weekEndIso),
        supabase
          .from("workouts_gym")
          .select("date,session_type,duration_min")
          .eq("user_id", uid)
          .gte("date", threeDaysAgo)
          .lte("date", weekEndIso),
        supabase
          .from("weekly_planner")
          .select("plan,locked")
          .eq("user_id", uid)
          .eq("week_start", toISODate(weekStart))
          .maybeSingle(),
      ]);
      if (profileRes.error) throw profileRes.error;
      const profile = profileRes.data;
      const stat = (statRes.data?.[0] as DailyStat | undefined) ?? null;
      const allSport = (sportRes.data ?? []) as SportSession[];
      const allGym = (gymRes.data ?? []) as GymSession[];
      // Für die Wochen-Anzeige (Härte-Auswahl etc.) nur die tatsächliche Woche.
      const sport = allSport.filter((s) => s.date >= toISODate(weekStart) && s.date <= weekEndIso);
      // Für den Recovery-Score: dieselbe 72h-Logik wie im Dashboard.
      const recentSport = allSport.filter((s) => s.date < todayIso && s.date >= threeDaysAgo);
      const recentGym = allGym.filter((g) => g.date < todayIso && g.date >= threeDaysAgo);
      const recovery = calcRecovery(stat, recentSport, recentGym);
      const planner = plannerRes.data as unknown as {
        plan: PlannerPlan | null;
        locked: boolean | null;
      } | null;
      return { profile, sport, uid, planner, recoveryScore: recovery.score };
    },
  });

  const setHardness = useMutation({
    mutationFn: async ({ date, hardness }: { date: string; hardness: MatchHardness }) => {
      if (!data) return;
      const existing = data.sport.find((s) => s.date === date && s.kind === "match");
      if (existing?.id) {
        const { error } = await supabase
          .from("workouts_sport")
          .update({ match_hardness: hardness })
          .eq("id", existing.id);
        if (error) throw error;
      } else if (existing) {
        return;
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
    onError: (e) => toast.error(humanError(e)),
  });

  const overrideSlot = useMutation({
    mutationFn: async ({ date, override }: { date: string; override: SlotOverride | null }) => {
      if (!data) return;
      const { data: row } = await supabase
        .from("weekly_planner")
        .select("plan")
        .eq("user_id", data.uid)
        .eq("week_start", toISODate(weekStart))
        .maybeSingle();
      const current = (row?.plan as unknown as PlannerPlan | null) ?? {};
      const overrides = { ...(current.overrides ?? {}) };
      if (override === null) {
        delete overrides[date];
      } else {
        overrides[date] = override;
      }
      const plan: PlannerPlan = { ...current, overrides };
      const { error } = await supabase.from("weekly_planner").upsert(
        {
          user_id: data.uid,
          week_start: toISODate(weekStart),
          plan: plan as unknown as Json,
        },
        { onConflict: "user_id,week_start" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Plan angepasst");
    },
    onError: (e) => toast.error(humanError(e)),
  });

  const toggleLock = useMutation({
    mutationFn: async ({ locked, slots }: { locked: boolean; slots: PlannedSlot[] }) => {
      if (!data) return;
      const { data: row } = await supabase
        .from("weekly_planner")
        .select("plan")
        .eq("user_id", data.uid)
        .eq("week_start", toISODate(weekStart))
        .maybeSingle();
      const current = (row?.plan as unknown as PlannerPlan | null) ?? {};
      let plan: PlannerPlan;
      if (locked) {
        // Aktuell angezeigte (ggf. override-angewendete) Slots einfrieren.
        plan = { ...current, snapshot: slots };
      } else {
        // Snapshot entfernen, Overrides beibehalten.
        const { snapshot: _drop, ...rest } = current;
        plan = rest;
      }
      const { error } = await supabase.from("weekly_planner").upsert(
        {
          user_id: data.uid,
          week_start: toISODate(weekStart),
          plan: plan as unknown as Json,
          locked,
        },
        { onConflict: "user_id,week_start" },
      );
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["plan"] });
      toast.success(vars.locked ? "Woche gesperrt" : "Woche entsperrt");
    },
    onError: (e) => toast.error(humanError(e)),
  });

  if (isError)
    return (
      <div className="py-20">
        <QueryError onRetry={() => refetch()} />
      </div>
    );

  if (isLoading || !data)
    return <div className="py-20 text-center text-muted-foreground">Lade…</div>;

  const profile = data.profile;
  const ath = toAthleteProfile(profile);

  const hardnessMap: Record<number, MatchHardness> = {};
  for (const s of data.sport) {
    if (s.kind === "match") {
      const d = new Date(s.date);
      hardnessMap[isoDow(d)] = (s.match_hardness ?? "normal") as MatchHardness;
    }
  }

  const planner = data.planner;
  const locked = !!planner?.locked;
  const overrides = planner?.plan?.overrides ?? {};

  // Gesperrte Woche mit Snapshot → eingefrorene Slots direkt verwenden.
  // Sonst: Live-Plan generieren und manuelle Overrides anwenden.
  const plan: PlannedSlot[] =
    locked && planner?.plan?.snapshot
      ? planner.plan.snapshot
      : applyOverrides(
          generateWeekPlan(ath, weekStart, hardnessMap, data.recoveryScore),
          overrides,
        );
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

      <div className="card-elevated flex items-center justify-between p-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lock className="h-4 w-4" /> Woche sperren
          </div>
          <div className="text-xs text-muted-foreground">
            Gesperrte Wochen werden nicht mehr automatisch neu berechnet.
          </div>
        </div>
        <Switch
          checked={locked}
          disabled={toggleLock.isPending}
          onCheckedChange={(v) => toggleLock.mutate({ locked: v, slots: plan })}
        />
      </div>

      <div className="space-y-2">
        {plan.map((slot) => (
          <div
            key={slot.date}
            className={cn("card-elevated p-4", slot.date === todayIso && "border-neon")}
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
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <SlotDot kind={slot.kind} />
                  <div className="font-display text-base font-semibold">{slot.label}</div>
                  {slot.overridden && (
                    <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-warn">
                      Manuell angepasst
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{slot.detail}</div>

                {slot.overridden && !locked && (
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    disabled={overrideSlot.isPending}
                    onClick={() => overrideSlot.mutate({ date: slot.date, override: null })}
                  >
                    <RotateCcw className="h-3 w-3" /> Zurücksetzen
                  </button>
                )}

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
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Locker</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="hard">Hart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {slot.kind !== "match" && !locked && (
                <div className="w-36">
                  <div className="mb-1 flex items-center gap-1 text-[10px] uppercase text-muted-foreground">
                    <Pencil className="h-3 w-3" /> Anpassen
                  </div>
                  <Select
                    value={overrideValueFor(slot, overrides)}
                    onValueChange={(v) => {
                      const opt = OVERRIDE_OPTIONS.find((o) => o.value === v);
                      if (opt) {
                        overrideSlot.mutate({ date: slot.date, override: opt.build() });
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OVERRIDE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
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
          <li>
            • Kein Beintraining in den 48h vor einem <strong>harten Spiel</strong>.
          </li>
          <li>• Am Vortag & Spieltag: automatisches Carbo-Loading (≈ 7–8 g/kg).</li>
          <li>• Bei niedrigem Recovery-Score wird die nächste harte Einheit zu Active Recovery.</li>
        </ul>
      </div>
    </div>
  );
}

/** Ermittelt den passenden Select-Wert für den aktuellen (ggf. überschriebenen) Slot. */
function overrideValueFor(slot: PlannedSlot, overrides: Record<string, SlotOverride>): string {
  const ov = overrides[slot.date];
  const sessionType: GymType | undefined = ov?.sessionType ?? slot.sessionType;
  const kind = ov?.kind ?? slot.kind;
  if (sessionType && OVERRIDE_OPTIONS.some((o) => o.value === sessionType)) {
    return sessionType;
  }
  if (kind === "recovery") return "recovery";
  if (kind === "rest") return "rest";
  // Fallback (z. B. sport-Tage ohne passende Option): erste Option.
  return OVERRIDE_OPTIONS[0].value;
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
