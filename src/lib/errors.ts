// Zentrale Übersetzung technischer Fehler (Supabase/Postgres/Netzwerk)
// in verständliche deutsche Meldungen für Toasts.

export function humanError(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "Unbekannter Fehler";
  const m = raw.toLowerCase();

  if (m.includes("permission denied") || m.includes("violates row-level security"))
    return "Keine Berechtigung für diese Aktion.";
  if (m.includes("jwt") || m.includes("token") || m.includes("not authenticated"))
    return "Sitzung abgelaufen – bitte neu einloggen.";
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
