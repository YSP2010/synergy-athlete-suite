/**
 * Erinnerungs-Engine (server-only). Wird vom Cron-Endpunkt aufgerufen und
 * entscheidet je Nutzer anhand lokaler Tageszeit, geplanter Einheiten und
 * Check-in-Verhalten, welche Push-Erinnerung fällig ist. Nutzt das vorhandene
 * sendPush und die Themen-Schalter der Abos; ein Log verhindert Mehrfachversand.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPush, type PushPayload } from "@/lib/push.server";

/** Fallback, solange die Zeitzone eines Nutzers noch nicht erfasst wurde. */
const DEFAULT_TZ = "Europe/Berlin";
const CHECKIN_HOUR = 20; // ab wann abends an den Check-in erinnern
const MORNING_HOUR = 8; // ab wann morgens an Einheiten/Spieltag erinnern

type ReminderKind = "checkin" | "plan" | "matchday";

interface Sub {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  topic_checkin: boolean;
  topic_plan: boolean;
  topic_matchday: boolean;
}

export interface SweepResult {
  users: number;
  reminders: number;
  sent: number;
  removed: number;
}

export async function runReminderSweep(now = new Date()): Promise<SweepResult> {
  const result: SweepResult = { users: 0, reminders: 0, sent: 0, removed: 0 };

  // Alle Abos laden und je Nutzer gruppieren.
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth, topic_checkin, topic_plan, topic_matchday");
  if (error) throw error;
  if (!subs?.length) return result;

  const byUser = new Map<string, Sub[]>();
  for (const s of subs as Sub[]) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }
  const userIds = [...byUser.keys()];
  result.users = userIds.length;

  // Profile (Zeitzone + Ruhezeiten). "*" statt Spaltennamen, weil die neuen
  // Felder evtl. noch nicht in den generierten Typen stehen.
  const { data: profiles } = await supabaseAdmin.from("profiles").select("*").in("id", userIds);
  const profById = new Map(
    (profiles ?? []).map((p) => {
      const x = p as unknown as {
        id: string;
        timezone: string | null;
        reminder_quiet_start: number | null;
        reminder_quiet_end: number | null;
      };
      return [x.id, x] as const;
    }),
  );

  for (const userId of userIds) {
    const userSubs = byUser.get(userId)!;
    const prof = profById.get(userId);
    const tz = prof?.timezone || DEFAULT_TZ;
    const quietStart = prof?.reminder_quiet_start ?? 22;
    const quietEnd = prof?.reminder_quiet_end ?? 7;

    const { date: today, hour } = localParts(tz, now);
    if (isQuiet(hour, quietStart, quietEnd)) continue;

    const due: { kind: ReminderKind; payload: PushPayload }[] = [];

    // 1) Check-in (abends, wenn heute noch kein Eintrag)
    if (hour >= CHECKIN_HOUR && userSubs.some((s) => s.topic_checkin)) {
      const { data: stat } = await supabaseAdmin
        .from("daily_stats")
        .select("id")
        .eq("user_id", userId)
        .eq("date", today)
        .maybeSingle();
      if (!stat) {
        due.push({
          kind: "checkin",
          payload: {
            title: "Check-in nicht vergessen",
            body: "Wie war dein Tag? Trag Schlaf, Soreness & Stimmung ein.",
            url: "/checkin",
            tag: "checkin",
          },
        });
      }
    }

    // 2) Spieltag bzw. geplante Einheit (morgens). Spieltag hat Vorrang.
    if (hour >= MORNING_HOUR) {
      const [matches, gyms, sports] = await Promise.all([
        supabaseAdmin
          .from("workouts_sport")
          .select("id")
          .eq("user_id", userId)
          .eq("date", today)
          .eq("kind", "match")
          .eq("status", "planned"),
        supabaseAdmin
          .from("workouts_gym")
          .select("id")
          .eq("user_id", userId)
          .eq("date", today)
          .eq("status", "planned"),
        supabaseAdmin
          .from("workouts_sport")
          .select("id")
          .eq("user_id", userId)
          .eq("date", today)
          .eq("status", "planned"),
      ]);

      if (matches.data?.length && userSubs.some((s) => s.topic_matchday)) {
        due.push({
          kind: "matchday",
          payload: {
            title: "Spieltag heute ⚽",
            body: "Denk an Ernährung, Flüssigkeit und Anpfiff-Vorbereitung.",
            url: "/matchday",
            tag: "matchday",
          },
        });
      } else if (
        (gyms.data?.length || sports.data?.length) &&
        userSubs.some((s) => s.topic_plan)
      ) {
        due.push({
          kind: "plan",
          payload: {
            title: "Training heute geplant",
            body: "Du hast heute eine Einheit auf dem Plan. Los geht's! 💪",
            url: "/dashboard",
            tag: "plan",
          },
        });
      }
    }

    // Versand mit Dedup je (Nutzer, Art, Tag).
    for (const { kind, payload } of due) {
      const claimed = await claim(userId, kind, today);
      if (!claimed) continue; // heute bereits gesendet
      result.reminders += 1;

      const topicField =
        kind === "checkin" ? "topic_checkin" : kind === "plan" ? "topic_plan" : "topic_matchday";
      const targets = userSubs.filter((s) => s[topicField]);
      for (const t of targets) {
        const res = await sendPush(t, payload);
        if (res.ok) result.sent += 1;
        if (res.gone) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", t.endpoint);
          result.removed += 1;
        }
      }
    }
  }

  return result;
}

/** Reserviert eine Erinnerung; false, wenn heute bereits gesendet wurde. */
async function claim(userId: string, kind: ReminderKind, forDate: string): Promise<boolean> {
  // notification_log ist evtl. noch nicht in den generierten Typen enthalten.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from("notification_log")
    .insert({ user_id: userId, kind, for_date: forDate });
  if (!error) return true;
  if (error.code === "23505") return false; // unique_violation → schon vorhanden
  console.error("[reminders] log insert failed", error);
  return false;
}

/** Lokales Datum (YYYY-MM-DD) und Stunde (0–23) in der Zeitzone des Nutzers. */
function localParts(tz: string, now: Date): { date: string; hour: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    let hour = parseInt(get("hour"), 10);
    if (!Number.isFinite(hour) || hour === 24) hour = 0;
    return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
  } catch {
    return { date: now.toISOString().slice(0, 10), hour: now.getUTCHours() };
  }
}

/** Ruhezeit-Fenster, das über Mitternacht laufen kann (z. B. 22 → 7). */
function isQuiet(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}
