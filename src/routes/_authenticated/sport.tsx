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
import { Trophy, Plus, ChevronRight, CalendarDays, Flame } from "lucide-react";
import { parseISODate, toISODate, WEEKDAY_LONG } from "@/lib/dates";
import { sportName } from "@/lib/planner";
import { humanError } from "@/lib/errors";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/sport")({
  head: () => ({ meta: [{ title: "Sport-Log – Hybrid Athlete" }] }),
  component: SportListPage,
});

type Kind = "training" | "match";

function SportListPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [newKind, setNewKind] = useState<Kind>("training");

  const { data, isLoading } = useQuery({
    queryKey: ["sport-list"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const [rows, prof] = await Promise.all([
        supabase
          .from("workouts_sport")
          .select("id,date,kind,intensity,match_hardness,duration_min,status")
          .eq("user_id", u.user.id)
          .order("date", { ascending: false })
          .limit(30),
        supabase.from("profiles").select("sport").eq("id", u.user.id).maybeSingle(),
      ]);
      if (rows.error) throw rows.error;
      return { rows: rows.data ?? [], uid: u.user.id, sport: prof.data?.sport ?? null };
    },
  });

  const create = useMutation({
    mutationFn: async (kind: Kind) => {
      if (!data) return null;
      const today = toISODate(new Date());
      const { data: row, error } = await supabase
        .from("workouts_sport")
        .insert({
          user_id: data.uid,
          date: today,
          kind,
          intensity: kind === "match" ? "high" : "mid",
          match_hardness: kind === "match" ? "normal" : null,
          status: "planned",
        })
        .select("id")
        .single();
      if (error) throw error;
      return row.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["sport-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
      if (id) nav({ to: "/sport/$id", params: { id } });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  const sportLabel = sportName(data?.sport);

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Sport-Log</h1>
        <p className="text-sm text-muted-foreground">
          {sportLabel}-Trainings & Spiele mit Intensität und Härtegrad tracken.
        </p>
      </div>

      <div className="card-elevated p-4">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> Neue Session heute
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={newKind} onValueChange={(v) => setNewKind(v as Kind)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="match">Spiel / Wettkampf</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => create.mutate(newKind)}
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
            <Trophy className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Noch keine {sportLabel}-Sessions.
          </div>
        ) : (
          <div className="space-y-2">
            {data.rows.map((r) => {
              const d = parseISODate(r.date);
              const isMatch = r.kind === "match";
              return (
                <Link
                  key={r.id}
                  to="/sport/$id"
                  params={{ id: r.id }}
                  className="card-elevated flex items-center gap-3 p-3 transition hover:border-neon/40"
                >
                  <div
                    className={
                      "grid h-11 w-11 shrink-0 place-items-center rounded-lg " +
                      (isMatch ? "bg-danger/20 text-danger" : "bg-chart-2/20 text-chart-2")
                    }
                  >
                    {isMatch ? <Flame className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold">
                      {isMatch
                        ? `Spiel${r.match_hardness ? ` · ${labelHardness(r.match_hardness)}` : ""}`
                        : `${sportLabel}-Training · ${labelIntensity(r.intensity)}`}
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
    </div>
  );
}

function labelIntensity(i: string) {
  return i === "high" ? "Hart" : i === "mid" ? "Mittel" : "Locker";
}
function labelHardness(h: string) {
  return h === "hard" ? "Hart" : h === "easy" ? "Locker" : "Normal";
}
