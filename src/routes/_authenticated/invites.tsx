import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, MailOpen, LogOut } from "lucide-react";
import { toast } from "sonner";
import { leaveTeamChat } from "@/lib/team";
import { humanError } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/invites")({
  head: () => ({
    meta: [
      { title: "Einladungen – Hybrid Athlete" },
      { name: "description", content: "Team-Einladungen erstellen, teilen und verwalten." },
      { property: "og:title", content: "Einladungen – Hybrid Athlete" },
      { property: "og:description", content: "Team-Einladungen erstellen und verwalten." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/invites" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Einladungen – Hybrid Athlete" },
      { name: "twitter:description", content: "Team-Einladungen erstellen und verwalten." },
    ],
  }),
  component: InvitesPage,
});

interface InviteRow extends Tables<"team_members"> {
  teams:
    | (Pick<Tables<"teams">, "name" | "coach_id" | "team_chat_id"> & {
        profiles: Pick<Tables<"profiles">, "name"> | null;
      })
    | null;
}

function InvitesPage() {
  const qc = useQueryClient();

  const { data: invites } = useQuery({
    queryKey: ["my-invites"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("team_members")
        .select("*, teams(name, coach_id, team_chat_id, profiles!teams_coach_id_profiles_fkey(name))")
        .eq("user_id", u.user.id);
      if (error) throw error;
      return (data ?? []) as InviteRow[];
    },
  });

  const respond = useMutation({
    mutationFn: async ({
      id,
      status,
      chatId,
    }: {
      id: string;
      status: "active" | "declined";
      chatId?: string | null;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("team_members")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      if (status === "active" && chatId && u.user) {
        // join team chat
        await supabase.from("chat_participants").insert({ chat_id: chatId, user_id: u.user.id });
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["my-invites"] });
      toast.success(v.status === "active" ? "Team beigetreten" : "Einladung abgelehnt");
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);

  const leaveTeam = useMutation({
    mutationFn: async (i: { id: string; team_chat_id: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Nicht angemeldet");
      const { error } = await supabase.from("team_members").delete().eq("id", i.id);
      if (error) throw error;
      // Chat-Zugriff im Team-Chat aufräumen, falls vorhanden.
      await leaveTeamChat(i.team_chat_id, u.user.id);
    },
    onSuccess: () => {
      setConfirmLeave(null);
      qc.invalidateQueries({ queryKey: ["my-invites"] });
      qc.invalidateQueries({ queryKey: ["chats"] });
      toast.success("Team verlassen");
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const pending = (invites ?? []).filter((i) => i.status === "pending");
  const active = (invites ?? []).filter((i) => i.status === "active");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Einladungen & Teams</h1>
        <p className="text-sm text-muted-foreground">Team-Einladungen deiner Trainer.</p>
      </header>

      <section className="card-elevated p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <MailOpen className="h-4 w-4" /> Offene Einladungen
        </h2>
        <ul className="divide-y divide-border">
          {pending.map((i) => (
            <li key={i.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{i.teams?.name}</div>
                <div className="text-xs text-muted-foreground">
                  Trainer: {i.teams?.profiles?.name ?? "?"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    respond.mutate({ id: i.id, status: "active", chatId: i.teams?.team_chat_id })
                  }
                >
                  <Check className="mr-1 h-4 w-4" /> Annehmen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respond.mutate({ id: i.id, status: "declined" })}
                >
                  <X className="mr-1 h-4 w-4" /> Ablehnen
                </Button>
              </div>
            </li>
          ))}
          {pending.length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">Keine offenen Einladungen.</li>
          )}
        </ul>
      </section>

      <section className="card-elevated p-4">
        <h2 className="mb-3 text-sm font-semibold">Meine Teams</h2>
        <ul className="divide-y divide-border">
          {active.map((i) => (
            <li key={i.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{i.teams?.name}</div>
                <div className="text-xs text-muted-foreground">
                  Trainer: {i.teams?.profiles?.name ?? "?"}
                </div>
              </div>
              {confirmLeave === i.id ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={leaveTeam.isPending}
                    onClick={() =>
                      leaveTeam.mutate({ id: i.id, team_chat_id: i.teams?.team_chat_id ?? null })
                    }
                  >
                    Wirklich verlassen
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmLeave(null)}>
                    Abbrechen
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setConfirmLeave(i.id)}>
                  <LogOut className="mr-1 h-4 w-4" /> Team verlassen
                </Button>
              )}
            </li>
          ))}
          {active.length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">Noch in keinem Team.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
