import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";
import { Info, Loader2, Moon, Activity, HeartPulse, Gauge, FileUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  buildLoadSeries,
  weeklyVolume,
  withinDays,
  type AnalyticsActivity,
  type Thresholds,
} from "@/lib/analytics/aggregate";
import { acwrZone, fosterMonotony } from "@/lib/analytics/load";
import { racePredictions } from "@/lib/analytics/predictions";
import { bestRunEffort, computeRecords, type RecordActivity } from "@/lib/analytics/records";
import { hrZones, powerZones } from "@/lib/analytics/zones";
import { efficiencyFactor } from "@/lib/analytics/efficiency";

const RANGES = [
  { key: "30", label: "30 Tage", days: 30 },
  { key: "90", label: "90 Tage", days: 90 },
  { key: "365", label: "1 Jahr", days: 365 },
  { key: "all", label: "Alles", days: null },
] as const;

/** Kurzer Erklärtext neben jeder Kennzahl. */
function Explain({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger aria-label="Erklärung" className="text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

function fmtTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "–";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

const loadConfig = {
  ctl: { label: "Fitness (CTL)", color: "var(--chart-2)" },
  atl: { label: "Ermüdung (ATL)", color: "var(--warn)" },
  tsb: { label: "Form (TSB)", color: "var(--success)" },
} satisfies ChartConfig;

const volumeConfig = {
  run: { label: "Laufen", color: "var(--chart-1)" },
  bike: { label: "Rad", color: "var(--chart-2)" },
  swim: { label: "Schwimmen", color: "var(--chart-3)" },
  other: { label: "Sonstiges", color: "var(--chart-4)" },
} satisfies ChartConfig;

const sleepConfig = {
  deep: { label: "Tiefschlaf", color: "var(--chart-2)" },
  light: { label: "Leichtschlaf", color: "var(--chart-3)" },
  rem: { label: "REM", color: "var(--chart-1)" },
  awake: { label: "Wach", color: "var(--warn)" },
} satisfies ChartConfig;

export function AnalyticsView({ userId, readOnly = false }: { userId: string; readOnly?: boolean }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("90");
  const days = RANGES.find((r) => r.key === range)!.days;

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", userId],
    queryFn: async () => {
      const [acts, wellness, sleep, hrv, metrics, profile] = await Promise.all([
        supabase
          .from("activities")
          .select(
            "id, sport, started_at, duration_s, moving_duration_s, distance_m, avg_hr, avg_speed_mps, normalized_power_w, avg_power_w, elevation_gain_m, avg_vertical_ratio, avg_ground_contact_ms, avg_stride_length_m",
          )
          .eq("user_id", userId)
          .eq("route_only", false)
          .order("started_at", { ascending: true, nullsFirst: false })
          .limit(2000),
        supabase
          .from("wellness_daily")
          .select(
            "date, resting_hr, avg_stress, body_battery_min, body_battery_max, steps, avg_spo2",
          )
          .eq("user_id", userId)
          .order("date", { ascending: true })
          .limit(1000),
        supabase
          .from("sleep_logs")
          .select("date, duration_s, deep_s, light_s, rem_s, awake_s, sleep_score, avg_sleep_hrv_ms")
          .eq("user_id", userId)
          .order("date", { ascending: true })
          .limit(1000),
        supabase
          .from("hrv_logs")
          .select("date, last_night_avg_ms, baseline_low_ms, baseline_high_ms, status")
          .eq("user_id", userId)
          .order("date", { ascending: true })
          .limit(1000),
        supabase
          .from("user_metrics")
          .select(
            "date, vo2max_running, vo2max_cycling, lactate_threshold_hr, lactate_threshold_speed_mps, ftp_w, training_status, training_readiness",
          )
          .eq("user_id", userId)
          .order("date", { ascending: true })
          .limit(1000),
        supabase.from("profiles").select("sex, birth_date").eq("id", userId).maybeSingle(),
      ]);
      return {
        activities: acts.data ?? [],
        wellness: wellness.data ?? [],
        sleep: sleep.data ?? [],
        hrv: hrv.data ?? [],
        metrics: metrics.data ?? [],
        profile: profile.data ?? null,
      };
    },
  });

  const view = useMemo(() => {
    if (!data) return null;
    const latestMetric = data.metrics[data.metrics.length - 1] ?? null;
    const latestWellness = data.wellness[data.wellness.length - 1] ?? null;
    const maxHrFromData = data.activities.reduce<number>(
      (m, a) => Math.max(m, Number(a.avg_hr ?? 0)),
      0,
    );
    const thresholds: Thresholds = {
      maxHr: latestMetric?.lactate_threshold_hr
        ? Math.round(latestMetric.lactate_threshold_hr / 0.9)
        : maxHrFromData > 0
          ? Math.round(maxHrFromData * 1.15)
          : null,
      restHr: latestWellness?.resting_hr ?? null,
      lthr: latestMetric?.lactate_threshold_hr ?? null,
      thresholdSpeedMps: latestMetric?.lactate_threshold_speed_mps ?? null,
      ftpW: latestMetric?.ftp_w ?? null,
      cssMps: null,
      sex: (data.profile?.sex ?? null) as Thresholds["sex"],
    };

    const activities = data.activities as unknown as AnalyticsActivity[];
    const series = withinDays(buildLoadSeries(activities, thresholds), days);
    const last = series[series.length - 1] ?? null;
    const weekly = withinDays(
      weeklyVolume(activities).map((w) => ({ ...w, date: w.week })),
      days,
    );
    const foster = fosterMonotony(series.slice(-7).map((s) => s.tss));

    const records = computeRecords(data.activities as unknown as RecordActivity[]);
    const vo2 = latestMetric?.vo2max_running ?? null;
    const predictions = racePredictions(bestRunEffort(records), vo2);

    const effTrend = activities
      .filter((a) => a.avg_hr && a.avg_speed_mps && a.started_at)
      .map((a) => ({
        date: a.started_at!.slice(0, 10),
        ef: efficiencyFactor(a.avg_speed_mps, a.avg_hr) ?? 0,
      }));

    const dynamics = (data.activities as unknown as Record<string, number | string | null>[])
      .filter((a) => a["avg_vertical_ratio"] != null || a["avg_ground_contact_ms"] != null)
      .map((a) => ({
        date: String(a["started_at"] ?? "").slice(0, 10),
        vr: Number(a["avg_vertical_ratio"] ?? 0),
        gct: Number(a["avg_ground_contact_ms"] ?? 0),
        stride: Number(a["avg_stride_length_m"] ?? 0),
      }));

    const lastWellnessDate =
      [
        data.wellness[data.wellness.length - 1]?.date,
        data.sleep[data.sleep.length - 1]?.date,
        data.hrv[data.hrv.length - 1]?.date,
      ]
        .filter(Boolean)
        .sort()
        .pop() ?? null;

    return {
      thresholds,
      series,
      last,
      weekly,
      foster,
      predictions,
      vo2,
      latestMetric,
      effTrend: withinDays(effTrend, days),
      dynamics: withinDays(dynamics, days),
      sleep: withinDays(data.sleep, days),
      hrv: withinDays(data.hrv, days),
      wellness: withinDays(data.wellness, days),
      vo2Trend: withinDays(
        data.metrics
          .filter((m) => m.vo2max_running != null || m.vo2max_cycling != null)
          .map((m) => ({
            date: m.date,
            run: Number(m.vo2max_running ?? 0),
            bike: Number(m.vo2max_cycling ?? 0),
          })),
        days,
      ),
      lastWellnessDate,
    };
  }, [data, days]);

  if (isLoading || !view) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const zone = acwrZone(view.last?.acwr ?? null);
  const zoneLabel: Record<string, string> = {
    low: "Unterbelastung",
    optimal: "Optimal",
    elevated: "Erhöht",
    high: "Verletzungsrisiko",
  };
  const zoneVariant: Record<string, string> = {
    low: "text-muted-foreground",
    optimal: "text-[color:var(--success)]",
    elevated: "text-[color:var(--warn)]",
    high: "text-[color:var(--danger)]",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.key}
            size="sm"
            variant={range === r.key ? "default" : "outline"}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </Button>
        ))}
        {!readOnly && (
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            {view.lastWellnessDate
              ? `Gesundheitsdaten bis ${new Date(view.lastWellnessDate).toLocaleDateString("de-DE")}`
              : "Noch keine Gesundheitsdaten"}
            <Button asChild size="sm" variant="ghost">
              <Link to="/import">
                <FileUp className="mr-1 h-3.5 w-3.5" /> Aktualisieren
              </Link>
            </Button>
          </span>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="load">Belastung</TabsTrigger>
          <TabsTrigger value="endurance">Ausdauer</TabsTrigger>
          <TabsTrigger value="efficiency">Effizienz</TabsTrigger>
          <TabsTrigger value="sleep">Schlaf &amp; Erholung</TabsTrigger>
        </TabsList>

        {/* ---------------- Übersicht ---------------- */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              icon={<Activity className="h-4 w-4 text-primary" />}
              label="Fitness (CTL)"
              value={view.last ? view.last.ctl.toFixed(0) : "–"}
              hint="Gleitender 42-Tage-Schnitt deiner Trainingsbelastung. Steigt langsam – höher heißt belastbarer."
            />
            <Metric
              icon={<Gauge className="h-4 w-4 text-primary" />}
              label="Form (TSB)"
              value={view.last ? view.last.tsb.toFixed(0) : "–"}
              hint="Fitness minus Ermüdung. −10 bis +5 ist gutes Training, unter −30 droht Übertraining, über +15 bist du frisch."
            />
            <Metric
              icon={<HeartPulse className="h-4 w-4 text-primary" />}
              label="ACWR"
              value={view.last?.acwr != null ? view.last.acwr.toFixed(2) : "–"}
              hint="Verhältnis der letzten 7 zu den letzten 28 Tagen. 0,8–1,3 ist optimal, über 1,5 steigt das Verletzungsrisiko."
              extra={
                zone ? (
                  <span className={zoneVariant[zone]}>{zoneLabel[zone]}</span>
                ) : null
              }
            />
            <Metric
              icon={<Moon className="h-4 w-4 text-primary" />}
              label="Sleep Score"
              value={
                view.sleep.length ? String(view.sleep[view.sleep.length - 1]!.sleep_score ?? "–") : "–"
              }
              hint="Garmin-Bewertung der letzten Nacht (0–100). Ab 80 gilt der Schlaf als erholsam."
            />
          </div>
          {!view.series.length && (
            <EmptyHint text="Noch keine Aktivitäten im gewählten Zeitraum. Importiere deinen Garmin-Export, um Auswertungen zu sehen." />
          )}
        </TabsContent>

        {/* ---------------- Belastung ---------------- */}
        <TabsContent value="load" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Fitness, Ermüdung, Form
                <Explain text="CTL = Fitness (42 Tage), ATL = Ermüdung (7 Tage), TSB = Form. Ein Formtief nach harten Wochen ist normal, dauerhaft unter −30 nicht." />
              </CardTitle>
              <CardDescription>Belastungsverlauf im gewählten Zeitraum</CardDescription>
            </CardHeader>
            <CardContent>
              {view.series.length ? (
                <ChartContainer config={loadConfig} className="h-64 w-full">
                  <AreaChart data={view.series}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={32} />
                    <YAxis width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area dataKey="ctl" stroke="var(--color-ctl)" fill="var(--color-ctl)" fillOpacity={0.2} />
                    <Area dataKey="atl" stroke="var(--color-atl)" fill="var(--color-atl)" fillOpacity={0.1} />
                    <Area dataKey="tsb" stroke="var(--color-tsb)" fill="var(--color-tsb)" fillOpacity={0.1} />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <EmptyHint text="Keine Belastungsdaten im Zeitraum." />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Wochenvolumen
                  <Explain text="Trainingsminuten je Sportart pro Woche. Sprünge über 10 % pro Woche gelten als riskant." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {view.weekly.length ? (
                  <ChartContainer config={volumeConfig} className="h-56 w-full">
                    <BarChart data={view.weekly}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="week" tickFormatter={fmtDate} minTickGap={24} />
                      <YAxis width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="run" stackId="v" fill="var(--color-run)" />
                      <Bar dataKey="bike" stackId="v" fill="var(--color-bike)" />
                      <Bar dataKey="swim" stackId="v" fill="var(--color-swim)" />
                      <Bar dataKey="other" stackId="v" fill="var(--color-other)" />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <EmptyHint text="Keine Einheiten im Zeitraum." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Monotonie &amp; Strain
                  <Explain text="Foster: Monotonie über 2,0 bedeutet zu gleichförmiges Training, hoher Strain erhöht das Infekt- und Verletzungsrisiko." />
                </CardTitle>
                <CardDescription>Letzte 7 Tage</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Wochenlast" value={view.foster.weeklyLoad.toFixed(0)} />
                <Stat label="Monotonie" value={view.foster.monotony?.toFixed(2) ?? "–"} />
                <Stat label="Strain" value={view.foster.strain?.toFixed(0) ?? "–"} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- Ausdauer ---------------- */}
        <TabsContent value="endurance" className="space-y-4 pt-4">
          {view.vo2Trend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  VO2max-Verlauf
                  <Explain text="Maximale Sauerstoffaufnahme laut Uhr. Für ambitionierte Amateure sind 50–60 ml/kg/min ein guter Bereich." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    run: { label: "Laufen", color: "var(--chart-1)" },
                    bike: { label: "Rad", color: "var(--chart-2)" },
                  }}
                  className="h-56 w-full"
                >
                  <LineChart data={view.vo2Trend}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={32} />
                    <YAxis width={36} domain={["dataMin - 2", "dataMax + 2"]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="run" stroke="var(--color-run)" dot={false} />
                    <Line dataKey="bike" stroke="var(--color-bike)" dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Schwellenwerte &amp; Zonen
                  <Explain text="Die Laktatschwelle ist das Tempo, das du rund eine Stunde halten kannst. Zonen darüber trainieren VO2max, darunter die Grundlage." />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Schwellenpuls" value={view.thresholds.lthr ? `${view.thresholds.lthr} bpm` : "–"} />
                <Row
                  label="Schwellentempo"
                  value={
                    view.thresholds.thresholdSpeedMps
                      ? `${fmtTime(1000 / view.thresholds.thresholdSpeedMps)} min/km`
                      : "–"
                  }
                />
                <Row label="FTP" value={view.thresholds.ftpW ? `${view.thresholds.ftpW} W` : "–"} />
                <div className="space-y-1 pt-2">
                  {hrZones(view.thresholds.maxHr, view.thresholds.lthr).map((z) => (
                    <div key={z.index} className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Z{z.index} · {z.label}
                      </span>
                      <span className="tabular-nums">
                        {z.from}–{z.to} bpm
                      </span>
                    </div>
                  ))}
                  {powerZones(view.thresholds.ftpW).map((z) => (
                    <div key={`p${z.index}`} className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        P{z.index} · {z.label}
                      </span>
                      <span className="tabular-nums">
                        {z.from}–{z.to} W
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Wettkampfprognosen
                  <Explain text="Riegel rechnet eine Bestzeit auf andere Distanzen hoch, die VO2max-Prognose nach Daniels/Gilbert nutzt deine Uhr-Werte." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2">Distanz</th>
                      <th className="pb-2 text-right">Riegel</th>
                      <th className="pb-2 text-right">VO2max</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {view.predictions.map((p) => (
                      <tr key={p.key} className="border-t border-border/50">
                        <td className="py-1.5">{p.label}</td>
                        <td className="py-1.5 text-right">{fmtTime(p.riegelS)}</td>
                        <td className="py-1.5 text-right">{fmtTime(p.vo2S)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ---------------- Effizienz ---------------- */}
        <TabsContent value="efficiency" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Efficiency Factor
                <Explain text="Tempo pro Herzschlag. Steigt der Wert über Wochen bei gleichem Puls, wird deine Aerobik besser." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {view.effTrend.length ? (
                <ChartContainer
                  config={{ ef: { label: "EF", color: "var(--chart-1)" } }}
                  className="h-56 w-full"
                >
                  <LineChart data={view.effTrend}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={32} />
                    <YAxis width={40} domain={["dataMin - 0.1", "dataMax + 0.1"]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="ef" stroke="var(--color-ef)" dot={false} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <EmptyHint text="Für den EF-Trend braucht es Einheiten mit Puls- und Tempodaten." />
              )}
            </CardContent>
          </Card>

          {view.dynamics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Laufdynamik
                  <Explain text="Vertical Ratio unter 7 %, Bodenkontakt unter 240 ms und eine gleichmäßige Schrittlänge sprechen für ökonomisches Laufen." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    vr: { label: "Vertical Ratio (%)", color: "var(--chart-1)" },
                    gct: { label: "Bodenkontakt (ms)", color: "var(--chart-2)" },
                  }}
                  className="h-56 w-full"
                >
                  <LineChart data={view.dynamics}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={32} />
                    <YAxis width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="vr" stroke="var(--color-vr)" dot={false} />
                    <Line dataKey="gct" stroke="var(--color-gct)" dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------- Schlaf & Erholung ---------------- */}
        <TabsContent value="sleep" className="space-y-4 pt-4">
          {view.sleep.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Schlafphasen
                  <Explain text="Rund 15–25 % Tiefschlaf und 20–25 % REM gelten als gut. Wichtig ist vor allem eine konstante Gesamtdauer." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={sleepConfig} className="h-56 w-full">
                  <BarChart
                    data={view.sleep.map((s) => ({
                      date: s.date,
                      deep: Math.round(((s.deep_s ?? 0) / 3600) * 10) / 10,
                      light: Math.round(((s.light_s ?? 0) / 3600) * 10) / 10,
                      rem: Math.round(((s.rem_s ?? 0) / 3600) * 10) / 10,
                      awake: Math.round(((s.awake_s ?? 0) / 3600) * 10) / 10,
                    }))}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={32} />
                    <YAxis width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="deep" stackId="s" fill="var(--color-deep)" />
                    <Bar dataKey="light" stackId="s" fill="var(--color-light)" />
                    <Bar dataKey="rem" stackId="s" fill="var(--color-rem)" />
                    <Bar dataKey="awake" stackId="s" fill="var(--color-awake)" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : null}

          {view.hrv.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  HRV mit Baseline
                  <Explain text="Herzratenvariabilität der Nacht. Innerhalb des Baseline-Bands bist du ausbalanciert, dauerhaft darunter bedeutet Stress oder Überlastung." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ hrv: { label: "HRV (ms)", color: "var(--chart-1)" } }}
                  className="h-56 w-full"
                >
                  <LineChart
                    data={view.hrv.map((h) => ({
                      date: h.date,
                      hrv: Number(h.last_night_avg_ms ?? 0),
                    }))}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={32} />
                    <YAxis width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {view.hrv[view.hrv.length - 1]?.baseline_low_ms != null && (
                      <ReferenceArea
                        y1={Number(view.hrv[view.hrv.length - 1]!.baseline_low_ms)}
                        y2={Number(view.hrv[view.hrv.length - 1]!.baseline_high_ms ?? 0)}
                        fill="var(--success)"
                        fillOpacity={0.12}
                      />
                    )}
                    <Line dataKey="hrv" stroke="var(--color-hrv)" dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : null}

          {view.wellness.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Ruhepuls &amp; Body Battery
                  <Explain text="Ein steigender Ruhepuls oder eine Body Battery, die nachts nicht mehr auflädt, sind frühe Warnzeichen für Überlastung." />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    resting_hr: { label: "Ruhepuls", color: "var(--chart-2)" },
                    body_battery_max: { label: "Body Battery max", color: "var(--success)" },
                  }}
                  className="h-56 w-full"
                >
                  <LineChart data={view.wellness}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={32} />
                    <YAxis width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="resting_hr" stroke="var(--color-resting_hr)" dot={false} />
                    <Line
                      dataKey="body_battery_max"
                      stroke="var(--color-body_battery_max)"
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : null}

          {!view.sleep.length && !view.hrv.length && !view.wellness.length && (
            <EmptyHint text="Noch keine Gesundheitsdaten. Der Garmin-Konto-Export enthält Schlaf, HRV und Body Battery – lade ihn unter Import hoch." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
          <Explain text={hint} />
        </div>
        <div className="font-mono text-2xl font-bold tabular-nums">{value}</div>
        {extra ? <div className="text-xs">{extra}</div> : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <Badge variant="outline" className="mb-2">
        Keine Daten
      </Badge>
      <p>{text}</p>
    </div>
  );
}
