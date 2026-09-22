import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type Locale } from "@/lib/i18n";
import { ChallengeCard } from "@/components/gamification/ChallengeCard";
import { FOCUS_META, type ChallengeRow, type ChallengeScope } from "@/lib/gamification/challenges";

export const Route = createFileRoute("/_authenticated/challenges")({
  component: ChallengesPage,
});

const UI: Record<
  Locale,
  { title: string; monthly: string; yearly: string; empty: string; season: string }
> = {
  de: {
    title: "Challenges",
    monthly: "Monat",
    yearly: "Jahr",
    empty: "Keine Challenges aktiv.",
    season: "Aktuelle Saison",
  },
  en: {
    title: "Challenges",
    monthly: "Month",
    yearly: "Year",
    empty: "No active challenges.",
    season: "Current Season",
  },
  uk: {
    title: "Челенджі",
    monthly: "Місяць",
    yearly: "Рік",
    empty: "Немає активних челенджів.",
    season: "Поточний сезон",
  },
};

const QUARTER_LABELS: Record<Locale, Record<number, string>> = {
  de: { 1: "Jan–März", 4: "Apr–Juni", 7: "Juli–Sep", 10: "Okt–Dez" },
  en: { 1: "Jan–Mar", 4: "Apr–Jun", 7: "Jul–Sep", 10: "Oct–Dec" },
  uk: { 1: "Січ–Бер", 4: "Кві–Чер", 7: "Лип–Вер", 10: "Жов–Гру" },
};

/** Leitet aus einem period_start (YYYY-MM-DD) den Quartals-Monatsbereich ab. */
function quarterRange(periodStart: string, locale: Locale): string {
  const month = Number(periodStart?.slice(5, 7)) || 1;
  const start = Math.floor((month - 1) / 3) * 3 + 1;
  return QUARTER_LABELS[locale][start] ?? QUARTER_LABELS.de[start] ?? "";
}

type RpcCall = {
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function ChallengesPage() {
  const { locale } = useI18n();
  const t = UI[locale] ?? UI.de;
  const qc = useQueryClient();
  const [scope, setScope] = useState<ChallengeScope>("monthly");

  const { data, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const res = await (supabase as unknown as RpcCall).rpc("sync_my_challenges");
      return (Array.isArray(res.data) ? res.data : []) as ChallengeRow[];
    },
  });

  const claim = useMutation({
    mutationFn: async (key: string) => {
      await (supabase as unknown as RpcCall).rpc("claim_challenge", { _key: key });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenges"] });
      qc.invalidateQueries({ queryKey: ["profile-page"] });
      qc.invalidateQueries({ queryKey: ["gamification-xp"] });
    },
  });

  const rows = (data ?? []).filter((r) => r.scope === scope);
  const seasonal = (data ?? []).filter((r) => r.scope === "seasonal");
  const seasonFocus = seasonal[0]?.focus ?? null;
  const focusMeta = seasonFocus ? FOCUS_META[seasonFocus] : null;
  const seasonColor = focusMeta?.color ?? "var(--border)";
  const seasonLabel = focusMeta?.label[locale] ?? "";
  const seasonRange = seasonal.length > 0 ? quarterRange(seasonal[0].period_start, locale) : "";

  return (
    <div className="space-y-5 pb-6">
      <h1 className="font-display text-3xl font-bold">{t.title}</h1>

      {seasonal.length > 0 && (
        <section className="space-y-3">
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: seasonColor, background: `${seasonColor}14` }}
          >
            <div className="text-xs uppercase tracking-wide" style={{ color: seasonColor }}>
              {t.season}
            </div>
            <div className="mt-0.5 font-display text-lg font-semibold">
              {seasonLabel}
              {seasonRange ? ` (${seasonRange})` : ""}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {seasonal.map((r) => (
              <ChallengeCard
                key={r.key}
                row={r}
                claiming={claim.isPending}
                onClaim={(k) => claim.mutate(k)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="inline-flex rounded-xl border border-border p-1">
        {(["monthly", "yearly"] as ChallengeScope[]).map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setScope(s)}
            className="rounded-lg px-4 py-1.5 text-sm font-medium transition"
            style={{
              background: scope === s ? "var(--elevated)" : "transparent",
              color: scope === s ? undefined : "var(--muted-foreground)",
            }}
          >
            {s === "monthly" ? t.monthly : t.yearly}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Lade…</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">{t.empty}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <ChallengeCard
              key={r.key}
              row={r}
              claiming={claim.isPending}
              onClaim={(k) => claim.mutate(k)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
