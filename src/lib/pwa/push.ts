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
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

/** Meldet den Browser beim Push-Dienst an und liefert die Schlüssel. */
export async function subscribeToPush(vapidKey: string): Promise<SubscriptionKeys> {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    }));
  return {
    endpoint: sub.endpoint,
    p256dh: keyToBase64(sub, "p256dh"),
    auth: keyToBase64(sub, "auth"),
  };
}

/** Meldet das Gerät ab und liefert den entfernten Endpunkt. */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
