/**
 * Registrierung des Service Workers – der einzige Ort, an dem das passiert.
 * Es gibt keine Vorschau-Sperre mehr: überall dort, wo der Browser einen
 * sicheren Kontext (HTTPS oder localhost) bietet, wird registriert.
 * Nur `?sw=off` hebt die Registrierung bewusst wieder auf (Notausstieg).
 */
const SW_URL = "/sw.js";

function killSwitchActive(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("sw") === "off";
}

async function unregisterOwn(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => r.active?.scriptURL.endsWith(SW_URL) || r.installing?.scriptURL.endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  if (!("serviceWorker" in navigator)) {
    console.warn("[pwa] Dieser Browser unterstützt keine Service Worker.");
    return null;
  }
  if (killSwitchActive()) {
    await unregisterOwn();
    console.info("[pwa] Service Worker über ?sw=off deaktiviert.");
    return null;
  }
  if (!window.isSecureContext) {
    console.warn("[pwa] Kein sicherer Kontext (HTTPS nötig) – Service Worker wird nicht registriert.");
    return null;
  }
  try {
    // Erst prüfen, ob /sw.js überhaupt ausgeliefert wird. In der Vorschau/Dev
    // existiert die generierte Datei nicht – ohne Prüfung gäbe es nur einen 404-Fehler.
    const probe = await fetch(SW_URL, { method: "HEAD", cache: "no-store" });
    if (!probe.ok) {
      console.warn(
        `[pwa] ${SW_URL} ist nicht erreichbar (HTTP ${probe.status}) – Service Worker wird übersprungen. In der Vorschau ist das normal; in der veröffentlichten App bitte neu laden.`,
      );
      return (await navigator.serviceWorker.getRegistration()) ?? null;
    }
    const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    // Auf Aktivierung warten, damit Push-Abfragen direkt danach funktionieren.
    await navigator.serviceWorker.ready.catch(() => undefined);
    console.info("[pwa] Service Worker registriert:", reg.scope);
    return reg;
  } catch (e) {
    console.error("[pwa] Service Worker konnte nicht registriert werden:", e);
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  }
}

/** Beim Abmelden alle App-Caches leeren, damit keine fremden Daten liegen bleiben. */
export async function clearAppCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.allSettled(keys.filter((k) => k === "html" || k === "assets").map((k) => caches.delete(k)));
}
