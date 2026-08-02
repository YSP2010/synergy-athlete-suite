/* global self, clients */
/**
 * Push-Handler des Service Workers. Wird vom generierten Worker importiert.
 * Enthält bewusst keine Caching-Logik.
 */
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: "Hybrid Athlete", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Hybrid Athlete";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      tag: payload.tag || "hybrid-athlete",
      data: { url: payload.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
