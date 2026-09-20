// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    // Die Backend-Zugangsdaten (öffentlicher Schlüssel + URL) werden beim Build
    // fest eingesetzt. Ohne das blieb die veröffentlichte App leer bzw. zeigte
    // "Etwas ist schiefgelaufen", weil im Client-Bundle keine Werte ankamen.
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL ||
          process.env.SUPABASE_URL ||
          "https://jqrrxuezrkdypwoudxuz.supabase.co",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxcnJ4dWV6cmtkeXB3b3VkeHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjg4MjgsImV4cCI6MjA5ODY0NDgyOH0.cjLpPX_CnjJgWCv8eJcJ6YkIeBI3b0kmLUfd8ImZ5Eg",
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        process.env.VITE_SUPABASE_PROJECT_ID ||
          process.env.SUPABASE_PROJECT_ID ||
          "jqrrxuezrkdypwoudxuz",
      ),
    },
    plugins: [
      mcpPlugin(),
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        // Registrierung erfolgt ausschließlich über src/lib/pwa/register.ts.
        injectRegister: null,
        devOptions: { enabled: false },
        filename: "sw.js",
        manifest: {
          name: "Hybrid Athlete Performance Planner",
          short_name: "Hybrid Athlete",
          description:
            "Training, Erholung und Ernährung für Fußball und Kraftraum an einem Ort planen.",
          lang: "de",
          start_url: "/dashboard",
          scope: "/",
          display: "standalone",
          background_color: "#0e0f11",
          theme_color: "#0e0f11",
          icons: [
            { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/pwa-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // Push-Handler liegen separat, damit der generierte Worker sie mitbringt.
          importScripts: ["/push-sw.js"],
          navigateFallback: null,
          globPatterns: ["**/*.{js,css,ico,png,svg,webp,woff2}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // Der Build legt die Client-Assets unter "client/…" ab, ausgeliefert
          // werden sie aber am Root. Ohne diese Korrektur zeigt das
          // Precache-Manifest auf "client/…"-Pfade, die alle 404 liefern – der
          // Service-Worker-Install bricht dann mit "bad-precaching-response"
          // ab und der Worker wird "redundant".
          modifyURLPrefix: { "client/": "" },
          // Bereits gehashte Dateien brauchen kein zusätzliches Cache-Busting.
          dontCacheBustURLsMatching: /-[A-Za-z0-9_]{8}\.(?:js|css)$/,
          runtimeCaching: [
            {
              // Seitenaufrufe immer zuerst aus dem Netz – niemals cache-first.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: { cacheName: "html", networkTimeoutSeconds: 4 },
            },
            {
              urlPattern: ({ url, request, sameOrigin }) =>
                !!sameOrigin &&
                !url.pathname.startsWith("/_serverFn") &&
                ["script", "style", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
