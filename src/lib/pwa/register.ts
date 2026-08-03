/**
 * Registrierung des Service Workers – der einzige Ort, an dem das passiert.
 * Es gibt keine Vorschau-Sperre mehr: überall dort, wo der Browser einen
 * sicheren Kontext (HTTPS oder localhost) bietet, wird registriert.
 * Nur `?sw=off` hebt die Registrierung bewusst wieder auf (Notausstieg).
 */
const SW_URL = "/sw.js";
const SW_READY_TIMEOUT_MS = 8000;

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
    const reg = await navigator.serviceWorker.register(SW_URL, {
      scope: "/",
      updateViaCache: "none",
    });
    // Die Aktivierung wird beim jeweiligen Push-Vorgang mit einem festen Timeout
    // abgewartet. Hier darf `ready` die Oberfläche nicht unbegrenzt blockieren.
    console.info("[pwa] Service Worker registriert:", reg.scope);
    return reg;
  } catch (e) {
    console.error("[pwa] Service Worker konnte nicht registriert werden:", e);
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  }
}

function waitForActivation(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerRegistration> {
  if (registration.active?.state === "activated") return Promise.resolve(registration);

  return new Promise((resolve, reject) => {
    let worker = registration.installing ?? registration.waiting;
    const timeoutId = window.setTimeout(() => {
      cleanup();
      const state = worker?.state ?? "kein Worker vorhanden";
      reject(
        new Error(
          `Der Service Worker konnte nicht aktiviert werden (Status: ${state}). Bitte prüfe, ob /sw.js in der veröffentlichten App erreichbar ist.`,
        ),
      );
    }, SW_READY_TIMEOUT_MS);

    const onStateChange = () => {
      if (worker?.state === "activated" || registration.active?.state === "activated") {
        cleanup();
        resolve(registration);
      } else if (worker?.state === "redundant") {
        cleanup();
        reject(new Error("Die Service-Worker-Installation wurde vom Browser verworfen."));
      }
    };
    const onUpdateFound = () => {
      worker?.removeEventListener("statechange", onStateChange);
      worker = registration.installing ?? registration.waiting;
      worker?.addEventListener("statechange", onStateChange);
      onStateChange();
    };
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      worker?.removeEventListener("statechange", onStateChange);
      registration.removeEventListener("updatefound", onUpdateFound);
    };

    worker?.addEventListener("statechange", onStateChange);
    registration.addEventListener("updatefound", onUpdateFound);
    onStateChange();
  });
}

/** Liefert eine tatsächlich aktive Registrierung, auch wenn Android `ready` verzögert. */
export async function getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const registration =
    (await navigator.serviceWorker.getRegistration("/")) ?? (await registerServiceWorker());
  if (!registration) {
    throw new Error(
      "Der Service Worker konnte nicht registriert werden. Öffne die veröffentlichte App über HTTPS und lade sie neu.",
    );
  }
  if (registration.active?.state === "activated") return registration;

  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      waitForActivation(registration),
    ]);
  } catch (error) {
    console.error("[pwa] Service Worker nicht bereit:", {
      error,
      scope: registration.scope,
      active: registration.active?.state ?? null,
      installing: registration.installing?.state ?? null,
      waiting: registration.waiting?.state ?? null,
    });
    throw error;
  }
}

/** Beim Abmelden alle App-Caches leeren, damit keine fremden Daten liegen bleiben. */
export async function clearAppCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.allSettled(keys.filter((k) => k === "html" || k === "assets").map((k) => caches.delete(k)));
}
