import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Medal, RefreshCw, ShieldCheck, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recomputeMyLeaderboard } from "@/lib/leaderboard.functions";
import { periodStart, type LeaderboardPeriod } from "@/lib/leaderboard/compute";
import { humanError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Bestenliste – Hybrid Athlete" },
      { name: "description", content: "Verifizierte Ranglisten für Lauf-, Rad- und Triathlon-Leistungen." },
      { property: "og:title", content: "Bestenliste – Hybrid Athlete" },
      { property: "og:description", content: "Verifizierte Ranglisten für Lauf, Rad und Triathlon." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/leaderboard" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Bestenliste – Hybrid Athlete" },
      { name: "twitter:description", content: "Verifizierte Ranglisten für Lauf, Rad und Triathlon." },
    ],
  }),
  component: LeaderboardPage,
});

type Scope = "global" | "team";

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  week: "Diese Woche",
  month: "Dieser Monat",
  year: "Dieses Jahr",
  all_time: "Allzeit",
};

/** Wert je nach Einheit lesbar machen. */
function fmt(value: number, unit: string): string {
  if (unit === "s") {
    const v = Math.round(value);
    const h = Math.floor(v / 3600);
    const m = Math.floor((v % 3600) / 60);
    const s = v % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} h`
      : `${m}:${String(s).padStart(2, "0")} min`;
  }
  if (unit === "km") return `${value.toFixed(1)} km`;
  if (unit === "m") return `${Math.round(value)} hm`;
  if (unit === "W/kg") return `${value.toFixed(2)} W/kg`;
  if (unit === "%") return `${value.toFixed(1)} %`;
  if (unit === "bpm") return `${value.toFixed(0)} bpm`;
  if (unit === "ms") return `±${value.toFixed(1)} ms`;
  if (unit === "Tage") return `${Math.round(value)} Tage`;
  if (unit === "score") return value.toFixed(1);
  if (unit === "ef") return value.toFixed(2);
  if (unit === "ctl") return value.toFixed(1);
  if (unit === "swolf") return value.toFixed(1);
  return `${value}`;
}

function LeaderboardPage() {
  const qc = useQueryClient();
  const recompute = useServerFn(recomputeMyLeaderboard);
  const [scope, setScope] = useState<Scope>("global");
  const [period, setPeriod] = useState<LeaderboardPeriod>("month");
  const [category, setCategory] = useState<string>("run_10k_time");

  const { data: me } = useQuery({
    queryKey: ["lb-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, name, leaderboard_opt_in, leaderboard_display_name, leaderboard_share_health")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: teams } = useQuery({
    queryKey: ["lb-teams"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("team_members")
        .select("team_id, teams(name)")
        .eq("user_id", u.user.id)
        .eq("status", "active");
      return (data ?? []).map((r) => ({ id: r.team_id, name: (r.teams as { name: string } | null)?.name ?? "Team" }));
    },
  });
  const [teamId, setTeamId] = useState<string | null>(null);
  const activeTeam = teamId ?? teams?.[0]?.id ?? null;

  const { data: categories } = useQuery({
    queryKey: ["lb-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leaderboard_categories")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const cat = useMemo(() => categories?.find((c) => c.key === category) ?? null, [categories, category]);
  const start = useMemo(() => periodStart(period, new Date()), [period]);

  const optedIn = me?.leaderboard_opt_in === true;

  const { data: rows, isLoading } = useQuery({
    queryKey: ["lb-rows", category, period, start, scope, activeTeam],
    enabled: optedIn && !!cat,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        _category_key: category,
        _period: period,
        _period_start: start,
        _scope: scope,
        _team_id: (scope === "team" ? activeTeam : null) ?? undefined,
        _limit: 100,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = useMutation({
    mutationFn: async () => await recompute({ data: undefined }),
    onSuccess: (res) => {
      if (res?.skipped === "rate_limit") toast.info("Kürzlich schon berechnet – bitte kurz warten.");
      else toast.success("Bestenliste aktualisiert");
      qc.invalidateQueries({ queryKey: ["lb-rows"] });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  if (!optedIn) {
    return (
      <div className="mx-auto max-w-xl space-y-4 pb-10">
        <h1 className="font-display text-3xl font-bold">Bestenliste</h1>
        <div className="card-elevated space-y-3 p-5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-5 w-5 text-neon" />
            <span className="font-medium">Du nimmst noch nicht teil</span>
          </div>
          <p>
            Die Bestenliste ist freiwillig. Wenn du beitrittst, sehen andere angemeldete Nutzer deinen
            Anzeigenamen, den Wert der jeweiligen Kategorie und ob die Leistung von einem Garmin-Gerät
            stammt. Nichts davon passiert automatisch.
          </p>
          <p>
            Schlaf- und HRV-Kategorien brauchen eine zusätzliche, getrennte Zustimmung – das sind
            Gesundheitsdaten. Ein Klick genügt, um wieder auszusteigen; alle Einträge werden dann sofort
            gelöscht.
          </p>
          <Button asChild className="w-full">
            <Link to="/settings">In den Einstellungen beitreten</Link>
          </Button>
        </div>
      </div>
    );
  }

  const podium = (rows ?? []).slice(0, 3);
  const rest = (rows ?? []).slice(3);
  const mine = (rows ?? []).find((r) => r.is_me);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Bestenliste</h1>
        <Button variant="outline" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          {refresh.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Meine Werte neu berechnen
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">App-weit</SelectItem>
            <SelectItem value="team" disabled={!teams?.length}>
              Mein Team
            </SelectItem>
          </SelectContent>
        </Select>
        {scope === "team" && (teams?.length ?? 0) > 1 && (
          <Select value={activeTeam ?? ""} onValueChange={(v) => setTeamId(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams!.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PERIOD_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {(categories ?? []).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                c.key === category
                  ? "border-neon bg-neon text-neon-foreground"
                  : "border-border bg-elevated text-muted-foreground hover:text-foreground",
              )}
            >
              {c.label_de}
            </button>
          ))}
        </div>
      </div>

      {cat && (
        <p className="text-sm text-muted-foreground">
          {cat.description_de}
          {cat.requires_health_consent && !me?.leaderboard_share_health && (
            <>
              {" "}
              <Link to="/settings" className="text-neon underline">
                Gesundheitsdaten freigeben
              </Link>
              , um hier zu erscheinen.
            </>
          )}
        </p>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      ) : !rows?.length ? (
        <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
          Noch keine gewerteten Einträge in dieser Kategorie. Es zählen nur verifizierte Geräte-Aktivitäten
          aus dem <Link to="/import" className="text-neon underline">Import</Link>.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {podium.map((r, i) => (
              <div
                key={r.user_id}
                className={cn(
                  "card-elevated flex flex-col items-center gap-1 p-4 text-center",
                  r.is_me && "ring-1 ring-neon",
                )}
              >
                <Medal
                  className={cn(
                    "h-6 w-6",
                    i === 0 ? "text-neon" : i === 1 ? "text-muted-foreground" : "text-amber-600",
                  )}
                />
                <div className="text-sm font-medium">{r.display_name}</div>
                <div className="font-display text-xl font-bold">{fmt(Number(r.value), cat?.unit ?? "")}</div>
                <div className="text-xs text-muted-foreground">Platz {Number(r.rank)}</div>
              </div>
            ))}
          </div>

          <div className="card-elevated divide-y divide-border">
            {rest.map((r) => (
              <Row key={r.user_id} r={r} unit={cat?.unit ?? ""} />
            ))}
          </div>

          {mine && (
            <div className="sticky bottom-20 md:bottom-4">
              <div className="card-elevated border-neon/40 bg-elevated p-3 ring-1 ring-neon">
                <Row r={mine} unit={cat?.unit ?? ""} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface RowData {
  rank: number;
  user_id: string;
  display_name: string;
  value: number;
  sample_count: number;
  verified: boolean;
  activity_id: string | null;
  is_me: boolean;
}

function Row({ r, unit }: { r: RowData; unit: string }) {
  const content = (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="w-7 shrink-0 text-sm text-muted-foreground">{Number(r.rank)}.</span>
      <span className="flex-1 truncate text-sm font-medium">
        {r.display_name}
        {r.is_me && <span className="ml-2 text-xs text-neon">du</span>}
      </span>
      {r.verified && (
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          <Trophy className="mr-1 h-3 w-3" /> verifiziert
        </Badge>
      )}
      <span className="shrink-0 font-display text-sm font-semibold">{fmt(Number(r.value), unit)}</span>
    </div>
  );
  if (r.is_me && r.activity_id) {
    return (
      <Link to="/activities/$id" params={{ id: r.activity_id }} className="block hover:bg-elevated">
        {content}
      </Link>
    );
  }
  return content;
}
