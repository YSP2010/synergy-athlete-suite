/** Browser-Helfer für Push-Anmeldung. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export interface SubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

function keyToBase64(sub: PushSubscription, name: "p256dh" | "auth"): string {
  const raw = sub.getKey(name);
  if (!raw) return "";
  const std = btoa(String.fromCharCode(...new Uint8Array(raw)));
  // Web-Push erwartet base64url (ohne + / =), sonst schlägt die Verschlüsselung fehl.
  return std.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Meldet den Browser beim Push-Dienst an und liefert die Schlüssel. */
export async function subscribeToPush(vapidKey: string): Promise<SubscriptionKeys> {
  if (!vapidKey) {
    throw new Error("Auf dem Server fehlt der VAPID-Schlüssel – Push ist nicht konfiguriert.");
  }
  // Nutzt den tatsächlichen Aktivierungsstatus statt nur Androids teils
  // verzögert auflösendem `navigator.serviceWorker.ready`.
  const { getReadyServiceWorkerRegistration } = await import("./register");
  const reg = await getReadyServiceWorkerRegistration();

  const existing = await reg.pushManager.getSubscription();
  let sub = existing;
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    } catch (e) {
      console.error("[push] subscribe fehlgeschlagen", e);
      throw new Error(
        `Anmeldung beim Push-Dienst fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }


  return {
    endpoint: sub.endpoint,
    p256dh: keyToBase64(sub, "p256dh"),
    auth: keyToBase64(sub, "auth"),
  };
}

/** Meldet das Gerät ab und liefert den entfernten Endpunkt. */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();

  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
