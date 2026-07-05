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
