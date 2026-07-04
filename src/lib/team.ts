import { supabase } from "@/integrations/supabase/client";

export async function findProfileByEmail(email: string) {
  const { data, error } = await supabase.rpc("find_profile_by_email", { _email: email.trim() });
  if (error) throw error;
  return (data?.[0] ?? null) as { id: string; name: string | null; role: "athlete" | "coach" } | null;
}

/** Get or create a direct chat between auth user and target user. */
export async function getOrCreateDirectChat(otherUserId: string): Promise<string> {
  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user?.id;
  if (!me) throw new Error("Nicht angemeldet");

  // find existing direct chat both participate in
  const { data: mine } = await supabase
    .from("chat_participants")
    .select("chat_id, chats!inner(id, type)")
    .eq("user_id", me);
  const candidateIds = (mine ?? [])
    .filter((r: any) => r.chats?.type === "direct")
    .map((r: any) => r.chat_id as string);

  if (candidateIds.length) {
    const { data: theirs } = await supabase
      .from("chat_participants")
      .select("chat_id")
      .eq("user_id", otherUserId)
      .in("chat_id", candidateIds);
    const match = theirs?.[0]?.chat_id;
    if (match) return match;
  }

  const { data: chat, error } = await supabase
    .from("chats")
    .insert({ type: "direct", created_by: me })
    .select("id")
    .single();
  if (error) throw error;

  const { error: pErr } = await supabase
    .from("chat_participants")
    .insert([
      { chat_id: chat.id, user_id: me },
      { chat_id: chat.id, user_id: otherUserId },
    ]);
  if (pErr) throw pErr;
  return chat.id;
}
