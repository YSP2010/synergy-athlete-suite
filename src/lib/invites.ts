/**
 * Einladungslinks für Teams.
 * Der Klartext-Token verlässt nie die Datenbank – gespeichert wird ausschließlich
 * der SHA-256-Hash. Der Link existiert nur einmal im Browser des Trainers.
 */
import { supabase } from "@/integrations/supabase/client";

/** Erzeugt einen zufälligen, URL-sicheren Token (32 Byte, base64url). */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256-Hash eines Tokens als Hex-String. */
export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface InvitePreview {
  team_id: string | null;
  team_name: string | null;
  coach_name: string | null;
  member_count: number;
  valid: boolean;
  reason: string;
}

/** Vorschau einer Einladung – funktioniert auch ohne Anmeldung. */
export async function peekInvite(token: string): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc("peek_team_invite", {
    _token_hash: await hashToken(token),
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  return (
    row ?? {
      team_id: null,
      team_name: null,
      coach_name: null,
      member_count: 0,
      valid: false,
      reason: "not_found",
    }
  );
}

export interface RedeemResult {
  ok: boolean;
  reason: string;
  team_id: string | null;
  team_name: string | null;
}

/** Einladung einlösen (idempotent). */
export async function redeemInvite(token: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc("redeem_team_invite", {
    _token_hash: await hashToken(token),
  });
  if (error) throw error;
  const row = (data ?? [])[0];
  return row ?? { ok: false, reason: "not_found", team_id: null, team_name: null };
}

/** Verständliche Meldung zu einem Ergebnis-/Ablehnungsgrund. */
export function inviteReasonText(reason: string): string {
  switch (reason) {
    case "not_found":
      return "Diesen Einladungslink gibt es nicht (mehr).";
    case "expired":
      return "Dieser Einladungslink ist abgelaufen.";
    case "revoked":
      return "Dieser Einladungslink wurde zurückgezogen.";
    case "exhausted":
      return "Dieser Einladungslink wurde bereits vollständig genutzt.";
    case "is_coach":
      return "Du bist Trainer dieses Teams – ein Beitritt ist nicht nötig.";
    case "already_member":
      return "Du bist bereits Mitglied dieses Teams.";
    case "joined":
      return "Du bist dem Team beigetreten.";
    default:
      return "Der Einladungslink konnte nicht eingelöst werden.";
  }
}

/** Nur app-interne Pfade als Weiterleitungsziel zulassen. */
export function safeRedirect(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/")) return undefined;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return undefined;
  return raw;
}
