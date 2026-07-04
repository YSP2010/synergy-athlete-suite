import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Users, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chats – Hybrid Athlete" }] }),
  component: ChatListPage,
});

function ChatListPage() {
  const { data: chats } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data: parts } = await supabase
        .from("chat_participants").select("chat_id").eq("user_id", u.user.id);
      const ids = (parts ?? []).map((p) => p.chat_id);
      if (!ids.length) return [];
      const { data: chatRows } = await supabase
        .from("chats").select("*, teams(name)").in("id", ids)
        .order("created_at", { ascending: false });
      // fetch other participants + last message for each
      const enriched = await Promise.all((chatRows ?? []).map(async (c: any) => {
        const [{ data: others }, { data: last }] = await Promise.all([
          supabase.from("chat_participants").select("user_id, profiles!chat_participants_user_id_fkey(name)")
            .eq("chat_id", c.id).neq("user_id", u.user!.id),
          supabase.from("chat_messages").select("message, created_at, sender_id").eq("chat_id", c.id)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        return { ...c, others: others ?? [], last };
      }));
      return enriched;
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl font-bold">Chats</h1>
        <p className="text-sm text-muted-foreground">Team- und Direktnachrichten in Echtzeit.</p>
      </header>

      <div className="card-elevated divide-y divide-border">
        {(chats ?? []).map((c: any) => {
          const title = c.type === "team" ? c.teams?.name ?? "Team-Chat" : c.others.map((o: any) => o.profiles?.name ?? "Unbekannt").join(", ") || "Direkt-Chat";
          return (
            <Link key={c.id} to="/chat/$id" params={{ id: c.id }} className="flex items-center gap-3 px-4 py-3 transition hover:bg-elevated">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-neon-soft text-neon">
                {c.type === "team" ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate font-medium">{title}</div>
                  {c.last && <div className="text-[10px] text-muted-foreground">{new Date(c.last.created_at).toLocaleDateString()}</div>}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {c.last?.message ?? "Noch keine Nachrichten"}
                </div>
              </div>
            </Link>
          );
        })}
        {(chats ?? []).length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <MessageSquare className="h-8 w-8" />
            Noch keine Chats. Trainer starten Chats über <Link to="/team" className="text-neon underline">/team</Link>.
          </div>
        )}
      </div>
    </div>
  );
}
