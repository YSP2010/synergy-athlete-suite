import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type Locale } from "@/lib/i18n";
import { rankProgress, divisionName, PROSPECT_NAMES } from "@/lib/gamification/rank";
import { sanitizeAvatar } from "@/lib/gamification/avatar";
import { AvatarDisplay } from "@/components/gamification/AvatarDisplay";
import { AvatarBuilder } from "@/components/gamification/AvatarBuilder";
import { BadgeGrid } from "@/components/gamification/BadgeGrid";
import { XpBar } from "@/components/gamification/XpBar";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const UI: Record<Locale, { edit: string; xp: string; toNext: string; max: string; hint: string }> =
  {
    de: {
      edit: "Avatar anpassen",
      xp: "XP",
      toNext: "bis zur nächsten Stufe",
      max: "Höchster Rang erreicht",
      hint: "Logge dein erstes Training, um deinen Rang freizuschalten.",
    },
    en: {
      edit: "Customize avatar",
      xp: "XP",
      toNext: "to next tier",
      max: "Top rank reached",
      hint: "Log your first workout to unlock your rank.",
    },
    uk: {
      edit: "Налаштувати аватар",
      xp: "XP",
      toNext: "до наступного рівня",
      max: "Досягнуто найвищий ранг",
      hint: "Запишіть перше тренування, щоб відкрити ранг.",
    },
  };

function ProfilePage() {
  const { locale } = useI18n();
  const t = UI[locale] ?? UI.de;
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile-page"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const uid = u.user.id;
      const [xpRes, profRes] = await Promise.all([
        (supabase as unknown as { rpc: (fn: string) => Promise<{ data: unknown }> }).rpc(
          "sync_my_xp",
        ),
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      ]);
      const xrow = (Array.isArray(xpRes.data) ? xpRes.data[0] : xpRes.data) as
        { total_xp?: number; first_training_at?: string | null } | null | undefined;
      const prof = profRes.data as { name?: string | null; avatar?: unknown } | null;
      return {
        uid,
        totalXp: Number(xrow?.total_xp ?? 0),
        firstTrainingAt: xrow?.first_training_at ?? null,
        name: prof?.name ?? null,
        avatar: sanitizeAvatar(prof?.avatar),
      };
    },
  });

  if (isLoading || !data) {
    return <div className="py-20 text-center text-muted-foreground">Lade…</div>;
  }

  const ranked = !!data.firstTrainingAt;
  const { rank, pct, toNext } = rankProgress(data.totalXp);
  const rankLine = ranked
    ? `${divisionName(rank.division, locale)} ${rank.roman}`
    : PROSPECT_NAMES[locale];

  return (
    <div className="space-y-6 pb-6">
      <h1 className="font-display text-3xl font-bold">{data.name ?? "Athlete"}</h1>

      <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card p-6">
        <AvatarDisplay
          config={data.avatar}
          ranked={ranked}
          rank={rank}
          locale={locale}
          prospectLabel={PROSPECT_NAMES[locale]}
        />

        <div className="w-full max-w-sm">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-display text-lg font-semibold">{rankLine}</span>
            <span className="tabular text-sm text-muted-foreground">
              {data.totalXp} {t.xp}
            </span>
          </div>
          {ranked ? (
            <XpBar
              pct={pct}
              color={rank.division.color}
              accent={rank.division.accent}
              label={rank.isMax ? t.max : `${toNext} ${t.xp} ${t.toNext}`}
            />
          ) : (
            <div className="text-sm text-muted-foreground">{t.hint}</div>
          )}
        </div>

        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            {t.edit}
          </button>
        )}
      </div>

      {editing && (
        <AvatarBuilder
          initial={data.avatar}
          userId={data.uid}
          onSaved={() => {
            setEditing(false);
            qc.invalidateQueries({ queryKey: ["profile-page"] });
            qc.invalidateQueries({ queryKey: ["gamification-xp"] });
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <BadgeGrid />
    </div>
  );
}
