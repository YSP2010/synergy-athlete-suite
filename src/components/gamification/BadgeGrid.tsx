import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Flag,
  Dumbbell,
  Footprints,
  Timer,
  Mountain,
  Zap,
  HeartPulse,
  Flame,
  Clock,
  Layers,
  Moon,
  Sparkles,
  Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  BADGES,
  BADGE_CATEGORIES,
  CATEGORY_META,
  badgeTierColor,
  type BadgeCategory,
} from "@/lib/gamification/badges";

const ICONS: Record<BadgeCategory, typeof Flag> = {
  milestone: Flag,
  strength: Dumbbell,
  endurance: Footprints,
  tempo: Timer,
  climbing: Mountain,
  calories: Zap,
  intensity: HeartPulse,
  consistency: Flame,
  lifestyle: Clock,
  variety: Layers,
  recovery: Moon,
  special: Sparkles,
};

const UI = {
  de: {
    title: "Abzeichen",
    earned: "erreicht",
    locked: "gesperrt",
    none: "Noch keine Abzeichen – leg los!",
  },
  en: { title: "Badges", earned: "earned", locked: "locked", none: "No badges yet – get started!" },
  uk: {
    title: "Значки",
    earned: "отримано",
    locked: "заблоковано",
    none: "Ще немає значків – почни!",
  },
};

type BadgeRow = { badge_key: string; earned_at: string };

export function BadgeGrid() {
  const { locale } = useI18n();
  const t = UI[locale] ?? UI.de;
  const [open, setOpen] = useState<string | null>(null);

  const { data: earned } = useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const res = await (
        supabase as unknown as { rpc: (fn: string) => Promise<{ data: unknown; error: unknown }> }
      ).rpc("sync_my_badges");
      const rows = (Array.isArray(res.data) ? res.data : []) as BadgeRow[];
      return new Set(rows.map((r) => r.badge_key));
    },
  });

  const earnedSet = useMemo(() => earned ?? new Set<string>(), [earned]);
  const earnedCount = BADGES.filter((b) => earnedSet.has(b.key)).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-bold">{t.title}</h2>
        <span className="tabular text-sm text-muted-foreground">
          {earnedCount} / {BADGES.length} {t.earned}
        </span>
      </div>

      <div className="space-y-5">
        {BADGE_CATEGORIES.map((cat) => {
          const items = BADGES.filter((b) => b.category === cat);
          const meta = CATEGORY_META[cat];
          const CatIcon = ICONS[cat];
          return (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-2">
                <CatIcon size={16} style={{ color: meta.color }} />
                <span className="text-sm font-semibold">{meta.label[locale]}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {items.map((b) => {
                  const has = earnedSet.has(b.key);
                  const tint = badgeTierColor(cat, b.weight);
                  const isOpen = open === b.key;
                  const Icon = has ? CatIcon : Lock;
                  return (
                    <button
                      type="button"
                      key={b.key}
                      onClick={() => setOpen(isOpen ? null : b.key)}
                      title={`${b.title[locale]} — ${b.desc[locale]}`}
                      className="flex flex-col items-center gap-1 rounded-xl p-2 text-center transition"
                      style={{
                        background: has ? `${tint}22` : "var(--elevated, #1a1a1a11)",
                        border: `1px solid ${has ? tint : "var(--border, #8884)"}`,
                        opacity: has ? 1 : 0.55,
                      }}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          background: has ? tint : "transparent",
                          color: has ? "#fff" : undefined,
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                        {b.title[locale]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-border bg-background p-3 text-sm">
          {(() => {
            const b = BADGES.find((x) => x.key === open);
            if (!b) return null;
            const has = earnedSet.has(b.key);
            return (
              <div>
                <div className="font-semibold">{b.title[locale]}</div>
                <div className="text-muted-foreground">{b.desc[locale]}</div>
                <div
                  className="mt-1 text-xs"
                  style={{ color: has ? CATEGORY_META[b.category].color : undefined }}
                >
                  {has ? t.earned : t.locked}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
