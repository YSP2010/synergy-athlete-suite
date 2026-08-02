import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Flag, Loader2, ShieldCheck } from "lucide-react";
import { RouteMap } from "@/components/activities/RouteMap";
import { fmtDistance, fmtDuration, fmtPace, fmtSpeed, sportLabel, toChartData } from "@/lib/activities";
import { geometryFromTrack } from "@/lib/import/match";
import type { TrackPoint } from "@/lib/import/downsample";
import { humanError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/activities/$id")({
  head: () => ({
    meta: [
      { title: "Aktivität – Hybrid Athlete" },
      { name: "description", content: "Detailansicht einer Einheit mit Karte, Höhenprofil, Puls- und Tempoverlauf." },
      { property: "og:title", content: "Aktivität – Hybrid Athlete" },
      { property: "og:description", content: "Karte, Höhenprofil, Puls- und Tempoverlauf einer Einheit." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityDetail,
});

function ActivityDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [courseName, setCourseName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: async () => {
      const [act, track, laps, segs] = await Promise.all([
        supabase.from("activities").select("*").eq("id", id).maybeSingle(),
        supabase.from("activity_tracks").select("points, bounds").eq("activity_id", id).maybeSingle(),
        supabase.from("activity_laps").select("*").eq("activity_id", id).order("lap_index"),
        supabase
          .from("multisport_segments")
          .select("*")
          .eq("activity_id", id)
          .order("segment_index"),
      ]);
      if (act.error) throw act.error;
      return {
        activity: act.data,
        points: ((track.data?.points as unknown as TrackPoint[]) ?? []),
        laps: laps.data ?? [],
        segments: segs.data ?? [],
      };
    },
  });

  const points = data?.points ?? [];
  const a = data?.activity;
  const chart = useMemo(() => toChartData(points, a?.distance_m ?? null), [points, a?.distance_m]);

  const { data: gear } = useQuery({
    queryKey: ["equipment-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("equipment")
        .select("id, name, type, retired")
        .eq("retired", false)
        .order("name");
      return data ?? [];
    },
  });

  /** Weist Ausrüstung zu und schreibt den Kilometerstand aus allen Aktivitäten fort. */
  const assignGear = useMutation({
    mutationFn: async (equipmentId: string | null) => {
      const { error } = await supabase.from("activities").update({ equipment_id: equipmentId }).eq("id", id);
      if (error) throw error;
      const affected = [equipmentId, a?.equipment_id].filter(Boolean) as string[];
      for (const gid of [...new Set(affected)]) {
        const { data: rows } = await supabase.from("activities").select("distance_m").eq("equipment_id", gid);
        const total = (rows ?? []).reduce((s, r) => s + Number(r.distance_m ?? 0), 0);
        await supabase.from("equipment").update({ total_distance_m: total }).eq("id", gid);
      }
    },
    onSuccess: () => {
      toast.success("Ausrüstung aktualisiert");
      qc.invalidateQueries({ queryKey: ["activity", id] });
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: () => toast.error("Zuweisung fehlgeschlagen"),
  });

  const createCourse = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Nicht angemeldet");
      const geo = geometryFromTrack(points);
      if (geo.points.length < 2) throw new Error("Diese Aktivität hat keine GPS-Spur");
      const first = geo.points[0];
      const last = geo.points[geo.points.length - 1];
      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          user_id: uid,
          name: courseName.trim() || `${sportLabel(a!.sport)} ${fmtDistance(a!.distance_m)}`,
          sport: a!.sport,
          distance_m: geo.distanceM,
          elevation_gain_m: a!.elevation_gain_m,
          geometry: geo.points,
          start_lat: first[0],
          start_lng: first[1],
          end_lat: last[0],
          end_lng: last[1],
          source_activity_id: id,
        })
        .select("id")
        .single();
      if (error) throw error;
      // Diese Aktivität ist automatisch der erste Versuch auf der Strecke.
      await supabase.from("course_efforts").upsert(
        {
          course_id: course.id,
          activity_id: id,
          user_id: uid,
          started_at: a!.started_at,
          duration_s: Math.round(a!.moving_duration_s ?? a!.duration_s ?? 0),
          distance_m: a!.distance_m,
          avg_hr: a!.avg_hr,
          avg_speed_mps: a!.avg_speed_mps,
          match_score: 1,
          verified: a!.verified,
        },
        { onConflict: "course_id,activity_id" },
      );
      return course.id as string;
    },
    onSuccess: (courseId) => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Strecke erstellt");
      navigate({ to: "/courses/$id", params: { id: courseId } });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!a) {
    return <p className="py-20 text-center text-muted-foreground">Aktivität nicht gefunden.</p>;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/activities">
          <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
        </Link>
      </Button>

      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {a.name || sportLabel(a.sport)}
          {a.verified && <ShieldCheck className="h-5 w-5 text-primary" aria-label="Geräteverifiziert" />}
        </h1>
        <p className="text-sm text-muted-foreground">
          {sportLabel(a.sport)} ·{" "}
          {a.started_at ? new Date(a.started_at).toLocaleString("de-DE", { dateStyle: "full", timeStyle: "short" }) : "ohne Datum"}
          {a.device_name ? ` · ${a.device_name}` : ""}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Distanz" value={fmtDistance(a.distance_m)} />
        <Stat label="Zeit" value={fmtDuration(a.moving_duration_s ?? a.duration_s)} />
        <Stat label="Pace" value={fmtPace(a.distance_m, a.moving_duration_s ?? a.duration_s)} />
        <Stat label="Ø Speed" value={fmtSpeed(a.avg_speed_mps)} />
        <Stat label="Ø Puls" value={a.avg_hr ? `${a.avg_hr} bpm` : "–"} />
        <Stat label="Max Puls" value={a.max_hr ? `${a.max_hr} bpm` : "–"} />
        <Stat label="Höhenmeter" value={a.elevation_gain_m != null ? `${Math.round(a.elevation_gain_m)} m` : "–"} />
        <Stat label="Kalorien" value={a.calories != null ? `${a.calories} kcal` : "–"} />
        <Stat label="Ø Power" value={a.avg_power_w != null ? `${a.avg_power_w} W` : "–"} />
        <Stat label="Ø Kadenz" value={a.avg_cadence != null ? `${Math.round(a.avg_cadence)} spm` : "–"} />
        <Stat label="Bodenkontakt" value={a.avg_ground_contact_ms != null ? `${Math.round(a.avg_ground_contact_ms)} ms` : "–"} />
        <Stat label="Schrittlänge" value={a.avg_stride_length_m != null ? `${a.avg_stride_length_m.toFixed(2)} m` : "–"} />
      </div>

      <RouteMap points={points} className="h-80" />

      {chart.length > 1 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Höhenprofil">
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="km" tick={{ fontSize: 11 }} unit=" km" />
              <YAxis tick={{ fontSize: 11 }} width={40} unit=" m" />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="alt" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ChartCard>
          <ChartCard title="Puls & Tempo">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="km" tick={{ fontSize: 11 }} unit=" km" />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="hr" dot={false} stroke="hsl(var(--destructive))" name="Puls" />
              <Line type="monotone" dataKey="speed" dot={false} stroke="hsl(var(--primary))" name="km/h" />
            </LineChart>
          </ChartCard>
        </div>
      )}

      {(gear ?? []).length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 font-semibold">Ausrüstung</h2>
          <select
            aria-label="Ausrüstung dieser Aktivität"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={a?.equipment_id ?? ""}
            onChange={(e) => assignGear.mutate(e.target.value || null)}
            disabled={assignGear.isPending}
          >
            <option value="">Keine Zuordnung</option>
            {(gear ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Der Kilometerstand der Ausrüstung wird automatisch neu berechnet.
          </p>
        </section>
      )}

      {data!.segments.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Multisport-Segmente</h2>
          <ol className="space-y-2">
            {data!.segments.map((s) => {
              const transition = s.segment_type === "t1" || s.segment_type === "t2";
              return (
                <li
                  key={s.id}
                  className={`flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm ${
                    transition ? "bg-muted/40" : ""
                  }`}
                >
                  <span className="font-medium">{SEGMENT_LABEL[s.segment_type] ?? s.segment_type}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {fmtDuration(s.duration_s)}
                    {s.distance_m ? ` · ${fmtDistance(s.distance_m)}` : ""}
                    {s.avg_hr ? ` · ${s.avg_hr} bpm` : ""}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {data!.laps.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Runden</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1 pr-4">#</th>
                  <th className="py-1 pr-4">Distanz</th>
                  <th className="py-1 pr-4">Zeit</th>
                  <th className="py-1 pr-4">Pace</th>
                  <th className="py-1 pr-4">Ø Puls</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {data!.laps.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="py-1.5 pr-4">{l.lap_index + 1}</td>
                    <td className="py-1.5 pr-4">{fmtDistance(l.distance_m)}</td>
                    <td className="py-1.5 pr-4">{fmtDuration(l.duration_s)}</td>
                    <td className="py-1.5 pr-4">{fmtPace(l.distance_m, l.duration_s)}</td>
                    <td className="py-1.5 pr-4">{l.avg_hr ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {points.length > 1 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Flag className="h-4 w-4 text-primary" /> Strecke anlegen
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Mache aus dieser Route eine Strecke – künftige Einheiten auf derselben Strecke landen automatisch in der
            Bestenliste.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="course-name">Name</Label>
              <Input
                id="course-name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="z. B. Seerunde 5 km"
              />
            </div>
            <Button onClick={() => createCourse.mutate()} disabled={createCourse.isPending}>
              {createCourse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Strecke erstellen
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Deutsche Bezeichnungen für Multisport-Segmente. */
const SEGMENT_LABEL: Record<string, string> = {
  swim: "Schwimmen",
  t1: "Wechsel 1",
  bike: "Radfahren",
  t2: "Wechsel 2",
  run: "Laufen",
  other: "Sonstiges",
};
