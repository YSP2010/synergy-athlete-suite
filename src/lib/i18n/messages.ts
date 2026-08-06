export type Locale = "de" | "en" | "uk";

/**
 * Nachrichten-Katalog. Flache, punktierte Schlüssel. Fehlt ein Schlüssel in
 * einer Sprache, fällt t() automatisch auf Deutsch und dann auf den Schlüssel
 * selbst zurück. Neue Screens ergänzen hier einfach ihre Schlüssel.
 */
export const messages: Record<Locale, Record<string, string>> = {
  de: {
    "language.title": "Sprache",
    "language.desc": "Sprache der App wählen. Wird auf diesem Gerät gespeichert.",
  },
  en: {
    "language.title": "Language",
    "language.desc": "Choose the app language. Saved on this device.",
  },
  uk: {
    "language.title": "Мова",
    "language.desc": "Оберіть мову застосунку. Зберігається на цьому пристрої.",
  },
};
