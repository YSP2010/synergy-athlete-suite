import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Flag, Globe, Loader2, Lock, Trash2 } from "lucide-react";
import { fmtDistance, sportLabel } from "@/lib/activities";
import { humanError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/courses/")({
  head: () => ({
    meta: [
      { title: "Strecken – Hybrid Athlete" },
      { name: "description", content: "Eigene und öffentliche Strecken mit Bestenliste für wiederholte Läufe und Radrunden." },
      { property: "og:title", content: "Strecken – Hybrid Athlete" },
      { property: "og:description", content: "Strecken mit Bestenliste für wiederholte Läufe und Radrunden." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, sport, distance_m, elevation_gain_m, is_public, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return { rows: data, uid: auth.user?.id ?? null };
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const { error } = await supabase.from("courses").update({ is_public: isPublic }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
    onError: (e) => toast.error(humanError(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Strecke gelöscht");
    },
    onError: (e) => toast.error(humanError(e)),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Flag className="h-6 w-6 text-primary" /> Strecken
          </h1>
          <p className="text-sm text-muted-foreground">
            Vergleiche deine Zeiten auf denselben Runden – öffentliche Strecken zeigen die Bestenliste aller Athleten.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/activities">Aus Aktivität anlegen</Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.rows.length ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Noch keine Strecken. Öffne eine Aktivität mit GPS-Spur und lege daraus eine Strecke an.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.rows.map((c) => {
            const mine = c.user_id === data.uid;
            return (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <Link to="/courses/$id" params={{ id: c.id }} className="min-w-[160px] flex-1 hover:text-primary">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {sportLabel(c.sport)} · {fmtDistance(c.distance_m)}
                    {c.elevation_gain_m != null ? ` · ${Math.round(c.elevation_gain_m)} hm` : ""}
                  </div>
                </Link>
                {mine && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={c.is_public ? "Strecke privat schalten" : "Strecke öffentlich schalten"}
                      onClick={() => toggle.mutate({ id: c.id, isPublic: !c.is_public })}
                    >
                      {c.is_public ? <Globe className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />}
                      {c.is_public ? "Öffentlich" : "Privat"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Strecke löschen"
                      onClick={() => remove.mutate(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
