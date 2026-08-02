/**
 * Jugendschutz (Etappe E, DSGVO Art. 8).
 * Unter 16 Jahren brauchen öffentliche Funktionen (Bestenliste, Teilen von
 * Gesundheitsdaten) die Einwilligung einer erziehungsberechtigten Person.
 */
export const GUARDIAN_CONSENT_KIND = "guardian_consent";
export const MIN_AGE_PUBLIC = 16;

/** Alter in Jahren aus einem Geburtsdatum (null, wenn unbekannt). */
export function ageYears(birthDate: string | null | undefined, now = new Date()): number | null {
  if (!birthDate) return null;
  const b = new Date(`${birthDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(b.getTime())) return null;
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < b.getUTCMonth() ||
    (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** true, wenn die Person jünger als 16 ist. Unbekanntes Alter gilt als volljährig. */
export function isMinor(birthDate: string | null | undefined, now = new Date()): boolean {
  const a = ageYears(birthDate, now);
  return a !== null && a < MIN_AGE_PUBLIC;
}

/**
 * Dürfen öffentliche Funktionen genutzt werden?
 * Minderjährige nur mit gültiger Einwilligung der Erziehungsberechtigten.
 */
export function mayUsePublicFeatures(
  birthDate: string | null | undefined,
  guardianGranted: boolean,
  now = new Date(),
): boolean {
  return !isMinor(birthDate, now) || guardianGranted;
}

export function youthBlockReason(birthDate: string | null | undefined): string {
  const a = ageYears(birthDate);
  if (a === null) return "Bitte hinterlege dein Geburtsdatum in den Einstellungen.";
  return `Du bist ${a} Jahre alt. Für öffentliche Ranglisten und das Teilen von Gesundheitsdaten brauchen wir die Einwilligung deiner Eltern oder Erziehungsberechtigten.`;
}
