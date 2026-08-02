import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QueryError } from "@/components/ui/query-error";
import { MessageSquare, Users, User } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Nachrichten – Hybrid Athlete" },
      { name: "description", content: "Alle Team- und Direktchats zwischen Trainern und Athleten an einem Ort." },
      { property: "og:title", content: "Nachrichten – Hybrid Athlete" },
      { property: "og:description", content: "Team- und Direktchats an einem Ort." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/chat" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Nachrichten – Hybrid Athlete" },
      { name: "twitter:description", content: "Team- und Direktchats an einem Ort." },
    ],
  }),
  head: () => ({ meta: [{ title: "Chats – Hybrid Athlete" }] }),
  component: ChatListPage,
});

interface ChatParticipantRow {
  user_id: string;
  profiles: Pick<Tables<"profiles">, "name"> | null;
}

type LastMessageRow = Pick<Tables<"chat_messages">, "message" | "created_at" | "sender_id">;

interface ChatRow extends Tables<"chats"> {
  teams: Pick<Tables<"teams">, "name"> | null;
  others: ChatParticipantRow[];
  last: LastMessageRow | null;
}

function ChatListPage() {
  const {
    data: chats,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data: parts } = await supabase
        .from("chat_participants")
        .select("chat_id")
        .eq("user_id", u.user.id);
      const ids = (parts ?? []).map((p) => p.chat_id);
      if (!ids.length) return [];
      const { data: chatRows } = await supabase
        .from("chats")
        .select("*, teams(name)")
        .in("id", ids)
        .order("created_at", { ascending: false });
      // fetch other participants + last message for each
      const enriched = await Promise.all(
        (chatRows ?? []).map(async (c): Promise<ChatRow> => {
          const [{ data: others }, { data: last }] = await Promise.all([
            supabase
              .from("chat_participants")
              .select("user_id, profiles!chat_participants_user_id_profiles_fkey(name)")
              .eq("chat_id", c.id)
              .neq("user_id", u.user!.id),
            supabase
              .from("chat_messages")
              .select("message, created_at, sender_id")
              .eq("chat_id", c.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);
          return { ...c, others: (others ?? []) as ChatParticipantRow[], last };
        }),
      );
      return enriched;
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-3xl font-bold">Chats</h1>
        <p className="text-sm text-muted-foreground">Team- und Direktnachrichten in Echtzeit.</p>
      </header>

      {isError && <QueryError onRetry={() => refetch()} />}

      <div className="card-elevated divide-y divide-border">
        {(chats ?? []).map((c) => {
          const title =
            c.type === "team"
              ? (c.teams?.name ?? "Team-Chat")
              : c.others.map((o) => o.profiles?.name ?? "Unbekannt").join(", ") || "Direkt-Chat";
          return (
            <Link
              key={c.id}
              to="/chat/$id"
              params={{ id: c.id }}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-elevated"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-neon-soft text-neon">
                {c.type === "team" ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate font-medium">{title}</div>
                  {c.last && (
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(c.last.created_at).toLocaleDateString()}
                    </div>
                  )}
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
            Noch keine Chats. Trainer starten Chats über{" "}
            <Link to="/team" className="text-neon underline">
              /team
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  );
}
