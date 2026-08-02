import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchRecoveryContext } from "@/lib/loadSignals";
import { supabase } from "@/integrations/supabase/client";
import {
  ageFrom,
  addDays,
  isoDow,
  parseISODate,
  startOfWeek,
  toISODate,
  WEEKDAY_LONG,
} from "@/lib/dates";
import {
  applyOverrides,
  calcRecovery,
  calcDailyMacros,
  generateWeekPlan,
  plannedGymFromSlot,
  plannedSportFromSlot,
  toAthleteProfile,
  type DailyStat,
  type GymSession,
  type PlannedSlot,
  type SlotOverride,
  type SportSession,
} from "@/lib/planner";
import { RecoveryRing } from "@/components/dashboard/RecoveryRing";
import { MacroRings } from "@/components/dashboard/MacroRings";
import { QueryError } from "@/components/ui/query-error";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  HeartPulse,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("onboarded, role")
      .eq("id", u.user.id)
      .maybeSingle();
    if (data?.role === "coach") throw redirect({ to: "/team" });
    if (!data?.onboarded) throw redirect({ to: "/onboarding" });
    return null;
  },
  head: () => ({
    meta: [{ title: "Dashboard – Hybrid Athlete" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const uid = u.user.id;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = toISODate(today);
      const yesterdayIso = toISODate(addDays(today, -1));
      const threeDaysAgo = toISODate(addDays(today, -3));
      const weekStart = startOfWeek(today);
      const weekEnd = addDays(weekStart, 6);

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
          .select("date,kind,intensity,match_hardness,duration_min")
          .eq("user_id", uid)
          .gte("date", threeDaysAgo)
          .lte("date", toISODate(weekEnd)),
        supabase
          .from("workouts_gym")
          .select("date,session_type,duration_min")
          .eq("user_id", uid)
          .gte("date", threeDaysAgo)
          .lte("date", toISODate(weekEnd)),
        supabase
          .from("weekly_planner")
          .select("plan,locked")
          .eq("user_id", uid)
          .eq("week_start", toISODate(weekStart))
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;

      const ctx = await fetchRecoveryContext(uid);
      const profile = profileRes.data;
      const stat: DailyStat | null = (statRes.data?.[0] as DailyStat | undefined) ?? null;
      const sport = (sportRes.data ?? []) as SportSession[];
      const gym = (gymRes.data ?? []) as GymSession[];
      const planner = plannerRes.data as unknown as {
        plan: { overrides?: Record<string, SlotOverride>; snapshot?: PlannedSlot[] } | null;
        locked: boolean | null;
      } | null;

      const recent = {
        sport: sport.filter((s) => s.date < todayIso && s.date >= threeDaysAgo),
        gym: gym.filter((g) => g.date < todayIso && g.date >= threeDaysAgo),
      };
      const recovery = calcRecovery(stat, recent.sport, recent.gym, ctx.device);

      const ath = toAthleteProfile(profile);

      // Match-Hardness pro Weekday (nur diese Woche)
      const matchHardness: Record<number, "easy" | "normal" | "hard"> = {};
      for (const s of sport) {
        if (s.kind === "match" && s.date >= toISODate(weekStart)) {
          const d = parseISODate(s.date);
          matchHardness[isoDow(d)] = (s.match_hardness ?? "normal") as never;
        }
      }

      // Wochenplan: bei gesperrter Woche Snapshot verwenden, sonst
      // Live-Plan + manuelle Overrides aus /plan.
      const generated = generateWeekPlan(ath, weekStart, matchHardness, recovery.score, ctx.signals);
      const plan: PlannedSlot[] =
        planner?.locked && planner.plan?.snapshot
          ? planner.plan.snapshot
          : applyOverrides(generated, planner?.plan?.overrides);
      const todaySlot = plan.find((p) => p.date === todayIso);
      const tomorrowSlot = plan.find((p) => p.date === toISODate(addDays(today, 1)));

      // Für Makros zählt tatsächlich geloggtes Training. Fehlt es, greifen
      // wir auf den geplanten Slot (inkl. manuellem Override) zurück, damit
      // Kalorien/Kohlenhydrate auch nach einer Plan-Anpassung reagieren.
      const todaySport: SportSession | undefined =
        sport.find((s) => s.date === todayIso) ?? plannedSportFromSlot(todaySlot);
      const todayGym: GymSession | undefined =
        gym.find((g) => g.date === todayIso) ?? plannedGymFromSlot(todaySlot);
      const tomorrowMatchHard = tomorrowSlot?.kind === "match" && tomorrowSlot.hardness === "hard";

      const macros = calcDailyMacros(
        ath,
        ageFrom(profile?.birth_date),
        todaySport,
        todayGym,
        tomorrowMatchHard,
      );

      // Nutrition heute
      const nutRes = await supabase
        .from("nutrition_logs")
        .select("kcal,protein_g,carbs_g,fat_g")
        .eq("user_id", uid)
        .eq("date", todayIso);
      const consumed = (nutRes.data ?? []).reduce(
        (acc, r) => ({
          kcal: acc.kcal + Number(r.kcal),
          protein_g: acc.protein_g + Number(r.protein_g),
          carbs_g: acc.carbs_g + Number(r.carbs_g),
          fat_g: acc.fat_g + Number(r.fat_g),
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      );

      const warnings = plan.filter((p) => p.date >= todayIso && p.warning).slice(0, 3);

      return {
        profile,
        recovery,
        macros,
        consumed,
        plan,
        todaySlot,
        tomorrowSlot,
        warnings,
        hasCheckin: !!stat && stat.date === todayIso,
      };
    },
  });

  // Optionaler Teaser: jüngste KI-Fortschrittsauswertung (nur summary-Feld).
  const { data: latestInsight } = useQuery({
    queryKey: ["dashboard-insight"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: row } = await supabase
        .from("progress_insights")
        .select("content,created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row?.content) return null;
      try {
        const parsed = JSON.parse(row.content) as { summary?: string };
        const summary = String(parsed.summary ?? "").trim();
        return summary ? { summary } : null;
      } catch (err) {
        console.warn("Insight-Content unlesbar:", err);
        return null;
      }
    },
  });

  if (isError) {
    return (
      <div className="py-20">
        <QueryError onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="py-20 text-center text-muted-foreground">Lade…</div>;
  }

  const { profile, recovery, macros, consumed, plan, todaySlot, warnings, hasCheckin } = data;
  const firstName = profile?.name?.split(" ")[0] ?? "Athlete";

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {WEEKDAY_LONG[isoDow(new Date())]}
          </div>
          <h1 className="font-display text-3xl font-bold">Hi, {firstName}</h1>
        </div>
        {!hasCheckin && (
          <Link
            to="/checkin"
            className="rounded-lg bg-neon px-3 py-2 text-xs font-semibold text-neon-foreground glow"
          >
            Check-in
          </Link>
        )}
      </div>

      {/* Recovery + Today */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated flex flex-col items-center justify-center p-5 md:col-span-1">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Recovery</div>
          <div className="mt-2">
            <RecoveryRing score={recovery.score} level={recovery.level} />
          </div>
          {!hasCheckin && (
            <div className="mt-2 text-center text-[11px] text-muted-foreground">
              Kein Check-in heute – Score ist eine Schätzung.
            </div>
          )}
        </div>

        <div className="card-elevated p-5 md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Heute</div>
              <div className="mt-1 font-display text-xl font-semibold">
                {todaySlot?.label ?? "Ruhetag"}
              </div>
              <div className="text-sm text-muted-foreground">{todaySlot?.detail}</div>
            </div>
            <SlotBadge kind={todaySlot?.kind ?? "rest"} />
          </div>

          {todaySlot?.warning && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-warn/10 p-3 text-xs text-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{todaySlot.warning}</span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <Stat label="Schlaf" value={`${recovery.factors.sleep}%`} />
            <Stat label="Muskelkater" value={`${recovery.factors.soreness}%`} />
            <Stat label="Load" value={`${recovery.factors.load}%`} />
          </div>
        </div>
      </div>

      {/* KI-Fortschritt Teaser */}
      {latestInsight && (
        <Link
          to="/insights"
          className="card-elevated flex items-start gap-3 p-4 transition hover:border-neon/40"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neon-soft text-neon">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              KI-Fortschritt
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-foreground">{latestInsight.summary}</p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="card-elevated p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" /> Hinweise diese Woche
          </div>
          <ul className="space-y-1.5 text-sm">
            {warnings.map((w) => (
              <li key={w.date} className="flex items-start gap-2">
                <span className="mt-0.5 rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                  {WEEKDAY_LONG[w.dow].slice(0, 2)}
                </span>
                <span>{w.warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Macros */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Utensils className="h-3.5 w-3.5" /> Ernährung heute
            {macros.carbLoading && (
              <span className="rounded-full bg-neon-soft px-2 py-0.5 text-[10px] font-semibold text-neon">
                Carbo-Loading
              </span>
            )}
          </div>
          <Link to="/nutrition" className="text-xs text-neon">
            Verwalten →
          </Link>
        </div>
        <MacroRings
          kcal={consumed.kcal}
          kcalTarget={macros.kcal}
          protein={consumed.protein_g}
          proteinTarget={macros.protein_g}
          carbs={consumed.carbs_g}
          carbsTarget={macros.carbs_g}
          fat={consumed.fat_g}
          fatTarget={macros.fat_g}
          carbLoading={macros.carbLoading}
        />
      </div>

      {/* Wochen-Vorschau */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Diese Woche
          </div>
          <Link to="/plan" className="text-xs text-neon flex items-center">
            Ganzer Plan <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {plan.map((p) => (
            <div
              key={p.date}
              className={cn(
                "rounded-lg border p-2 text-center",
                p.date === toISODate(new Date())
                  ? "border-neon bg-neon-soft"
                  : "border-border bg-card",
              )}
            >
              <div className="text-[10px] uppercase text-muted-foreground">
                {WEEKDAY_LONG[p.dow].slice(0, 2)}
              </div>
              <div className="mt-1 grid h-6 place-items-center">
                <SlotDot kind={p.kind} />
              </div>
              <div className="mt-1 text-[9px] leading-tight text-muted-foreground line-clamp-2">
                {p.label.replace("Gym · ", "")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction
          to="/checkin"
          icon={HeartPulse}
          label="Daily Check-in"
          hint={hasCheckin ? "Erledigt" : "Ausstehend"}
        />
        <QuickAction
          to="/nutrition"
          icon={Utensils}
          label="Mahlzeit loggen"
          hint="Manuell oder Scan"
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-elevated p-2 text-center">
      <div className="font-display text-sm font-semibold tabular">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SlotBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    match: "bg-danger/20 text-danger",
    sport: "bg-chart-2/20 text-chart-2",
    gym: "bg-neon-soft text-neon",
    recovery: "bg-warn/20 text-warn",
    rest: "bg-elevated text-muted-foreground",
  };
  return (
    <span className={cn("rounded-md px-2 py-1 text-[10px] font-semibold uppercase", map[kind])}>
      {kind === "gym"
        ? "GYM"
        : kind === "match"
          ? "SPIEL"
          : kind === "sport"
            ? "SPORT"
            : kind === "recovery"
              ? "RECOVERY"
              : "REST"}
    </span>
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

function QuickAction({
  to,
  icon: Icon,
  label,
  hint,
}: {
  to: string;
  icon: typeof HeartPulse;
  label: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="card-elevated flex items-center gap-3 p-4 transition hover:border-neon/40"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-neon-soft text-neon">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
