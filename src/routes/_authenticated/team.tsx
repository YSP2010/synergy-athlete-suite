import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Plus, Mail, MessageSquare, Trash2, Loader2, Shield, Settings2 } from "lucide-react";
import { findProfileByEmail, getOrCreateDirectChat } from "@/lib/team";
import { Switch } from "@/components/ui/switch";

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

  const { data: teams } = useQuery({
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
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Nicht angemeldet");
      const { data: team, error } = await supabase
        .from("teams")
        .insert({ name: newTeam.trim(), coach_id: u.user.id })
        .select("*")
        .single();
      if (error) throw error;
      // team chat
      const { data: chat, error: cErr } = await supabase
        .from("chats")
        .insert({ type: "team", team_id: team.id, created_by: u.user.id })
        .select("id")
        .single();
      if (cErr) throw cErr;
      await supabase.from("chat_participants").insert({ chat_id: chat.id, user_id: u.user.id });
      await supabase.from("teams").update({ team_chat_id: chat.id }).eq("id", team.id);
      return team;
    },
    onSuccess: (t) => {
      setNewTeam("");
      setSelected(t.id);
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team erstellt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (me?.role !== "coach") {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-bold">Nur für Trainer</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dieser Bereich ist Trainern vorbehalten. Du kannst deine Rolle in den Einstellungen ändern.
        </p>
        <Button asChild className="mt-4"><Link to="/settings">Einstellungen</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Deine Teams</h1>
        <p className="text-sm text-muted-foreground">Erstelle Teams, lade Spieler ein und öffne Team-Chats.</p>
      </header>

      <div className="card-elevated p-4">
        <Label>Neues Team erstellen</Label>
        <div className="mt-2 flex gap-2">
          <Input value={newTeam} onChange={(e) => setNewTeam(e.target.value)} placeholder="z. B. U19 Herbst" />
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

function TeamDetail({ team }: { team: any }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: members } = useQuery({
    queryKey: ["team-members", team.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*, profiles!team_members_user_id_fkey(name, role)")
        .eq("team_id", team.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      const prof = await findProfileByEmail(email);
      if (!prof) throw new Error("Kein Nutzer mit dieser E-Mail gefunden");
      const { error } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: prof.id, status: "pending" });
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
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members", team.id] }),
  });

  const toggleLock = useMutation({
    mutationFn: async (v: boolean) => {
      const { error } = await supabase.from("teams").update({ coach_only_chat: v }).eq("id", team.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }),
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
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Settings2 className="h-4 w-4" /> Team-Chat Einstellungen
        </div>
        <div className="flex items-center justify-between rounded-lg bg-elevated px-3 py-2">
          <div>
            <div className="text-sm font-medium">Nur Trainer darf schreiben</div>
            <div className="text-xs text-muted-foreground">Spieler können lesen, aber nicht antworten.</div>
          </div>
          <Switch checked={!!team.coach_only_chat} onCheckedChange={(v) => toggleLock.mutate(v)} />
        </div>
      </div>

      <div className="card-elevated p-4">
        <Label>Spieler per E-Mail einladen</Label>
        <div className="mt-2 flex gap-2">
          <Input
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
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4" /> Mitglieder
        </div>
        <ul className="divide-y divide-border">
          {(members ?? []).map((m: any) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium">{m.profiles?.name ?? "Unbekannt"}</div>
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
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeMember.mutate(m.id)}
                  aria-label="Entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
