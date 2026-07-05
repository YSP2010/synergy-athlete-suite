import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { WEEKDAY_LABELS } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import type { Goal, Sex } from "@/lib/planner";
import { humanError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/onboarding")({
  loader: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("onboarded, role")
      .eq("id", u.user.id)
      .maybeSingle();
    if (data?.role === "coach") {
      // Coaches skip athlete onboarding entirely.
      if (!data.onboarded) {
        await supabase.from("profiles").update({ onboarded: true }).eq("id", u.user.id);
      }
      throw redirect({ to: "/team" });
    }
    if (data?.onboarded) throw redirect({ to: "/dashboard" });
    return null;
  },
  component: OnboardingPage,
});

interface FormState {
  name: string;
  birth_date: string;
  sex: Sex | "";
  height_cm: string;
  weight_kg: string;
  sport: string;
  position: string;
  gym_days: number[];
  sport_days: number[];
  match_days: number[];
  diet_style: string;
  allergies: string;
  goal: Goal;
}

const GOAL_LABELS: Record<Goal, { title: string; desc: string }> = {
  muscle_gain: { title: "Muskelaufbau", desc: "Kalorienüberschuss, Fokus Hypertrophie" },
  maintain: { title: "Erhalten", desc: "Gewicht halten, Leistung stabilisieren" },
  recomp: { title: "Recomp", desc: "Fett runter, Muskeln halten" },
  performance: { title: "Leistung", desc: "Maximale Sportperformance" },
};

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<FormState>({
    name: "",
    birth_date: "",
    sex: "",
    height_cm: "",
    weight_kg: "",
    sport: "football",
    position: "",
    gym_days: [1, 3, 5],
    sport_days: [1, 3],
    match_days: [6],
    diet_style: "omnivor",
    allergies: "",
    goal: "performance",
  });

  const { data: existing } = useQuery({
    queryKey: ["profile-onboarding"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data?.name && !f.name) {
        setF((s) => ({ ...s, name: data.name! }));
      }
      return data;
    },
    staleTime: Infinity,
  });
  void existing;

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Nicht angemeldet");
      const payload = {
        id: u.user.id,
        name: f.name || null,
        birth_date: f.birth_date || null,
        sex: (f.sex || null) as Sex | null,
        height_cm: f.height_cm ? Number(f.height_cm) : null,
        weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
        sport: f.sport,
        position: f.position || null,
        diet_style: f.diet_style || null,
        allergies: f.allergies
          ? f.allergies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        goal: f.goal,
        gym_days: f.gym_days,
        sport_days: f.sport_days,
        match_days: f.match_days,
        onboarded: true,
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Profil gespeichert");
      await qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  const steps = ["Basics", "Sport", "Training", "Ernährung", "Ziel"];

  return (
    <div className="mx-auto max-w-xl py-2">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Willkommen 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wir stellen deine App auf dich ein. Dauert 90 Sekunden.
        </p>
      </div>

      <div className="mb-6 flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition",
              i <= step ? "bg-neon" : "bg-elevated",
            )}
          />
        ))}
      </div>

      <div className="card-elevated p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Basics</h2>
            <Field label="Name">
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
            <Field label="Geburtsdatum">
              <Input
                type="date"
                value={f.birth_date}
                onChange={(e) => setF({ ...f, birth_date: e.target.value })}
              />
            </Field>
            <Field label="Geschlecht">
              <Select value={f.sex} onValueChange={(v) => setF({ ...f, sex: v as Sex })}>
                <SelectTrigger><SelectValue placeholder="wählen…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Männlich</SelectItem>
                  <SelectItem value="female">Weiblich</SelectItem>
                  <SelectItem value="other">Andere</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Größe (cm)">
                <Input
                  type="number"
                  value={f.height_cm}
                  onChange={(e) => setF({ ...f, height_cm: e.target.value })}
                />
              </Field>
              <Field label="Gewicht (kg)">
                <Input
                  type="number"
                  step="0.1"
                  value={f.weight_kg}
                  onChange={(e) => setF({ ...f, weight_kg: e.target.value })}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Deine Sportart</h2>
            <Field label="Sportart">
              <Select value={f.sport} onValueChange={(v) => setF({ ...f, sport: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="football">Fußball</SelectItem>
                  <SelectItem value="tennis">Tennis</SelectItem>
                  <SelectItem value="basketball">Basketball</SelectItem>
                  <SelectItem value="handball">Handball</SelectItem>
                  <SelectItem value="running">Laufen</SelectItem>
                  <SelectItem value="other">Andere</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Position / Rolle">
              <Input
                value={f.position}
                placeholder="z. B. Stürmer, Außenverteidiger"
                onChange={(e) => setF({ ...f, position: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-semibold">Wöchentlicher Rhythmus</h2>
            <DayPicker
              label="Gym-Tage"
              value={f.gym_days}
              onChange={(v) => setF({ ...f, gym_days: v })}
            />
            <DayPicker
              label="Sport-Trainingstage"
              value={f.sport_days}
              onChange={(v) => setF({ ...f, sport_days: v })}
            />
            <DayPicker
              label="Spieltage"
              value={f.match_days}
              onChange={(v) => setF({ ...f, match_days: v })}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Ernährung</h2>
            <Field label="Ernährungsstil">
              <Select value={f.diet_style} onValueChange={(v) => setF({ ...f, diet_style: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="omnivor">Omnivor</SelectItem>
                  <SelectItem value="vegetarisch">Vegetarisch</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="pescetarisch">Pescetarisch</SelectItem>
                  <SelectItem value="lowcarb">Low-Carb</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Allergien / Unverträglichkeiten (Komma)">
              <Textarea
                value={f.allergies}
                placeholder="Laktose, Nüsse …"
                onChange={(e) => setF({ ...f, allergies: e.target.value })}
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Dein Ziel</h2>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => {
                const active = f.goal === g;
                return (
                  <button
                    key={g}
                    onClick={() => setF({ ...f, goal: g })}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      active
                        ? "border-neon bg-neon-soft"
                        : "border-border bg-elevated hover:border-border/60",
                    )}
                  >
                    <div className="font-semibold">{GOAL_LABELS[g].title}</div>
                    <div className="text-xs text-muted-foreground">{GOAL_LABELS[g].desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Weiter <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Los geht's
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
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
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_LABELS.map((d, i) => {
          const active = value.includes(i);
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                if (active) onChange(value.filter((v) => v !== i));
                else onChange([...value, i].sort());
              }}
              className={cn(
                "h-10 w-10 rounded-lg border text-sm font-medium transition",
                active
                  ? "border-neon bg-neon text-neon-foreground"
                  : "border-border bg-elevated text-muted-foreground",
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
