import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Lock, Dumbbell, Trophy, HeartPulse, CalendarDays, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toISODate, today, startOfWeek, addDays, isoDow, WEEKDAY_LONG } from "@/lib/dates";
import {
  applyOverrides,
  calcRecovery,
  generateWeekPlan,
  toAthleteProfile,
  type DailyStat,
  type GymSession,
  type MatchHardness as MatchHardnessType,
  type PlannedSlot,
  type SlotOverride,
  type SportSession,
} from "@/lib/planner";
import { RecoveryRing } from "@/components/dashboard/RecoveryRing";

/** Struktur des `weekly_planner.plan`-JSONB (siehe plan.tsx). */
interface PlannerPlan {
  overrides?: Record<string, SlotOverride>;
  snapshot?: PlannedSlot[];
}

export const Route = createFileRoute("/_authenticated/athletes/$id")({
  head: () => ({ meta: [{ title: "Athlet – Hybrid Athlete" }] }),
  component: AthleteView,
});

function AthleteView() {
  const { id } = Route.useParams();
  const weekStart = startOfWeek(today());
  const weekEnd = addDays(weekStart, 6);

  const { data: profile, isError, isPending } = useQuery({
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

  // Recovery-relevanter Trainings-Load der letzten 72h (analog dashboard.tsx).
  const recoveryWindowStart = toISODate(addDays(today(), -3));
  const todayIso = toISODate(today());

  const { data: recentSport } = useQuery({
    queryKey: ["coach-athlete-recent-sport", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts_sport")
        .select("date,kind,intensity,match_hardness,duration_min")
        .eq("user_id", id)
        .gte("date", recoveryWindowStart)
        .lt("date", todayIso);
      return (data ?? []) as SportSession[];
    },
  });

  const { data: recentGym } = useQuery({
    queryKey: ["coach-athlete-recent-gym", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts_gym")
        .select("date,session_type,duration_min")
        .eq("user_id", id)
        .gte("date", recoveryWindowStart)
        .lt("date", todayIso);
      return (data ?? []) as GymSession[];
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

  const { data: planner } = useQuery({
    queryKey: ["coach-athlete-planner", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_planner").select("plan,locked").eq("user_id", id)
        .eq("week_start", toISODate(weekStart)).maybeSingle();
      return data as unknown as { plan: PlannerPlan | null; locked: boolean | null } | null;
    },
  });

  if (isPending) {
    return <div className="py-20 text-center text-muted-foreground">Lade…</div>;
  }

  if (isError || profile === null) {
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

  // Recovery-Score des Athleten: nur mit aktuellem Check-in (heute/gestern) als
  // Basis, sonst reine Load-Schätzung (stat = null).
  const yesterdayIso = toISODate(addDays(today(), -1));
  const freshStat: DailyStat | null =
    stat && (stat.date === todayIso || stat.date === yesterdayIso)
      ? (stat as DailyStat)
      : null;
  const recovery = calcRecovery(freshStat, recentSport ?? [], recentGym ?? []);

  // Wochenplan des Athleten: bevorzugt der gesperrte Snapshot; falls keiner
  // hinterlegt ist, wird pragmatisch der Live-Plan aus dem Profil generiert
  // (Coach darf `profiles` bereits lesen – so sieht der Trainer immer einen Plan).
  // Nutzt denselben Recovery-Score wie oben, damit die Active-Recovery-Regel
  // hier konsistent mit Dashboard/Wochenplan des Athleten selbst greift.
  const isLocked = !!planner?.locked;
  const snapshot = planner?.plan?.snapshot;
  let planSlots: PlannedSlot[] | null = null;
  if (isLocked && snapshot) {
    planSlots = snapshot;
  } else if (profile) {
    const hardnessMap: Record<number, MatchHardnessType> = {};
    for (const s of sport ?? []) {
      if (s.kind === "match") {
        hardnessMap[isoDow(new Date(s.date))] = (s.match_hardness ?? "normal") as MatchHardnessType;
      }
    }
    planSlots = applyOverrides(
      generateWeekPlan(toAthleteProfile(profile), weekStart, hardnessMap, recovery.score),
      planner?.plan?.overrides ?? {},
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

      <section className="card-elevated flex flex-col items-center gap-3 p-5 sm:flex-row sm:items-center sm:gap-6">
        <RecoveryRing score={recovery.score} level={recovery.level} size={140} />
        <div className="text-center sm:text-left">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Recovery-Score</div>
          <div className="mt-1 font-display text-lg font-semibold">
            {recovery.level === "green"
              ? "Bereit"
              : recovery.level === "amber"
                ? "Vorsicht"
                : "Erschöpft"}
          </div>
          {freshStat ? (
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <MiniFactor label="Schlaf" value={`${recovery.factors.sleep}%`} />
              <MiniFactor label="Muskelkater" value={`${recovery.factors.soreness}%`} />
              <MiniFactor label="Load" value={`${recovery.factors.load}%`} />
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Kein aktueller Check-in – Score basiert nur auf Trainings-Load.
            </div>
          )}
        </div>
      </section>

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

      <section className="card-elevated p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CalendarRange className="h-4 w-4" /> Wochenplan
          {isLocked && snapshot && (
            <span className="rounded bg-neon-soft px-1.5 py-0.5 text-[9px] font-semibold text-neon">
              GESPERRT
            </span>
          )}
        </div>
        {planSlots && planSlots.length > 0 ? (
          <>
            {!(isLocked && snapshot) && (
              <div className="mb-2 text-xs text-muted-foreground">
                Kein gesperrter Plan hinterlegt – Live-Vorschau aus dem Rhythmus des Athleten.
              </div>
            )}
            <div className="space-y-2">
              {planSlots.map((slot) => (
                <div
                  key={slot.date}
                  className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {WEEKDAY_LONG[slot.dow]} · {slot.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{slot.detail}</div>
                  </div>
                  {slot.overridden && (
                    <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-warn">
                      angepasst
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Kein Plan verfügbar.</div>
        )}
      </section>
    </div>
  );
}

function MiniFactor({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-elevated p-2 text-center">
      <div className="font-display text-sm font-semibold tabular">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
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
