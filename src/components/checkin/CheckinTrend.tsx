import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { addDays, toISODate } from "@/lib/dates";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TrendingUp } from "lucide-react";

interface TrendRow {
  date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  soreness: number | null;
  stress: number | null;
  mood: number | null;
}

const scaleConfig = {
  soreness: { label: "Muskelkater", color: "var(--danger)" },
  stress: { label: "Stress", color: "var(--warn)" },
  mood: { label: "Stimmung", color: "var(--success)" },
} satisfies ChartConfig;

const sleepConfig = {
  sleep_hours: { label: "Schlaf (h)", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** Kurze Datumsanzeige TT.MM. für die X-Achse. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

export function CheckinTrend() {
  const { data, isLoading } = useQuery({
    queryKey: ["checkin-trend"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as TrendRow[];
      const { data: rows } = await supabase
        .from("daily_stats")
        .select("date,sleep_hours,sleep_quality,soreness,stress,mood")
        .eq("user_id", u.user.id)
        .gte("date", toISODate(addDays(new Date(), -29)))
        .order("date");
      return (rows ?? []) as TrendRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="card-elevated p-5 text-center text-sm text-muted-foreground">
        Lade Verlauf…
      </div>
    );
  }

  if (!data || data.length < 2) {
    return (
      <div className="card-elevated p-5">
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Verlauf (30 Tage)
        </div>
        <p className="text-sm text-muted-foreground">
          Noch zu wenige Check-ins für einen Trend. Trag ein paar Tage nach, um den Verlauf zu
          sehen.
        </p>
      </div>
    );
  }

  const chartData = data.map((r) => ({ ...r, label: shortDate(r.date) }));

  return (
    <div className="card-elevated space-y-5 p-5">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> Verlauf (30 Tage)
        </div>
        <ChartContainer config={scaleConfig} className="aspect-[16/7] w-full">
          <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="soreness"
              type="monotone"
              stroke="var(--color-soreness)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              dataKey="stress"
              type="monotone"
              stroke="var(--color-stress)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              dataKey="mood"
              type="monotone"
              stroke="var(--color-mood)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <LegendDot color="var(--danger)" label="Muskelkater" />
          <LegendDot color="var(--warn)" label="Stress" />
          <LegendDot color="var(--success)" label="Stimmung" />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          Schlaf (Stunden)
        </div>
        <ChartContainer config={sleepConfig} className="aspect-[16/5] w-full">
          <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
            />
            <YAxis domain={[0, 12]} tickLine={false} axisLine={false} width={28} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="sleep_hours"
              type="monotone"
              stroke="var(--color-sleep_hours)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
