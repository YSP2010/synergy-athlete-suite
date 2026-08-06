import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Schreibt die Browser-Zeitzone einmalig ins Profil, damit die Erinnerungs-Engine
 * serverseitig die richtige lokale Uhrzeit je Nutzer kennt. Läuft still im
 * Hintergrund; Fehler werden bewusst geschluckt (kein UI-Blocker).
 * `timezone` ist noch nicht in den generierten Supabase-Typen -> lokaler Cast.
 */
export function TimezoneSync() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (typeof Intl === "undefined") return;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!tz) return;

        const { data: u } = await supabase.auth.getUser();
        if (cancelled || !u.user) return;

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.user.id)
          .maybeSingle();
        const current = (data as unknown as { timezone?: string | null } | null)?.timezone ?? null;
        if (cancelled || current === tz) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("profiles") as any).update({ timezone: tz }).eq("id", u.user.id);
      } catch {
        // Zeitzone ist ein Komfort-Feature – Fehler bewusst ignorieren.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
