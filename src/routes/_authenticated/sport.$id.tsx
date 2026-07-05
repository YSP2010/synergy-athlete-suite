import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Check, Trophy, Flame, SearchX } from "lucide-react";
import { sportName } from "@/lib/planner";
import { parseISODate } from "@/lib/dates";
import { humanError } from "@/lib/errors";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/sport/$id")({
  head: () => ({ meta: [{ title: "Sport-Session – Hybrid Athlete" }] }),
  component: SportDetailPage,
});

type Kind = "training" | "match";
type Intensity = "low" | "mid" | "high";
type Hardness = "easy" | "normal" | "hard";

interface FormState {
  kind: Kind;
  intensity: Intensity;
  match_hardness: Hardness;
  duration_min: string;
  notes: string;
}

function SportDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sport", id],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const [w, prof] = await Promise.all([
        supabase.from("workouts_sport").select("*").eq("id", id).maybeSingle(),
        supabase.from("profiles").select("sport").eq("id", u.user.id).maybeSingle(),
      ]);
      if (w.error) throw w.error;
      if (!w.data) throw new Error("not found");
      return { workout: w.data, sport: prof.data?.sport ?? null };
    },
  });

  const [f, setF] = useState<FormState | null>(null);
  useEffect(() => {
    if (data && !f) {
      setF({
        kind: data.workout.kind as Kind,
        intensity: (data.workout.intensity ?? "mid") as Intensity,
        match_hardness: (data.workout.match_hardness ?? "normal") as Hardness,
        duration_min: data.workout.duration_min ? String(data.workout.duration_min) : "",
        notes: data.workout.notes ?? "",
      });
    }
  }, [data, f]);

  const save = useMutation({
    mutationFn: async (patch: { status?: "planned" | "done" | "skipped" }) => {
      if (!f) return;
      const { error } = await supabase
        .from("workouts_sport")
        .update({
          kind: f.kind,
          intensity: f.kind === "match" ? "high" : f.intensity,
          match_hardness: f.kind === "match" ? f.match_hardness : null,
          duration_min: f.duration_min ? Number(f.duration_min) : null,
          notes: f.notes || null,
          ...patch,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["sport", id] });
      qc.invalidateQueries({ queryKey: ["sport-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
      if (vars?.status === "done") {
        toast.success("Session abgeschlossen");
        nav({ to: "/sport" });
      } else {
        toast.success("Gespeichert");
      }
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  if (!isLoading && (isError || !data)) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="card-elevated flex flex-col items-center gap-3 p-8">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-danger/10 text-danger">
            <SearchX className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold">Nicht gefunden</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Diese Sport-Session existiert nicht mehr oder du hast keinen Zugriff darauf.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/sport">
              <ArrowLeft className="mr-2 h-4 w-4" /> Zurück zum Sport-Log
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data || !f) {
    return <div className="py-20 text-center text-muted-foreground">Lade…</div>;
  }

  const sportLabel = sportName(data.sport);
  const d = parseISODate(data.workout.date);
  const isMatch = f.kind === "match";

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-2">
        <Link
          to="/sport"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={
                "grid h-8 w-8 place-items-center rounded-lg " +
                (isMatch ? "bg-danger/20 text-danger" : "bg-chart-2/20 text-chart-2")
              }
            >
              {isMatch ? <Flame className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
            </span>
            <h1 className="font-display text-2xl font-bold">
              {isMatch ? `${sportLabel} · Spiel` : `${sportLabel} · Training`}
            </h1>
          </div>
          <div className="text-xs text-muted-foreground">
            {d.toLocaleDateString("de-DE", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="card-elevated grid gap-4 p-4">
        <div>
          <Label className="text-xs">Art</Label>
          <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v as Kind })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="match">Spiel / Wettkampf</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isMatch ? (
          <div>
            <Label className="text-xs">Härte</Label>
            <Select
              value={f.match_hardness}
              onValueChange={(v) => setF({ ...f, match_hardness: v as Hardness })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Locker</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="hard">Hart</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              „Hart" blockiert automatisch Beintraining 48h vorher und aktiviert Carbo-Loading.
            </p>
          </div>
        ) : (
          <div>
            <Label className="text-xs">Intensität</Label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(["low", "mid", "high"] as Intensity[]).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setF({ ...f, intensity: i })}
                  className={
                    "rounded-lg border px-3 py-2 text-sm transition " +
                    (f.intensity === i
                      ? "border-neon bg-neon-soft text-neon"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  {i === "low" ? "Locker" : i === "mid" ? "Mittel" : "Hart"}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs">Dauer (min)</Label>
          <Input
            type="number"
            className="mt-1"
            value={f.duration_min}
            onChange={(e) => setF({ ...f, duration_min: e.target.value })}
            placeholder="z. B. 90"
          />
        </div>

        <div>
          <Label className="text-xs">Notizen</Label>
          <Textarea
            className="mt-1"
            rows={3}
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
            placeholder="Verlauf, Gefühl, besondere Vorkommnisse…"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_auto_auto]">
        <Button variant="secondary" onClick={() => save.mutate({})} disabled={save.isPending}>
          Nur speichern
        </Button>
        <Button
          variant="ghost"
          className="text-danger hover:text-danger"
          onClick={() => save.mutate({ status: "skipped" })}
          disabled={save.isPending}
        >
          Überspringen
        </Button>
        <Button
          className="bg-neon text-neon-foreground hover:bg-neon/90 glow"
          onClick={() => save.mutate({ status: "done" })}
          disabled={save.isPending}
        >
          <Check className="mr-1 h-4 w-4" /> Fertig
        </Button>
      </div>
    </div>
  );
}
