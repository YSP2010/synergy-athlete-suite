import { cn } from "@/lib/utils";

interface Macro {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

export function MacroRings({
  kcal,
  kcalTarget,
  protein,
  proteinTarget,
  carbs,
  carbsTarget,
  fat,
  fatTarget,
  carbLoading,
}: {
  kcal: number;
  kcalTarget: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
  carbLoading?: boolean;
}) {
  const items: Macro[] = [
    { label: "Kcal", current: kcal, target: kcalTarget, unit: "kcal", color: "var(--neon)" },
    {
      label: "Protein",
      current: protein,
      target: proteinTarget,
      unit: "g",
      color: "var(--chart-2)",
    },
    { label: "Carbs", current: carbs, target: carbsTarget, unit: "g", color: "var(--chart-3)" },
    { label: "Fett", current: fat, target: fatTarget, unit: "g", color: "var(--chart-4)" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((m) => (
        <Ring key={m.label} macro={m} carbLoading={carbLoading && m.label === "Carbs"} />
      ))}
    </div>
  );
}

function Ring({ macro, carbLoading }: { macro: Macro; carbLoading?: boolean }) {
  const size = 96;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const pct = macro.target > 0 ? Math.min(1, macro.current / macro.target) : 0;
  const dash = pct * c;
  const remaining = Math.max(0, macro.target - macro.current);
  return (
    <div className="card-elevated flex flex-col items-center p-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--elevated)"
            strokeWidth={8}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={macro.color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            fill="none"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-lg font-bold tabular leading-none">
              {Math.round(macro.current)}
            </div>
            <div className="text-[10px] text-muted-foreground">/ {Math.round(macro.target)}</div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <div className={cn("text-xs font-medium", carbLoading ? "text-neon" : "text-foreground")}>
          {macro.label}
        </div>
        {carbLoading && (
          <span className="rounded-full bg-neon-soft px-1.5 py-0.5 text-[9px] font-semibold text-neon">
            LOAD
          </span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground">
        noch {Math.round(remaining)} {macro.unit}
      </div>
    </div>
  );
}
