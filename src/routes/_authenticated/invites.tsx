import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, MailOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/invites")({
  head: () => ({ meta: [{ title: "Einladungen – Hybrid Athlete" }] }),
  component: InvitesPage,
});

function InvitesPage() {
  const qc = useQueryClient();

  const { data: invites } = useQuery({
    queryKey: ["my-invites"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("team_members")
        .select("*, teams(name, coach_id, team_chat_id, profiles!teams_coach_id_fkey(name))")
        .eq("user_id", u.user.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, status, chatId }: { id: string; status: "active" | "declined"; chatId?: string | null }) => {
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
    onError: (e: Error) => toast.error(e.message),
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
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><MailOpen className="h-4 w-4" /> Offene Einladungen</div>
        <ul className="divide-y divide-border">
          {pending.map((i: any) => (
            <li key={i.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{i.teams?.name}</div>
                <div className="text-xs text-muted-foreground">Trainer: {i.teams?.profiles?.name ?? "?"}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => respond.mutate({ id: i.id, status: "active", chatId: i.teams?.team_chat_id })}>
                  <Check className="mr-1 h-4 w-4" /> Annehmen
                </Button>
                <Button size="sm" variant="outline" onClick={() => respond.mutate({ id: i.id, status: "declined" })}>
                  <X className="mr-1 h-4 w-4" /> Ablehnen
                </Button>
              </div>
            </li>
          ))}
          {pending.length === 0 && <li className="py-2 text-sm text-muted-foreground">Keine offenen Einladungen.</li>}
        </ul>
      </section>

      <section className="card-elevated p-4">
        <div className="mb-3 text-sm font-semibold">Meine Teams</div>
        <ul className="divide-y divide-border">
          {active.map((i: any) => (
            <li key={i.id} className="py-2">
              <div className="font-medium">{i.teams?.name}</div>
              <div className="text-xs text-muted-foreground">Trainer: {i.teams?.profiles?.name ?? "?"}</div>
            </li>
          ))}
          {active.length === 0 && <li className="py-2 text-sm text-muted-foreground">Noch in keinem Team.</li>}
        </ul>
      </section>
    </div>
  );
}
