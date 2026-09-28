// Zentrale Übersetzung technischer Fehler (Supabase/Postgres/Netzwerk)
// in verständliche deutsche Meldungen für Toasts.

export function humanError(e: unknown): string {
  // Supabase/PostgREST liefern ein Fehler-OBJEKT ({ message, code, details })
  // – keine Error-Instanz. Daher auch aus Objekten die message ziehen, sonst
  // landet jeder DB-Fehler fälschlich im Fallback "Unbekannter Fehler".
  const raw =
    e instanceof Error
      ? e.message
      : typeof e === "string"
        ? e
        : e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string"
          ? (e as { message: string }).message
          : "Unbekannter Fehler";
  const m = raw.toLowerCase();

  if (m.includes("permission denied") || m.includes("violates row-level security"))
    return "Keine Berechtigung für diese Aktion.";
  if (m.includes("jwt") || m.includes("token") || m.includes("not authenticated"))
    return "Sitzung abgelaufen – bitte neu einloggen.";
  if (m.includes("schema cache") || m.includes("could not find the"))
    return "Die Datenbank ist noch nicht auf dem neuesten Stand (Spalte/Tabelle fehlt) – bitte die neueste Version veröffentlichen bzw. die Migration ausführen.";
  if (m.includes("duplicate key")) return "Dieser Eintrag existiert bereits.";
  if (m.includes("foreign key")) return "Aktion nicht möglich – verknüpfte Daten fehlen.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed"))
    return "Netzwerkfehler – bitte Verbindung prüfen und erneut versuchen.";
  if (m.includes("timeout")) return "Zeitüberschreitung – bitte erneut versuchen.";
  if (m.includes("invalid login credentials")) return "E-Mail oder Passwort ist falsch.";
  if (m.includes("email not confirmed")) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (m.includes("user already registered")) return "Für diese E-Mail existiert bereits ein Konto.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Zu viele Anfragen – bitte kurz warten.";

  // Server-Functions liefern bereits deutsche Meldungen (z. B. Tageslimits) → durchreichen.
  return raw;
}
