import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTrainingPlans } from "@/lib/plan.functions";
import type { PlanContent, PlanType } from "@/lib/plan-types";
import { cn } from "@/lib/utils";
import { ChevronDown, Dumbbell, Trophy } from "lucide-react";

interface PlanRow {
  id: string;
  type: PlanType;
  goal: string | null;
  weeks: number;
  plan: PlanContent;
  created_at: string;
}

const TYPE_META: Record<PlanType, { label: string; icon: typeof Dumbbell }> = {
  gym: { label: "Gym-Trainingsplan", icon: Dumbbell },
  sport: { label: "Sport-Verbesserungsplan", icon: Trophy },
};

/**
 * Zeigt die aktiven, generierten Trainingspläne (Gym/Sport) einklappbar an.
 * Rendert nichts, solange keine Pläne existieren – hält die Plan-Seite sauber.
 */
export function TrainingPlanView() {
  const list = useServerFn(listTrainingPlans);
  const { data } = useQuery({
    queryKey: ["training-plans"],
    queryFn: () => list({ data: undefined }),
  });
  const plans = (data?.plans ?? []) as PlanRow[];
  if (!plans.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold">Deine Trainingspläne</h2>
      {plans.map((row) => (
        <PlanCard key={row.id} row={row} />
      ))}
    </div>
  );
}

function PlanCard({ row }: { row: PlanRow }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[row.type];
  const Icon = meta.icon;
  const p = row.plan;
  const created = new Date(row.created_at).toLocaleDateString("de-DE");

  return (
    <div className="card-elevated overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <span className="flex-1">
          <span className="flex items-center gap-2 font-display text-base font-semibold">
            <Icon className="h-4 w-4 text-neon" />
            {meta.label}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{p.summary}</span>
          <span className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded bg-elevated px-1.5 py-0.5">{p.weeks} Wochen</span>
            <span className="rounded bg-elevated px-1.5 py-0.5">
              {p.generated_by === "hybrid" ? "KI-optimiert" : "Regelbasiert"}
            </span>
            <span className="rounded bg-elevated px-1.5 py-0.5">erstellt {created}</span>
          </span>
        </span>
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          {p.macros && (
            <div className="flex flex-wrap gap-2 text-xs">
              <MacroPill label="kcal" value={p.macros.kcal} />
              <MacroPill label="Protein" value={`${p.macros.protein_g} g`} />
              <MacroPill label="Kohlenhydrate" value={`${p.macros.carbs_g} g`} />
              <MacroPill label="Fett" value={`${p.macros.fat_g} g`} />
            </div>
          )}

          <div className="space-y-2">
            {p.sessions.map((s, i) => (
              <div
                key={`${i}-${s.title}`}
                className="rounded-lg border border-border bg-elevated p-3"
              >
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.focus}</div>
                <ul className="mt-2 space-y-0.5 text-sm">
                  {s.exercises.map((ex, j) => (
                    <li key={`${j}-${ex.name}`} className="flex justify-between gap-2">
                      <span>{ex.name}</span>
                      {ex.reps && (
                        <span className="shrink-0 text-muted-foreground">
                          {ex.sets} × {ex.reps}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {p.weekly_focus.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Wochen-Progression
              </div>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {p.weekly_focus.map((w) => (
                  <li key={w.week}>
                    <strong className="text-foreground">
                      Woche {w.week} · {w.phase}:
                    </strong>{" "}
                    {w.focus}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.notes.length > 0 && (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {p.notes.map((n, i) => (
                <li key={`${i}-note`}>• {n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function MacroPill({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="rounded-lg border border-border bg-elevated px-2 py-1">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </span>
  );
}
