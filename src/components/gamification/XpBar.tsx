interface Props {
  pct: number; // 0..1
  color: string;
  accent: string;
  label?: string;
}

export function XpBar({ pct, color, accent, label }: Props) {
  const width = `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`;
  return (
    <div className="w-full">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--elevated)]">
        <div
          className="h-full rounded-full"
          style={{
            width,
            background: `linear-gradient(90deg, ${color}, ${accent})`,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      {label ? <div className="mt-1 text-xs text-muted-foreground">{label}</div> : null}
    </div>
  );
}
