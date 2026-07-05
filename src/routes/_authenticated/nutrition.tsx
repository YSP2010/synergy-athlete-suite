import { createFileRoute } from "@tanstack/react-router";
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
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft, ChevronRight, Utensils, Sparkles } from "lucide-react";
import {
  ageFrom,
  addDays,
  isoDow,
  parseISODate,
  startOfWeek,
  toISODate,
  WEEKDAY_LONG,
} from "@/lib/dates";
import { calcDailyMacros, toAthleteProfile } from "@/lib/planner";
import { MacroRings } from "@/components/dashboard/MacroRings";
import { QueryError } from "@/components/ui/query-error";
import { humanError } from "@/lib/errors";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/nutrition")({
  head: () => ({ meta: [{ title: "Ernährung – Hybrid Athlete" }] }),
  component: NutritionPage,
});

type Meal = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Frühstück",
  lunch: "Mittag",
  dinner: "Abend",
  snack: "Snack",
};
const MEAL_ORDER: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

interface LogRow {
  id: string;
  meal: Meal;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: "manual" | "scan";
}

function NutritionPage() {
  const qc = useQueryClient();
  const [dateIso, setDateIso] = useState(toISODate(new Date()));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["nutrition", dateIso],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const uid = u.user.id;
      const day = parseISODate(dateIso);
      const weekStart = startOfWeek(day);
      const weekEnd = addDays(weekStart, 6);

      const [profileRes, logsRes, sportRes, gymRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("nutrition_logs")
          .select("id,meal,name,kcal,protein_g,carbs_g,fat_g,source")
          .eq("user_id", uid)
          .eq("date", dateIso)
          .order("created_at", { ascending: true }),
        supabase
          .from("workouts_sport")
          .select("date,kind,intensity,match_hardness,duration_min")
          .eq("user_id", uid)
          .gte("date", toISODate(weekStart))
          .lte("date", toISODate(weekEnd)),
        supabase
          .from("workouts_gym")
          .select("date,session_type,duration_min")
          .eq("user_id", uid)
          .eq("date", dateIso),
      ]);
      if (logsRes.error) throw logsRes.error;

      const profile = profileRes.data;
      const rows = (logsRes.data ?? []) as LogRow[];
      const sport = sportRes.data ?? [];
      const gym = gymRes.data ?? [];

      const tomorrow = toISODate(addDays(day, 1));
      const tomorrowMatchHard = sport.some(
        (s) => s.date === tomorrow && s.kind === "match" && s.match_hardness === "hard",
      );
      const todaySport = sport.find((s) => s.date === dateIso);
      const todayGym = gym.find((g) => g.date === dateIso);

      const ath = toAthleteProfile(profile);

      const macros = calcDailyMacros(
        ath,
        ageFrom(profile?.birth_date),
        todaySport as never,
        todayGym as never,
        tomorrowMatchHard,
      );

      const consumed = rows.reduce(
        (acc, r) => ({
          kcal: acc.kcal + Number(r.kcal),
          protein_g: acc.protein_g + Number(r.protein_g),
          carbs_g: acc.carbs_g + Number(r.carbs_g),
          fat_g: acc.fat_g + Number(r.fat_g),
        }),
        { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      );

      return { uid, rows, macros, consumed };
    },
  });

  const [form, setForm] = useState({
    meal: "lunch" as Meal,
    name: "",
    kcal: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!data) return;
      if (!form.name.trim()) throw new Error("Name fehlt");
      const kcal = Math.max(0, Number(form.kcal) || 0);
      const protein = Math.max(0, Number(form.protein_g) || 0);
      const carbs = Math.max(0, Number(form.carbs_g) || 0);
      const fat = Math.max(0, Number(form.fat_g) || 0);
      const { error } = await supabase.from("nutrition_logs").insert({
        user_id: data.uid,
        date: dateIso,
        meal: form.meal,
        name: form.name.trim(),
        kcal,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        source: "manual",
      });
      if (error) throw error;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition", dateIso] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setForm({ meal: form.meal, name: "", kcal: "", protein_g: "", carbs_g: "", fat_g: "" });
      toast.success("Mahlzeit hinzugefügt");
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition", dateIso] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const d = parseISODate(dateIso);
  const isToday = dateIso === toISODate(new Date());

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Ernährung</h1>
          <p className="text-sm text-muted-foreground">
            Mahlzeiten loggen — Ziele passen sich Training & Spielen an.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-2">
        <button
          onClick={() => setDateIso(toISODate(addDays(d, -1)))}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {WEEKDAY_LONG[isoDow(d)]}
          </div>
          <div className="font-display text-sm font-semibold">
            {d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            {isToday && (
              <span className="ml-2 rounded bg-neon-soft px-1.5 py-0.5 text-[9px] font-semibold text-neon">
                HEUTE
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setDateIso(toISODate(addDays(d, 1)))}
          className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isError ? (
        <QueryError onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="py-10 text-center text-muted-foreground">Lade…</div>
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <Utensils className="h-3.5 w-3.5" /> Ziel vs. Konsum
                {data.macros.carbLoading && (
                  <span className="rounded-full bg-neon-soft px-2 py-0.5 text-[10px] font-semibold text-neon">
                    Carbo-Loading
                  </span>
                )}
              </div>
            </div>
            <MacroRings
              kcal={data.consumed.kcal}
              kcalTarget={data.macros.kcal}
              protein={data.consumed.protein_g}
              proteinTarget={data.macros.protein_g}
              carbs={data.consumed.carbs_g}
              carbsTarget={data.macros.carbs_g}
              fat={data.consumed.fat_g}
              fatTarget={data.macros.fat_g}
              carbLoading={data.macros.carbLoading}
            />
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              Mahlzeiten ({data.rows.length})
            </div>
            {data.rows.length === 0 ? (
              <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
                Noch keine Einträge. Füge unten deine erste Mahlzeit hinzu.
              </div>
            ) : (
              <div className="space-y-3">
                {MEAL_ORDER.map((m) => {
                  const items = data.rows.filter((r) => r.meal === m);
                  if (!items.length) return null;
                  const sum = items.reduce(
                    (a, r) => ({
                      k: a.k + Number(r.kcal),
                      p: a.p + Number(r.protein_g),
                    }),
                    { k: 0, p: 0 },
                  );
                  return (
                    <div key={m} className="card-elevated p-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-display font-semibold uppercase tracking-widest text-muted-foreground">
                          {MEAL_LABEL[m]}
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(sum.k)} kcal · {Math.round(sum.p)} g P
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {items.map((r) => (
                          <div key={r.id} className="flex items-center gap-2 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                {r.name}
                                {r.source === "scan" && (
                                  <span className="rounded bg-neon-soft px-1 py-0.5 text-[9px] font-semibold text-neon">
                                    <Sparkles className="inline h-2.5 w-2.5" /> AI
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground tabular">
                                {Math.round(Number(r.kcal))} kcal · P{" "}
                                {Number(r.protein_g).toFixed(0)}g · C {Number(r.carbs_g).toFixed(0)}
                                g · F {Number(r.fat_g).toFixed(0)}g
                              </div>
                            </div>
                            <button
                              onClick={() => del.mutate(r.id)}
                              className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card-elevated p-4">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Plus className="h-3.5 w-3.5" /> Mahlzeit hinzufügen
            </div>
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <Label className="text-xs">Mahlzeit</Label>
                <Select
                  value={form.meal}
                  onValueChange={(v) => setForm({ ...form, meal: v as Meal })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_ORDER.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MEAL_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-4">
                <Label className="text-xs">Name</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="z. B. Haferflocken mit Beeren"
                />
              </div>
              <NumCol label="Kcal" v={form.kcal} on={(v) => setForm({ ...form, kcal: v })} />
              <NumCol
                label="Protein g"
                v={form.protein_g}
                on={(v) => setForm({ ...form, protein_g: v })}
              />
              <NumCol
                label="Carbs g"
                v={form.carbs_g}
                on={(v) => setForm({ ...form, carbs_g: v })}
              />
              <NumCol label="Fett g" v={form.fat_g} on={(v) => setForm({ ...form, fat_g: v })} />
              <div className="sm:col-span-2 flex items-end">
                <Button
                  className="w-full bg-neon text-neon-foreground hover:bg-neon/90 glow"
                  onClick={() => add.mutate()}
                  disabled={add.isPending || !form.name.trim()}
                >
                  Hinzufügen
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NumCol({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        className="mt-1 tabular"
        value={v}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "" || Number(val) >= 0) on(val);
        }}
        onKeyDown={(e) => {
          if (e.key === "-" || e.key === "e" || e.key === "E") e.preventDefault();
        }}
        placeholder="0"
      />
    </div>
  );
}
