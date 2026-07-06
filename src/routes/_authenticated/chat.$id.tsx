import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Users, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { humanError } from "@/lib/errors";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({ meta: [{ title: "Chat – Hybrid Athlete" }] }),
  component: ChatRoom,
});

interface ChatParticipantRow {
  user_id: string;
  profiles: Pick<Tables<"profiles">, "name"> | null;
}

interface MessageRow extends Tables<"chat_messages"> {
  profiles: Pick<Tables<"profiles">, "name"> | null;
}

function ChatRoom() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: me } = useQuery({
    queryKey: ["me-uid"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: chat } = useQuery({
    queryKey: ["chat", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*, teams(name, coach_id, coach_only_chat)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: others } = useQuery({
    queryKey: ["chat-others", id, me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_participants")
        .select("user_id, profiles!chat_participants_user_id_profiles_fkey(name)")
        .eq("chat_id", id)
        .neq("user_id", me!.id);
      return (data ?? []) as ChatParticipantRow[];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*, profiles!chat_messages_sender_id_profiles_fkey(name)")
        .eq("chat_id", id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${id}` },
        async (payload) => {
          const row = payload.new as { id: string; sender_id: string };
          // Neue Nachricht direkt in den Cache appenden statt komplett neu zu laden.
          // Absender-Name nachladen (nicht im Realtime-Payload enthalten).
          const { data: prof } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", row.sender_id)
            .maybeSingle();
          qc.setQueryData<MessageRow[]>(["messages", id], (old) => {
            const list = old ?? [];
            if (list.some((m) => m.id === row.id)) return list;
            return [...list, { ...row, profiles: prof ?? { name: null } } as MessageRow];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const locked =
    chat?.type === "team" && chat?.teams?.coach_only_chat && chat?.teams?.coach_id !== me?.id;

  async function send() {
    const msg = text.trim();
    if (!msg || !me) return;
    const { error } = await supabase
      .from("chat_messages")
      .insert({ chat_id: id, sender_id: me.id, message: msg });
    if (error) {
      // Text im Feld belassen, damit der Nutzer erneut senden kann.
      toast.error(humanError(error));
      return;
    }
    setText("");
  }

  const title =
    chat?.type === "team"
      ? (chat?.teams?.name ?? "Team-Chat")
      : others?.map((o) => o.profiles?.name ?? "Unbekannt").join(", ") || "Direkt-Chat";

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Zurück zur Chat-Übersicht">
          <Link to="/chat">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-neon-soft text-neon">
          {chat?.type === "team" ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="truncate font-display font-semibold">{title}</div>
          {locked && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Nur Trainer darf schreiben
            </div>
          )}
        </div>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Chat-Nachrichten"
        className="flex-1 space-y-2 overflow-y-auto rounded-lg border border-border bg-background/40 p-3"
      >
        {(messages ?? []).map((m) => {
          const mine = m.sender_id === me?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-neon text-neon-foreground" : "bg-elevated"}`}
              >
                {!mine && (
                  <div className="mb-0.5 text-[10px] font-semibold text-neon">
                    {m.profiles?.name ?? "?"}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.message}</div>
                <div className={`mt-0.5 text-[9px] opacity-70`}>
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {(messages ?? []).length === 0 && (
          <div className="py-10 text-center text-xs text-muted-foreground">Sag Hallo 👋</div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={locked ? "Chat gesperrt" : "Nachricht schreiben…"}
          disabled={!!locked}
        />
        <Button onClick={send} disabled={!!locked || !text.trim()} aria-label="Nachricht senden">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
