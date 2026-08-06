import { createFileRoute } from "@tanstack/react-router";

/**
 * Geschützter Cron-Endpunkt. Wird von pg_cron/pg_net (oder einem externen
 * Zeitplaner) per POST mit dem Header `x-cron-secret` aufgerufen. Kein
 * Nutzer-Login – nur der Secret-Abgleich. Die Engine wird dynamisch
 * importiert, damit kein Server-Code in den Client-Bundle gerät.
 */
export const Route = createFileRoute("/api/cron/reminders")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const secret = process.env["CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret");
        if (!secret || provided !== secret) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        try {
          const { runReminderSweep } = await import("@/lib/reminders.server");
          const result = await runReminderSweep();
          return new Response(JSON.stringify({ ok: true, ...result }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        } catch (e) {
          console.error("[reminders] sweep failed", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message.slice(0, 300) }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
