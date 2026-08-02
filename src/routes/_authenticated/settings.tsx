import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Goal } from "@/lib/planner";
import { Loader2, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useServerFn } from "@tanstack/react-start";
import { recomputeMyLeaderboard } from "@/lib/leaderboard.functions";
import { humanError } from "@/lib/errors";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { clearAppCaches } from "@/lib/pwa/register";
import { GuardianConsentCard } from "@/components/settings/GuardianConsentCard";
import { GUARDIAN_CONSENT_KIND, isMinor } from "@/lib/youth";


export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Einstellungen – Hybrid Athlete" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const [f, setF] = useState({
    name: "",
    weight_kg: "",
    goal: "performance" as Goal,
    gym_days: [] as number[],
    sport_days: [] as number[],
    match_days: [] as number[],
  });

  useEffect(() => {
    if (profile) {
      setF({
        name: profile.name ?? "",
        weight_kg: profile.weight_kg?.toString() ?? "",
        goal: (profile.goal ?? "performance") as Goal,
        gym_days: profile.gym_days ?? [],
        sport_days: profile.sport_days ?? [],
        match_days: profile.match_days ?? [],
      });
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { error } = await supabase
        .from("profiles")
        .update({
          name: f.name,
          weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
          goal: f.goal,
          gym_days: f.gym_days,
          sport_days: f.sport_days,
          match_days: f.match_days,
        })
        .eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Gespeichert");
    },
    onError: (e) => toast.error(humanError(e)),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await clearAppCaches();
    nav({ to: "/auth", replace: true });
  }

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Lade…</div>;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-8">
      <h1 className="font-display text-3xl font-bold">Einstellungen</h1>

      <div className="card-elevated space-y-4 p-5">
        <div>
          <Label>Name</Label>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <Label>Gewicht (kg)</Label>
          <Input
            type="number"
            step="0.1"
            value={f.weight_kg}
            onChange={(e) => setF({ ...f, weight_kg: e.target.value })}
          />
        </div>
        <div>
          <Label>Ziel</Label>
          <Select value={f.goal} onValueChange={(v) => setF({ ...f, goal: v as Goal })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="muscle_gain">Muskelaufbau</SelectItem>
              <SelectItem value="maintain">Erhalten</SelectItem>
              <SelectItem value="recomp">Recomp</SelectItem>
              <SelectItem value="performance">Leistung</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DayPicker
          label="Gym-Tage"
          value={f.gym_days}
          onChange={(v) => setF({ ...f, gym_days: v })}
        />
        <DayPicker
          label="Sport-Tage"
          value={f.sport_days}
          onChange={(v) => setF({ ...f, sport_days: v })}
        />
        <DayPicker
          label="Spieltage"
          value={f.match_days}
          onChange={(v) => setF({ ...f, match_days: v })}
        />
        <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending}>
          Speichern
        </Button>
      </div>

      <GuardianConsentCard />

      <LeaderboardSettings />

      <NotificationSettings />


      <Link
        to="/privacy"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground hover:bg-elevated"
      >
        <ShieldCheck className="h-4 w-4" /> Datenschutz, Export & Kontolöschung
      </Link>


      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-danger hover:bg-elevated"
      >
        <LogOut className="h-4 w-4" /> Abmelden
      </button>
    </div>
  );
}

function DayPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number[];
  onChange: (v: number[]) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {WEEKDAY_LABELS.map((d, i) => {
          const active = value.includes(i);
          return (
            <button
              key={d}
              type="button"
              onClick={() =>
                active ? onChange(value.filter((v) => v !== i)) : onChange([...value, i].sort())
              }
              className={cn(
                "h-10 w-10 rounded-lg border text-sm font-medium",
                active ? "border-neon bg-neon text-neon-foreground" : "border-border bg-elevated",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Abschnitt „Bestenliste & Sichtbarkeit" – Einwilligungen inklusive Protokoll. */
function LeaderboardSettings() {
  const qc = useQueryClient();
  const recompute = useServerFn(recomputeMyLeaderboard);

  const { data: profile } = useQuery({
    queryKey: ["profile-leaderboard"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, name, birth_date, leaderboard_opt_in, leaderboard_display_name, leaderboard_share_health",
        )
        .eq("id", u.user.id)
        .maybeSingle();
      const { data: consent } = await supabase
        .from("consents")
        .select("granted")
        .eq("user_id", u.user.id)
        .eq("kind", GUARDIAN_CONSENT_KIND)
        .order("changed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? { ...data, guardianGranted: consent?.granted === true } : null;
    },
  });

  const [displayName, setDisplayName] = useState("");
  useEffect(() => {
    if (profile) setDisplayName(profile.leaderboard_display_name ?? "");
  }, [profile]);

  const update = useMutation({
    mutationFn: async (
      patch: {
        leaderboard_opt_in?: boolean;
        leaderboard_share_health?: boolean;
        leaderboard_display_name?: string | null;
      } & { consentKind?: string; consentValue?: boolean },
    ) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { consentKind, consentValue, ...fields } = patch;
      const { error } = await supabase.from("profiles").update(fields).eq("id", u.user.id);
      if (error) throw error;
      if (consentKind) {
        await supabase.from("consents").insert({
          user_id: u.user.id,
          kind: consentKind,
          granted: consentValue === true,
          version: "v1",
        });
      }
      if (fields.leaderboard_opt_in === true || consentValue === true) {
        await recompute({ data: undefined });
      }
    },
    onSuccess: () => {
      toast.success("Gespeichert");
      qc.invalidateQueries({ queryKey: ["profile-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["lb-me"] });
      qc.invalidateQueries({ queryKey: ["lb-rows"] });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  const optedIn = profile?.leaderboard_opt_in === true;
  // Jugendschutz: unter 16 nur mit Einwilligung der Erziehungsberechtigten.
  const youthBlocked = isMinor(profile?.birth_date) && profile?.guardianGranted !== true;
  const preview = displayName.trim() || profile?.name || "Athlet";

  return (
    <div className="card-elevated space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">Bestenliste & Sichtbarkeit</h2>
      {youthBlocked && (
        <p className="rounded-lg border border-border bg-elevated p-3 text-xs text-muted-foreground">
          Öffentliche Wertungen sind gesperrt, bis die Einwilligung der Erziehungsberechtigten
          vorliegt.
        </p>
      )}

      <label className="flex items-start justify-between gap-4">
        <span className="text-sm">
          <span className="font-medium">An der Bestenliste teilnehmen</span>
          <span className="block text-xs text-muted-foreground">
            Andere angemeldete Nutzer sehen deinen Anzeigenamen und deine Werte in Lauf-, Rad-, Schwimm- und
            Konsistenz-Kategorien.
          </span>
        </span>
        <Switch
          checked={optedIn}
          disabled={youthBlocked}
          onCheckedChange={(v) =>
            update.mutate({ leaderboard_opt_in: v, consentKind: "leaderboard", consentValue: v })
          }
        />
      </label>

      <label className="flex items-start justify-between gap-4">
        <span className="text-sm">
          <span className="font-medium">Gesundheitsdaten in Wertungen freigeben</span>
          <span className="block text-xs text-muted-foreground">
            Zusätzliche Zustimmung für Schlaf-Score, HRV-Konstanz und Ruhepuls. Jederzeit widerrufbar – die
            Einträge werden dann sofort gelöscht.
          </span>
        </span>
        <Switch
          checked={profile?.leaderboard_share_health === true}
          disabled={!optedIn || youthBlocked}
          onCheckedChange={(v) =>
            update.mutate({ leaderboard_share_health: v, consentKind: "leaderboard_health", consentValue: v })
          }
        />
      </label>

      <div>
        <Label>Anzeigename in der Rangliste</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Pseudonym erlaubt"
          maxLength={40}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Vorschau: andere sehen dich als <strong className="text-foreground">{preview}</strong>
          {optedIn ? "" : " – aktuell erscheinst du nirgends."}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => update.mutate({ leaderboard_display_name: displayName.trim() || null })}
          disabled={update.isPending}
        >
          Anzeigename speichern
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            const res = await recompute({ data: undefined });
            toast.success(res?.skipped === "rate_limit" ? "Kürzlich schon berechnet" : "Werte aktualisiert");
          }}
          disabled={!optedIn || youthBlocked}
          aria-label="Bestenlisten-Werte neu berechnen"
        >
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
