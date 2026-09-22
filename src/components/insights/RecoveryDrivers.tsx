import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeartPulse, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  recoveryDrivers,
  type DailyFactorRow,
  type FactorKey,
  type RecoveryDriver,
} from "@/lib/analytics/correlation";

type RecoveryMetric = "readiness" | "hrv" | "restingHr";

const FACTOR_LABEL: Record<FactorKey, string> = {
  sleepHours: "Schlafdauer",
  sleepQuality: "Schlafqualität",
  soreness: "Muskelkater",
  stress: "Stress",
  mood: "Stimmung",
};

const STRENGTH_LABEL: Record<RecoveryDriver["strength"], string> = {
  none: "kein",
  weak: "schwacher",
  moderate: "deutlicher",
  strong: "starker",
};

const METRIC_LABEL: Record<RecoveryMetric, string> = {
  readiness: "Training Readiness",
  hrv: "HRV",
  restingHr: "Ruhepuls",
};

const MIN_DAYS = 8;

function Header() {
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
      <HeartPulse className="h-3.5 w-3.5" /> Was beeinflusst deine Erholung?
    </div>
  );
}

export function RecoveryDrivers() {
  const { data, isLoading } = useQuery({
    queryKey: ["recovery-drivers"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const uid = u.user.id;
      const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
      const [stats, hrv, metrics, wellness] = await Promise.all([
        supabase
          .from("daily_stats")
          .select("date, sleep_hours, sleep_quality, soreness, stress, mood")
          .eq("user_id", uid)
          .gte("date", since),
        supabase
          .from("hrv_logs")
          .select("date, last_night_avg_ms")
          .eq("user_id", uid)
          .gte("date", since),
        supabase
          .from("user_metrics")
          .select("date, training_readiness")
          .eq("user_id", uid)
          .gte("date", since),
        supabase
          .from("wellness_daily")
          .select("date, resting_hr")
          .eq("user_id", uid)
          .gte("date", since),
      ]);
      return {
        stats: stats.data ?? [],
        hrv: hrv.data ?? [],
        metrics: metrics.data ?? [],
        wellness: wellness.data ?? [],
      };
    },
  });

  const view = useMemo(() => {
    if (!data) return null;
    const hrvByDate = new Map<string, number>();
    for (const h of data.hrv) {
      if (h.last_night_avg_ms != null) hrvByDate.set(h.date, Number(h.last_night_avg_ms));
    }
    const readyByDate = new Map<string, number>();
    for (const m of data.metrics) {
      if (m.training_readiness != null) readyByDate.set(m.date, Number(m.training_readiness));
    }
    const rhrByDate = new Map<string, number>();
    for (const w of data.wellness) {
      if (w.resting_hr != null) rhrByDate.set(w.date, Number(w.resting_hr));
    }

    const statDates = data.stats.map((s) => s.date);
    const overlap = (m: Map<string, number>) =>
      statDates.reduce((c, d) => c + (m.has(d) ? 1 : 0), 0);
    const candidates: { metric: RecoveryMetric; map: Map<string, number>; count: number }[] = [
      { metric: "readiness", map: readyByDate, count: overlap(readyByDate) },
      { metric: "hrv", map: hrvByDate, count: overlap(hrvByDate) },
      { metric: "restingHr", map: rhrByDate, count: overlap(rhrByDate) },
    ];
    candidates.sort((a, b) => b.count - a.count);
    const best = candidates[0]!;
    if (best.count < MIN_DAYS) return { metric: null, drivers: [] as RecoveryDriver[], samples: 0 };

    const rows: DailyFactorRow[] = data.stats.map((s) => {
      const raw = best.map.get(s.date) ?? null;
      // Ruhepuls invertieren, damit überall "höher = bessere Erholung" gilt.
      const recovery = raw == null ? null : best.metric === "restingHr" ? -raw : raw;
      return {
        date: s.date,
        sleepHours: s.sleep_hours ?? null,
        sleepQuality: s.sleep_quality ?? null,
        soreness: s.soreness ?? null,
        stress: s.stress ?? null,
        mood: s.mood ?? null,
        recovery,
      };
    });
    return { metric: best.metric, drivers: recoveryDrivers(rows, MIN_DAYS), samples: best.count };
  }, [data]);

  if (isLoading || !view) return null;

  if (view.metric === null || view.drivers.length === 0) {
    return (
      <div className="card-elevated space-y-2 p-4">
        <Header />
        <p className="text-sm text-muted-foreground">
          Noch zu wenige Daten. Trage regelmäßig deinen Daily Check-in ein und importiere deine
          Health-Daten (HRV oder Readiness) – dann zeigen wir hier, welche Faktoren deine Erholung
          am stärksten beeinflussen.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated space-y-3 p-4">
      <Header />
      <p className="text-xs text-muted-foreground">
        Zusammenhang deiner Check-in-Werte mit deiner Erholung (Metrik: {METRIC_LABEL[view.metric]},
        Datenbasis bis zu {view.samples} Tage). Ein Zusammenhang ist noch keine Ursache.
      </p>
      <ul className="space-y-2">
        {view.drivers.map((d) => (
          <DriverRow key={d.factor} driver={d} />
        ))}
      </ul>
    </div>
  );
}

function DriverRow({ driver }: { driver: RecoveryDriver }) {
  const up = driver.direction === "positive";
  const label = FACTOR_LABEL[driver.factor];
  return (
    <li className="flex items-start gap-2">
      <span className={cn("mt-0.5", up ? "text-[color:var(--success)]" : "text-[color:var(--danger)]")}>
        {up ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      </span>
      <div className="text-sm">
        <span className="font-semibold">{label}</span>{" "}
        <span className="text-muted-foreground">
          – {STRENGTH_LABEL[driver.strength]} Zusammenhang: mehr {label.toLowerCase()} →{" "}
          {up ? "bessere" : "schlechtere"} Erholung (r = {driver.r.toFixed(2)}, {driver.n} Tage)
        </span>
      </div>
    </li>
  );
}
