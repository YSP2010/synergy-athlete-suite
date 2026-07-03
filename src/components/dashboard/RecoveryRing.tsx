import { cn } from "@/lib/utils";
import type { RecoveryLevel } from "@/lib/planner";

interface Props {
  score: number;
  level: RecoveryLevel;
  size?: number;
}

export function RecoveryRing({ score, level, size = 180 }: Props) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * c;
  const color =
    level === "green" ? "var(--success)" : level === "amber" ? "var(--warn)" : "var(--danger)";
  const label = level === "green" ? "Bereit" : level === "amber" ? "Vorsicht" : "Erschöpft";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={10}
          stroke="var(--elevated)"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={10}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          fill="none"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-4xl font-bold tabular">{score}</div>
          <div
            className={cn(
              "mt-1 text-xs font-medium uppercase tracking-wider",
              level === "green" && "text-success",
              level === "amber" && "text-warn",
              level === "red" && "text-danger",
            )}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
