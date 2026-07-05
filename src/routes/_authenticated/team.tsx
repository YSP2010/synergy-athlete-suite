import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Plus, Mail, MessageSquare, Trash2, Loader2, Shield, Settings2 } from "lucide-react";
import { findProfileByEmail, getOrCreateDirectChat, createTeamWithChat, leaveTeamChat } from "@/lib/team";
import { Switch } from "@/components/ui/switch";
import { QueryError } from "@/components/ui/query-error";
import { toISODate, today, addDays } from "@/lib/dates";
import {
  calcRecovery,
  type DailyStat,
  type GymSession,
  type RecoveryLevel,
  type SportSession,
} from "@/lib/planner";
import { cn } from "@/lib/utils";
import { humanError } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";

type TeamRow = Tables<"teams">;

interface TeamMemberRow extends Tables<"team_members"> {
  profiles: Pick<Tables<"profiles">, "name" | "role"> | null;
}

interface RecoveryStatRow extends DailyStat {
  user_id: string;
}
interface RecoverySportRow extends SportSession {
  user_id: string;
}
interface RecoveryGymRow extends GymSession {
  user_id: string;
}

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Teams – Hybrid Athlete" }] }),
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const [newTeam, setNewTeam] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: me } = useQuery({
    queryKey: ["me-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("role, name").eq("id", u.user.id).maybeSingle();
      return { id: u.user.id, ...data };
    },
  });

  const { data: teams, isError: teamsError, refetch: refetchTeams } = useQuery({
    queryKey: ["teams", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("coach_id", me!.id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeTeam = teams?.find((t) => t.id === selected) ?? teams?.[0];

  const createTeam = useMutation({
    mutationFn: async () => {
      if (!newTeam.trim()) throw new Error("Name fehlt");
      // Atomar: Team + Team-Chat + Teilnahme in einer SECURITY-DEFINER-RPC.
      return await createTeamWithChat(newTeam);
    },
    onSuccess: (teamId) => {
      setNewTeam("");
      setSelected(teamId);
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team erstellt");
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  if (me?.role !== "coach") {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Nur für Trainer</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dieser Bereich ist Trainern vorbehalten. Die Trainer-Rolle wird bei der Registrierung
          gewählt und kann später nicht mehr geändert werden.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Deine Teams</h1>
        <p className="text-sm text-muted-foreground">Erstelle Teams, lade Spieler ein und öffne Team-Chats.</p>
      </header>

      {teamsError && <QueryError onRetry={() => refetchTeams()} />}

      <div className="card-elevated p-4">
        <Label htmlFor="new-team-name">Neues Team erstellen</Label>
        <div className="mt-2 flex gap-2">
          <Input id="new-team-name" value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="z. B. U19 Herbst" />
          <Button onClick={() => createTeam.mutate()} disabled={createTeam.isPending}>
            {createTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1">Erstellen</span>
          </Button>
        </div>
      </div>

      {teams && teams.length > 0 && (
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="space-y-1">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  activeTeam?.id === t.id ? "border-neon bg-neon-soft text-neon" : "border-border bg-elevated"
                }`}
              >
                <div className="font-semibold">{t.name}</div>
              </button>
            ))}
          </aside>
          {activeTeam && <TeamDetail team={activeTeam} />}
        </div>
      )}
    </div>
  );
}

function TeamDetail({ team }: { team: TeamRow }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const { data: members } = useQuery({
    queryKey: ["team-members", team.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*, profiles!team_members_user_id_fkey(name, role)")
        .eq("team_id", team.id);
      if (error) throw error;
      return (data ?? []) as TeamMemberRow[];
    },
  });

  // Recovery-Ampel je aktivem Mitglied: daily_stats (heute/gestern) + Load 72h.
  const activeUserIds = (members ?? [])
    .filter((m) => m.status === "active")
    .map((m) => m.user_id);

  const { data: teamRecovery } = useQuery({
    queryKey: ["team-recovery", team.id, activeUserIds],
    enabled: activeUserIds.length > 0,
    queryFn: async () => {
      const todayIso = toISODate(today());
      const yesterdayIso = toISODate(addDays(today(), -1));
      const windowStart = toISODate(addDays(today(), -3));

      const [statsRes, sportRes, gymRes] = await Promise.all([
        supabase
          .from("daily_stats")
          .select("user_id,date,weight_kg,sleep_hours,sleep_quality,soreness,stress,mood")
          .in("user_id", activeUserIds)
          .in("date", [todayIso, yesterdayIso]),
        supabase
          .from("workouts_sport")
          .select("user_id,date,kind,intensity,match_hardness,duration_min")
          .in("user_id", activeUserIds)
          .gte("date", windowStart)
          .lt("date", todayIso),
        supabase
          .from("workouts_gym")
          .select("user_id,date,session_type,duration_min")
          .in("user_id", activeUserIds)
          .gte("date", windowStart)
          .lt("date", todayIso),
      ]);

      const statsByUser = new Map<string, DailyStat>();
      // Neuestes stat pro Nutzer (heute vor gestern) als Basis.
      for (const row of (statsRes.data ?? []) as RecoveryStatRow[]) {
        const prev = statsByUser.get(row.user_id);
        if (!prev || row.date > prev.date) statsByUser.set(row.user_id, row);
      }
      const sportByUser = new Map<string, SportSession[]>();
      for (const row of (sportRes.data ?? []) as RecoverySportRow[]) {
        const arr = sportByUser.get(row.user_id) ?? [];
        arr.push(row);
        sportByUser.set(row.user_id, arr);
      }
      const gymByUser = new Map<string, GymSession[]>();
      for (const row of (gymRes.data ?? []) as RecoveryGymRow[]) {
        const arr = gymByUser.get(row.user_id) ?? [];
        arr.push(row);
        gymByUser.set(row.user_id, arr);
      }

      const result: Record<string, { score: number; level: RecoveryLevel; hasData: boolean }> = {};
      for (const uid of activeUserIds) {
        const stat = statsByUser.get(uid) ?? null;
        const sport = sportByUser.get(uid) ?? [];
        const gym = gymByUser.get(uid) ?? [];
        const hasData = !!stat || sport.length > 0 || gym.length > 0;
        const r = calcRecovery(stat, sport, gym);
        result[uid] = { score: r.score, level: r.level, hasData };
      }
      return result;
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const prof = await findProfileByEmail(email);
      if (!prof) throw new Error("Kein Nutzer mit dieser E-Mail gefunden");
      // Upsert statt Insert: erlaubt erneutes Einladen nach vorheriger
      // Ablehnung (UNIQUE(team_id, user_id)) durch Zurücksetzen des Status.
      const { error } = await supabase
        .from("team_members")
        .upsert(
          {
            team_id: team.id,
            user_id: prof.id,
            status: "pending",
            invited_at: new Date().toISOString(),
            responded_at: null,
          },
          { onConflict: "team_id,user_id" },
        );
      if (error) throw error;
      // open direct chat with player and post a hello message
      const chatId = await getOrCreateDirectChat(prof.id);
      await supabase.from("chat_messages").insert({
        chat_id: chatId,
        sender_id: (await supabase.auth.getUser()).data.user!.id,
        message: `Hi! Du wurdest zu Team „${team.name}" eingeladen. Schau in dein Postfach unter „Einladungen".`,
      });
      return prof;
    },
    onSuccess: (prof) => {
      setEmail("");
      qc.invalidateQueries({ queryKey: ["team-members", team.id] });
      toast.success(`Eingeladen: ${prof.name ?? prof.id.slice(0, 6)}`);
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const removeMember = useMutation({
    mutationFn: async (m: { id: string; user_id: string }) => {
      const { error } = await supabase.from("team_members").delete().eq("id", m.id);
      if (error) throw error;
      // Chat-Zugriff des entfernten Mitglieds im Team-Chat aufräumen.
      await leaveTeamChat(team.team_chat_id ?? null, m.user_id);
    },
    onSuccess: () => {
      setConfirmRemove(null);
      qc.invalidateQueries({ queryKey: ["team-members", team.id] });
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const toggleLock = useMutation({
    mutationFn: async (v: boolean) => {
      const { error } = await supabase.from("teams").update({ coach_only_chat: v }).eq("id", team.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
    onError: (e: Error) => toast.error(humanError(e)),
  });

  return (
    <section className="space-y-4">
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">{team.name}</h2>
            <p className="text-xs text-muted-foreground">{members?.length ?? 0} Mitglieder</p>
          </div>
          {team.team_chat_id && (
            <Button asChild variant="outline" size="sm">
              <Link to="/chat/$id" params={{ id: team.team_chat_id }}>
                <MessageSquare className="mr-2 h-4 w-4" /> Team-Chat
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="card-elevated p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4" /> Team-Chat Einstellungen
        </h2>
        <div className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2">
          <div>
            <div className="text-sm font-medium">Nur Trainer darf schreiben</div>
            <div className="text-xs text-muted-foreground">Spieler können lesen, aber nicht antworten.</div>
          </div>
          <Switch checked={!!team.coach_only_chat} onCheckedChange={(v) => toggleLock.mutate(v)} />
        </div>
      </div>

      <div className="card-elevated p-4">
        <Label htmlFor="invite-email">Spieler per E-Mail einladen</Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="invite-email"
            value={email}
            type="email"
            placeholder="spieler@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={() => invite.mutate()} disabled={invite.isPending}>
            {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            <span className="ml-1">Einladen</span>
          </Button>
        </div>
      </div>

      <div className="card-elevated p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4" /> Mitglieder
        </h2>
        <ul className="divide-y divide-border">
          {(members ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {m.profiles?.name ?? "Unbekannt"}
                  {m.status === "active" && <RecoveryDot rec={teamRecovery?.[m.user_id]} />}
                </div>
                <div className="text-xs text-muted-foreground">
                  Status: <span className="capitalize">{m.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.status === "active" && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/athletes/$id" params={{ id: m.user_id }}>Ansicht</Link>
                  </Button>
                )}
                {confirmRemove === m.id ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate({ id: m.id, user_id: m.user_id })}
                    >
                      Wirklich entfernen
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmRemove(null)}>
                      Abbrechen
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmRemove(m.id)}
                    aria-label="Entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
          {(members ?? []).length === 0 && (
            <li className="py-4 text-sm text-muted-foreground">Noch keine Mitglieder eingeladen.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

// Recovery-Ampel: grün (green ≥ 75), gelb (amber ≥ 50), rot (< 50) – Schwellen
// stammen direkt aus calcRecovery. Ohne Check-in/Daten: grauer Punkt + „–".
function RecoveryDot({
  rec,
}: {
  rec?: { score: number; level: RecoveryLevel; hasData: boolean };
}) {
  if (!rec || !rec.hasData) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />–
      </span>
    );
  }
  const color =
    rec.level === "green" ? "bg-success" : rec.level === "amber" ? "bg-warn" : "bg-danger";
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} title="Recovery-Score" />
      <span className="tabular text-muted-foreground">{rec.score}</span>
    </span>
  );
}

