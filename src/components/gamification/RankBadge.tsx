import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type Locale } from "@/lib/i18n";
import { rankProgress, divisionName, PROSPECT_NAMES } from "@/lib/gamification/rank";
import { XpBar } from "./XpBar";

interface XpState {
  totalXp: number;
  firstTrainingAt: string | null;
}

// Lokale UI-Texte (modul-lokal gehalten, damit der grosse messages-Katalog
// unangetastet bleibt). Rang-Namen kommen aus rank.ts.
const UI: Record<Locale, { toNext: string; max: string; hint: string }> = {
  de: {
    toNext: "bis zur nächsten Stufe",
    max: "Höchster Rang erreicht",
    hint: "Logge dein erstes Training, um deinen Rang freizuschalten.",
  },
  en: {
    toNext: "to next tier",
    max: "Top rank reached",
    hint: "Log your first workout to unlock your rank.",
  },
  uk: {
    toNext: "до наступного рівня",
    max: "Досягнуто найвищий ранг",
    hint: "Запишіть перше тренування, щоб відкрити ранг.",
  },
};

async function syncXp(): Promise<XpState | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  // sync_my_xp ist eine SECURITY-DEFINER-RPC; die generierten Typen kennen sie
  // (noch) nicht -> bewusster Cast, wie bei ai_tip_log im Projekt ueblich.
  const { data, error } = await (
    supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
    }
  ).rpc("sync_my_xp");
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as
    { total_xp?: number; first_training_at?: string | null } | null | undefined;
  return {
    totalXp: Number(row?.total_xp ?? 0),
    firstTrainingAt: row?.first_training_at ?? null,
  };
}

export function RankBadge() {
  const { locale } = useI18n();
  const strings = UI[locale] ?? UI.de;
  const { data, isLoading } = useQuery({
    queryKey: ["gamification-xp"],
    queryFn: syncXp,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-[var(--elevated)]" />;
  }
  if (!data) return null;

  const ranked = !!data.firstTrainingAt;
  const { rank, pct, toNext } = rankProgress(data.totalXp);
  const color = ranked ? rank.division.color : "#8b95a1";
  const accent = ranked ? rank.division.accent : "#c3ccd6";
  const title = ranked
    ? `${divisionName(rank.division, locale)} ${rank.roman}`
    : PROSPECT_NAMES[locale];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div
        className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-lg font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${color}, ${accent})`,
          boxShadow: `0 0 0 3px ${color}33`,
        }}
      >
        {ranked ? rank.roman : "–"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-display text-lg font-bold">{title}</div>
          <div className="tabular text-xs text-muted-foreground">{data.totalXp} XP</div>
        </div>
        {ranked ? (
          <XpBar
            pct={pct}
            color={color}
            accent={accent}
            label={rank.isMax ? strings.max : `${toNext} XP ${strings.toNext}`}
          />
        ) : (
          <div className="mt-1 text-sm text-muted-foreground">{strings.hint}</div>
        )}
      </div>
    </div>
  );
}
