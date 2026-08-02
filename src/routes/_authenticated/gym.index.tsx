import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Dumbbell, Plus, ChevronRight, CalendarDays, Timer } from "lucide-react";
import { parseISODate, toISODate, WEEKDAY_LONG } from "@/lib/dates";
import { humanError } from "@/lib/errors";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/gym/")({
  head: () => ({
    meta: [
      { title: "Gym-Training – Hybrid Athlete" },
      { name: "description", content: "Alle Krafteinheiten mit Volumen, RPE und Übungsverlauf im Überblick." },
      { property: "og:title", content: "Gym-Training – Hybrid Athlete" },
      { property: "og:description", content: "Krafteinheiten mit Volumen, RPE und Übungsverlauf." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/gym" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Gym-Training – Hybrid Athlete" },
      { name: "twitter:description", content: "Krafteinheiten mit Volumen, RPE und Übungsverlauf." },
    ],
  }),
  head: () => ({ meta: [{ title: "Gym-Log – Hybrid Athlete" }] }),
  component: GymListPage,
});

type GymType = "push" | "pull" | "legs" | "upper" | "lower" | "full" | "light" | "mobility";
const GYM_LABEL: Record<GymType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Beine",
  upper: "Oberkörper",
  lower: "Unterkörper",
  full: "Ganzkörper",
  light: "Light",
  mobility: "Mobility",
};

function GymListPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [newType, setNewType] = useState<GymType>("push");

  const { data, isLoading } = useQuery({
    queryKey: ["gym-list"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { data, error } = await supabase
        .from("workouts_gym")
        .select("id,date,session_type,duration_min,status,notes")
        .eq("user_id", u.user.id)
        .order("date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return { rows: data ?? [], uid: u.user.id };
    },
  });

  const create = useMutation({
    mutationFn: async (session_type: GymType) => {
      if (!data) return null;
      const today = toISODate(new Date());
      const { data: row, error } = await supabase
        .from("workouts_gym")
        .insert({ user_id: data.uid, date: today, session_type, status: "planned" })
        .select("id")
        .single();
      if (error) throw error;
      return row.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["gym-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (id) nav({ to: "/gym/$id", params: { id } });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Gym-Log</h1>
        <p className="text-sm text-muted-foreground">
          Session starten, Übungen mit Sätzen/Wdh/Gewicht/RPE loggen.
        </p>
      </div>

      <div className="card-elevated p-4">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> Neue Session heute
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={newType} onValueChange={(v) => setNewType(v as GymType)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GYM_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => create.mutate(newType)}
            disabled={create.isPending}
            className="bg-neon text-neon-foreground hover:bg-neon/90 glow"
          >
            Starten
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> Historie
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Lade…</div>
        ) : !data?.rows.length ? (
          <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
            <Dumbbell className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Noch keine Gym-Sessions. Starte oben deine erste.
          </div>
        ) : (
          <div className="space-y-2">
            {data.rows.map((r) => {
              const d = parseISODate(r.date);
              return (
                <Link
                  key={r.id}
                  to="/gym/$id"
                  params={{ id: r.id }}
                  className="card-elevated flex items-center gap-3 p-3 transition hover:border-neon/40"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-neon-soft text-neon">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold">
                      {GYM_LABEL[r.session_type as GymType]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {WEEKDAY_LONG[(d.getDay() + 6) % 7]}, {d.toLocaleDateString("de-DE")}
                      {r.duration_min ? ` · ${r.duration_min} min` : ""}
                    </div>
                  </div>
                  <span
                    className={
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase " +
                      (r.status === "done"
                        ? "bg-neon-soft text-neon"
                        : r.status === "skipped"
                          ? "bg-danger/20 text-danger"
                          : "bg-elevated text-muted-foreground")
                    }
                  >
                    {r.status === "done"
                      ? "Fertig"
                      : r.status === "skipped"
                        ? "Übersprungen"
                        : "Offen"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="card-elevated p-4 text-xs text-muted-foreground">
        <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
          <Timer className="h-3.5 w-3.5" /> Tipp
        </div>
        Trag RPE (1–10) pro Übung ein – der Recovery-Score nutzt deine Trainingsbelastung der
        letzten 72h.
      </div>
    </div>
  );
}
