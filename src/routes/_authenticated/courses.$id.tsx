import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Medal, ShieldCheck } from "lucide-react";
import { RouteMap } from "@/components/activities/RouteMap";
import { fmtDistance, fmtDuration, fmtPace, sportLabel } from "@/lib/activities";
import type { TrackPoint } from "@/lib/import/downsample";

export const Route = createFileRoute("/_authenticated/courses/$id")({
  head: () => ({
    meta: [
      { title: "Strecke – Hybrid Athlete" },
      { name: "description", content: "Streckenprofil, Bestzeiten und Bestenliste für diese Route." },
      { property: "og:title", content: "Strecke – Hybrid Athlete" },
      { property: "og:description", content: "Streckenprofil, Bestzeiten und Bestenliste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Strecke – Hybrid Athlete" },
      { name: "twitter:description", content: "Streckenprofil, Bestzeiten und Bestenliste." },
    ],
  }),
  component: CourseDetail,
});

function CourseDetail() {
  const { id } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const course = await supabase
        .from("courses")
        .select("id, name, sport, distance_m, elevation_gain_m, is_public, geometry")
        .eq("id", id)
        .maybeSingle();
      if (course.error) throw course.error;
      const board = await supabase.rpc("course_leaderboard", { _course_id: id });
      if (board.error) throw board.error;
      return { course: course.data, board: board.data ?? [] };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data?.course) {
    return <p className="py-20 text-center text-muted-foreground">Strecke nicht gefunden oder nicht freigegeben.</p>;
  }

  const c = data.course;
  const geometry = (c.geometry as unknown as [number, number][]) ?? [];
  const points: TrackPoint[] = geometry.map(([lat, lng], i) => [i, lat, lng, null, null, null, null, null]);
  const board = [...data.board].sort((a, b) => a.duration_s - b.duration_s);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
        </Link>
      </Button>

      <header>
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <p className="text-sm text-muted-foreground">
          {sportLabel(c.sport)} · {fmtDistance(c.distance_m)}
          {c.elevation_gain_m != null ? ` · ${Math.round(c.elevation_gain_m)} hm` : ""} ·{" "}
          {c.is_public ? "öffentlich" : "privat"}
        </p>
      </header>

      <RouteMap points={points} className="h-72" />

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <Medal className="h-4 w-4 text-primary" /> Bestenliste
        </h2>
        {!board.length ? (
          <p className="text-sm text-muted-foreground">Noch keine gewerteten Versuche auf dieser Strecke.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1 pr-4">#</th>
                  <th className="py-1 pr-4">Athlet</th>
                  <th className="py-1 pr-4">Zeit</th>
                  <th className="py-1 pr-4">Pace</th>
                  <th className="py-1 pr-4">Ø Puls</th>
                  <th className="py-1 pr-4">Datum</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {board.map((e, i) => (
                  <tr
                    key={e.effort_id}
                    className={`border-t border-border ${e.is_me ? "bg-primary/5 font-medium" : ""}`}
                  >
                    <td className="py-1.5 pr-4">{i + 1}</td>
                    <td className="py-1.5 pr-4">
                      <span className="flex items-center gap-1.5">
                        {e.athlete_name}
                        {e.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-label="Geräteverifiziert" />}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4">{fmtDuration(e.duration_s)}</td>
                    <td className="py-1.5 pr-4">{fmtPace(e.distance_m, e.duration_s)}</td>
                    <td className="py-1.5 pr-4">{e.avg_hr ?? "–"}</td>
                    <td className="py-1.5 pr-4">
                      {e.started_at ? new Date(e.started_at).toLocaleDateString("de-DE") : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
