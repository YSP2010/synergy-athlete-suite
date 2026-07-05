import { supabase } from "@/integrations/supabase/client";

export async function findProfileByEmail(email: string) {
  const { data, error } = await supabase.rpc("find_profile_by_email", { _email: email.trim() });
  if (error) throw error;
  return (data?.[0] ?? null) as { id: string; name: string | null; role: "athlete" | "coach" } | null;
}

/**
 * Get or create a direct chat between auth user and target user.
 * Läuft atomar in einer SECURITY-DEFINER-RPC, um Race Conditions und
 * verwaiste Chats (Chat ohne beide Teilnehmer) zu vermeiden.
 */
export async function getOrCreateDirectChat(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_or_create_direct_chat", {
    _other_user_id: otherUserId,
  });
  if (error) throw error;
  if (!data) throw new Error("Chat konnte nicht erstellt werden");
  return data as string;
}

/**
 * Erstellt ein Team samt Team-Chat atomar in einer SECURITY-DEFINER-RPC.
 * Gibt die ID des neu erstellten Teams zurück.
 */
export async function createTeamWithChat(name: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_team_with_chat", {
    _name: name.trim(),
  });
  if (error) throw error;
  if (!data) throw new Error("Team konnte nicht erstellt werden");
  return data as string;
}

/**
 * Räumt den Team-Chat-Zugriff eines Users auf, wenn er ein Team verlässt oder
 * entfernt wird. Löscht den chat_participants-Eintrag, falls ein Team-Chat
 * existiert. No-op, wenn kein Chat gesetzt ist.
 */
export async function leaveTeamChat(chatId: string | null, userId: string): Promise<void> {
  if (!chatId) return;
  const { error } = await supabase
    .from("chat_participants")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;
}
