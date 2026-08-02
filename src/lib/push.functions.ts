// Server-Funktionen für Push-Benachrichtigungen (Etappe C).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Öffentlicher VAPID-Schlüssel für die Anmeldung im Browser. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env["VAPID_PUBLIC_KEY"] ?? null };
});

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(500),
  auth: z.string().min(5).max(500),
  userAgent: z.string().max(300).optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      console.error("[push] subscribe failed", error);
      throw new Error("Die Benachrichtigungen konnten nicht aktiviert werden.");
    }
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string().max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: subs } = await context.supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", context.userId);
    if (!subs?.length) return { ok: false, sent: 0 };

    const { sendPush } = await import("@/lib/push.server");
    let sent = 0;
    for (const s of subs) {
      const res = await sendPush(s, {
        title: "Hybrid Athlete",
        body: "Benachrichtigungen sind aktiv. 💪",
        url: "/dashboard",
        tag: "test",
      });
      if (res.ok) sent += 1;
      if (res.gone) {
        await context.supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
    return { ok: sent > 0, sent };
  });
