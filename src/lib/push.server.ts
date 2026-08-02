/**
 * Versand von Web-Push-Nachrichten. Server-only (VAPID-Schlüssel).
 */
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Sendet eine Nachricht. Gibt `gone: true` zurück, wenn das Abo ungültig ist. */
export async function sendPush(
  target: PushTarget,
  payload: PushPayload,
): Promise<{ ok: boolean; gone: boolean }> {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:noreply@example.com";
  if (!publicKey || !privateKey) return { ok: false, gone: false };

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
    );
    return { ok: true, gone: false };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return { ok: false, gone: true };
    console.error("[push] send failed", e);
    return { ok: false, gone: false };
  }
}
