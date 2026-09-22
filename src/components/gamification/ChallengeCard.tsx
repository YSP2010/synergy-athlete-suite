import {
  Dumbbell,
  Footprints,
  Trophy,
  CalendarCheck,
  Weight,
  HeartPulse,
  Medal,
  Flame,
  Target,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { XpBar } from "@/components/gamification/XpBar";
import {
  CHALLENGE_BY_KEY,
  DIFFICULTY_META,
  formatChallengeValue,
  type ChallengeRow,
} from "@/lib/gamification/challenges";

const ICONS: Record<string, typeof Target> = {
  Dumbbell,
  Footprints,
  Trophy,
  CalendarCheck,
  Weight,
  HeartPulse,
  Medal,
  Flame,
  Target,
};

const UI = {
  de: { confirm: "Bestätigen", done: "Erledigt", claimed: "Selbst bestätigt", xp: "XP" },
  en: { confirm: "Confirm", done: "Done", claimed: "Self-confirmed", xp: "XP" },
  uk: { confirm: "Підтвердити", done: "Готово", claimed: "Підтверджено", xp: "XP" },
};

interface Props {
  row: ChallengeRow;
  onClaim: (key: string) => void;
  claiming?: boolean;
}

export function ChallengeCard({ row, onClaim, claiming }: Props) {
  const { locale } = useI18n();
  const t = UI[locale] ?? UI.de;
  const def = CHALLENGE_BY_KEY[row.key];
  const diff = DIFFICULTY_META[row.difficulty];
  const Icon = ICONS[def?.icon ?? "Target"] ?? Target;

  const done = row.status === "completed";
  const pct = row.target_value ? row.progress_value / row.target_value : done ? 1 : 0;

  return (
    <div
      className="rounded-2xl border bg-card p-4"
      style={{ borderColor: done ? diff.color : "var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${diff.color}22`, color: diff.color }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{def?.title[locale] ?? row.key}</h3>
            {done && <Check size={16} style={{ color: diff.color }} />}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{def?.desc[locale]}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-muted-foreground">+{row.xp_reward}</div>
          <div className="text-[10px] uppercase text-muted-foreground">{t.xp}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: `${diff.color}22`, color: diff.color }}
        >
          {diff.label[locale]}
        </span>
        {row.metric !== null && (
          <span className="tabular text-xs text-muted-foreground">
            {formatChallengeValue(row.metric, row.progress_value)} /{" "}
            {formatChallengeValue(row.metric, row.target_value ?? 0)}
          </span>
        )}
      </div>

      {row.metric !== null ? (
        <div className="mt-2">
          <XpBar pct={pct} color={diff.color} accent={diff.accent} />
        </div>
      ) : (
        <div className="mt-3">
          {done ? (
            <span className="inline-flex items-center gap-1 text-sm" style={{ color: diff.color }}>
              <Check size={15} /> {t.claimed}
            </span>
          ) : (
            <button
              type="button"
              disabled={claiming}
              onClick={() => onClaim(row.key)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: diff.color }}
            >
              {t.confirm}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
