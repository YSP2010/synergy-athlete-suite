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

/** Liest die Erinnerungs-Präferenzen: Themen (aus den Abos) + Ruhezeiten (Profil). */
export const getReminderPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: subs }, { data: prof }] = await Promise.all([
      context.supabase
        .from("push_subscriptions")
        .select("topic_checkin, topic_plan, topic_matchday")
        .eq("user_id", context.userId),
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    const anyOn = (key: "topic_checkin" | "topic_plan" | "topic_matchday") =>
      (subs ?? []).some((s) => s[key]);
    const p = prof as unknown as {
      reminder_quiet_start?: number | null;
      reminder_quiet_end?: number | null;
    } | null;
    return {
      topic_checkin: subs?.length ? anyOn("topic_checkin") : true,
      topic_plan: subs?.length ? anyOn("topic_plan") : true,
      topic_matchday: subs?.length ? anyOn("topic_matchday") : true,
      quiet_start: p?.reminder_quiet_start ?? 22,
      quiet_end: p?.reminder_quiet_end ?? 7,
    };
  });

const prefsSchema = z.object({
  topic_checkin: z.boolean(),
  topic_plan: z.boolean(),
  topic_matchday: z.boolean(),
  quiet_start: z.number().int().min(0).max(23),
  quiet_end: z.number().int().min(0).max(23),
});

/** Speichert die Themen (kontoweit auf allen Geräten) und die Ruhezeiten (Profil). */
export const setReminderPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prefsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("push_subscriptions")
      .update({
        topic_checkin: data.topic_checkin,
        topic_plan: data.topic_plan,
        topic_matchday: data.topic_matchday,
      })
      .eq("user_id", context.userId);
    // Ruhezeiten am Profil – noch nicht in den generierten Typen.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (context.supabase.from("profiles") as any)
      .update({ reminder_quiet_start: data.quiet_start, reminder_quiet_end: data.quiet_end })
      .eq("id", context.userId);
    return { ok: true };
  });
