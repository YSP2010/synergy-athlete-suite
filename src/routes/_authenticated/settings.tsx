import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Goal } from "@/lib/planner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Einstellungen" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const [f, setF] = useState({
    name: "",
    weight_kg: "",
    goal: "performance" as Goal,
    gym_days: [] as number[],
    sport_days: [] as number[],
    match_days: [] as number[],
  });

  useEffect(() => {
    if (profile) {
      setF({
        name: profile.name ?? "",
        weight_kg: profile.weight_kg?.toString() ?? "",
        goal: (profile.goal ?? "performance") as Goal,
        gym_days: profile.gym_days ?? [],
        sport_days: profile.sport_days ?? [],
        match_days: profile.match_days ?? [],
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { error } = await supabase
        .from("profiles")
        .update({
          name: f.name,
          weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
          goal: f.goal,
          gym_days: f.gym_days,
          sport_days: f.sport_days,
          match_days: f.match_days,
        })
        .eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Gespeichert");
    },
    onError: (e) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Lade…</div>;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-8">
      <h1 className="font-display text-3xl font-bold">Einstellungen</h1>

      <div className="card-elevated space-y-4 p-5">
        <div>
          <Label>Name</Label>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <Label>Gewicht (kg)</Label>
          <Input
            type="number"
            step="0.1"
            value={f.weight_kg}
            onChange={(e) => setF({ ...f, weight_kg: e.target.value })}
          />
        </div>
        <div>
          <Label>Ziel</Label>
          <Select value={f.goal} onValueChange={(v) => setF({ ...f, goal: v as Goal })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="muscle_gain">Muskelaufbau</SelectItem>
              <SelectItem value="maintain">Erhalten</SelectItem>
              <SelectItem value="recomp">Recomp</SelectItem>
              <SelectItem value="performance">Leistung</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DayPicker label="Gym-Tage" value={f.gym_days} onChange={(v) => setF({ ...f, gym_days: v })} />
        <DayPicker label="Sport-Tage" value={f.sport_days} onChange={(v) => setF({ ...f, sport_days: v })} />
        <DayPicker label="Spieltage" value={f.match_days} onChange={(v) => setF({ ...f, match_days: v })} />
        <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
          Speichern
        </Button>
      </div>

      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-danger hover:bg-elevated"
      >
        <LogOut className="h-4 w-4" /> Abmelden
      </button>
    </div>
  );
}

function DayPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number[];
  onChange: (v: number[]) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {WEEKDAY_LABELS.map((d, i) => {
          const active = value.includes(i);
          return (
            <button
              key={d}
              type="button"
              onClick={() =>
                active ? onChange(value.filter((v) => v !== i)) : onChange([...value, i].sort())
              }
              className={cn(
                "h-10 w-10 rounded-lg border text-sm font-medium",
                active ? "border-neon bg-neon text-neon-foreground" : "border-border bg-elevated",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
