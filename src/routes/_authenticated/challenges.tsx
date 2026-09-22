import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type Locale } from "@/lib/i18n";
import { ChallengeCard } from "@/components/gamification/ChallengeCard";
import type { ChallengeRow, ChallengeScope } from "@/lib/gamification/challenges";

export const Route = createFileRoute("/_authenticated/challenges")({
  component: ChallengesPage,
});

const UI: Record<Locale, { title: string; monthly: string; yearly: string; empty: string }> = {
  de: { title: "Challenges", monthly: "Monat", yearly: "Jahr", empty: "Keine Challenges aktiv." },
  en: { title: "Challenges", monthly: "Month", yearly: "Year", empty: "No active challenges." },
  uk: { title: "Челенджі", monthly: "Місяць", yearly: "Рік", empty: "Немає активних челенджів." },
};

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

  return (
    <div className="space-y-5 pb-6">
      <h1 className="font-display text-3xl font-bold">{t.title}</h1>

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
