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
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  History as HistoryIcon,
  Dumbbell,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/gym/$id")({
  head: () => ({ meta: [{ title: "Gym-Session – Hybrid Athlete" }] }),
  component: GymDetailPage,
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

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rpe: number | null;
  order_idx: number;
}

function GymDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["gym", id],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const [w, ex] = await Promise.all([
        supabase.from("workouts_gym").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("gym_exercises")
          .select("id,name,sets,reps,weight_kg,rpe,order_idx")
          .eq("workout_id", id)
          .order("order_idx", { ascending: true }),
      ]);
      if (w.error) throw w.error;
      if (!w.data) throw new Error("not found");
      return { workout: w.data, exercises: (ex.data ?? []) as Exercise[], uid: u.user.id };
    },
  });

  const [meta, setMeta] = useState<{ session_type: GymType; duration_min: string; notes: string } | null>(null);
  useEffect(() => {
    if (data && !meta) {
      setMeta({
        session_type: data.workout.session_type as GymType,
        duration_min: data.workout.duration_min ? String(data.workout.duration_min) : "",
        notes: data.workout.notes ?? "",
      });
    }
  }, [data, meta]);

  const saveMeta = useMutation({
    mutationFn: async (patch: { status?: "planned" | "done" | "skipped" }) => {
      if (!meta) return;
      const { error } = await supabase
        .from("workouts_gym")
        .update({
          session_type: meta.session_type,
          duration_min: meta.duration_min ? Number(meta.duration_min) : null,
          notes: meta.notes || null,
          ...patch,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["gym", id] });
      qc.invalidateQueries({ queryKey: ["gym-list"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (vars?.status === "done") {
        toast.success("Session abgeschlossen");
        nav({ to: "/gym" });
      } else {
        toast.success("Gespeichert");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addExercise = useMutation({
    mutationFn: async (name: string) => {
      if (!data) return;
      const order_idx = data.exercises.length;
      // Vorschlag aus letzter Session mit gleichem Namen
      const { data: last } = await supabase
        .from("gym_exercises")
        .select("sets,reps,weight_kg,rpe")
        .eq("user_id", data.uid)
        .ilike("name", name)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { error } = await supabase.from("gym_exercises").insert({
        workout_id: id,
        user_id: data.uid,
        name,
        sets: last?.sets ?? 3,
        reps: last?.reps ?? 8,
        weight_kg: last?.weight_kg ?? null,
        rpe: last?.rpe ?? null,
        order_idx,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateExercise = useMutation({
    mutationFn: async (ex: Exercise) => {
      const { error } = await supabase
        .from("gym_exercises")
        .update({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          rpe: ex.rpe,
        })
        .eq("id", ex.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteExercise = useMutation({
    mutationFn: async (exId: string) => {
      const { error } = await supabase.from("gym_exercises").delete().eq("id", exId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym", id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [newName, setNewName] = useState("");

  if (isLoading || !data || !meta) {
    return <div className="py-20 text-center text-muted-foreground">Lade…</div>;
  }

  const d = new Date(data.workout.date);

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center gap-2">
        <Link
          to="/gym"
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">
            Gym · {GYM_LABEL[meta.session_type]}
          </h1>
          <div className="text-xs text-muted-foreground">
            {d.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
          </div>
        </div>
      </div>

      <div className="card-elevated grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Typ</Label>
          <Select
            value={meta.session_type}
            onValueChange={(v) => setMeta({ ...meta, session_type: v as GymType })}
          >
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(GYM_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Dauer (min)</Label>
          <Input
            type="number"
            className="mt-1"
            value={meta.duration_min}
            onChange={(e) => setMeta({ ...meta, duration_min: e.target.value })}
          />
        </div>
        <div className="sm:col-span-3">
          <Label className="text-xs">Notizen</Label>
          <Textarea
            className="mt-1"
            rows={2}
            value={meta.notes}
            onChange={(e) => setMeta({ ...meta, notes: e.target.value })}
            placeholder="Was lief gut, was nicht?"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Dumbbell className="h-3.5 w-3.5" /> Übungen ({data.exercises.length})
        </div>
        <div className="space-y-2">
          {data.exercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              onSave={(next) => updateExercise.mutate(next)}
              onDelete={() => deleteExercise.mutate(ex.id)}
            />
          ))}
        </div>

        <div className="mt-3 card-elevated p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Übung hinzufügen (z. B. Bankdrücken)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  addExercise.mutate(newName.trim());
                  setNewName("");
                }
              }}
            />
            <Button
              onClick={() => {
                if (newName.trim()) {
                  addExercise.mutate(newName.trim());
                  setNewName("");
                }
              }}
              disabled={!newName.trim() || addExercise.isPending}
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <HistoryIcon className="h-3 w-3" /> Werte werden aus deiner letzten Session
            mit dem gleichen Namen vorbelegt.
          </div>
        </div>
      </div>

      <div className="sticky bottom-20 z-30 grid grid-cols-2 gap-2 md:static md:bottom-auto md:grid-cols-[1fr_auto_auto]">
        <Button
          variant="secondary"
          onClick={() => saveMeta.mutate({})}
          disabled={saveMeta.isPending}
        >
          Nur speichern
        </Button>
        <Button
          variant="ghost"
          className="text-danger hover:text-danger"
          onClick={() => saveMeta.mutate({ status: "skipped" })}
          disabled={saveMeta.isPending}
        >
          Überspringen
        </Button>
        <Button
          className="bg-neon text-neon-foreground hover:bg-neon/90 glow"
          onClick={() => saveMeta.mutate({ status: "done" })}
          disabled={saveMeta.isPending}
        >
          <Check className="mr-1 h-4 w-4" /> Fertig
        </Button>
      </div>
    </div>
  );
}

function ExerciseRow({
  ex,
  onSave,
  onDelete,
}: {
  ex: Exercise;
  onSave: (next: Exercise) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState<Exercise>(ex);
  useEffect(() => setLocal(ex), [ex]);
  const dirty =
    local.name !== ex.name ||
    local.sets !== ex.sets ||
    local.reps !== ex.reps ||
    local.weight_kg !== ex.weight_kg ||
    local.rpe !== ex.rpe;

  return (
    <div className="card-elevated p-3">
      <div className="flex items-center gap-2">
        <Input
          value={local.name}
          onChange={(e) => setLocal({ ...local, name: e.target.value })}
          className="font-semibold"
        />
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-danger"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        <NumField
          label="Sätze"
          value={local.sets}
          onChange={(v) => setLocal({ ...local, sets: v ?? 0 })}
        />
        <NumField
          label="Wdh"
          value={local.reps}
          onChange={(v) => setLocal({ ...local, reps: v ?? 0 })}
        />
        <NumField
          label="kg"
          step={0.5}
          value={local.weight_kg}
          onChange={(v) => setLocal({ ...local, weight_kg: v })}
        />
        <NumField
          label="RPE"
          step={0.5}
          max={10}
          value={local.rpe}
          onChange={(v) => setLocal({ ...local, rpe: v })}
        />
      </div>
      {dirty && (
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            className="bg-neon text-neon-foreground hover:bg-neon/90"
            onClick={() => onSave(local)}
          >
            Speichern
          </Button>
        </div>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  max?: number;
}) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        max={max}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="mt-1 h-9 text-center tabular"
      />
    </div>
  );
}
