import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { messages, type Locale } from "./messages";

export type { Locale };
export const LOCALES: Locale[] = ["de", "en", "uk"];
/** Anzeigenamen als Autonyme – bewusst in jeder Sprache gleich. */
export const LOCALE_NAMES: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  uk: "Українська",
};

const DEFAULT_LOCALE: Locale = "de";
const STORAGE_KEY = "hap.locale";

function isLocale(v: unknown): v is Locale {
  return v === "de" || v === "en" || v === "uk";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server und erster Client-Render nutzen den Default -> kein Hydration-Mismatch.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Nach dem Mount gespeicherte bzw. Browser-Sprache übernehmen.
  useEffect(() => {
    let initial: Locale = DEFAULT_LOCALE;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored)) {
        initial = stored;
      } else {
        const nav = (navigator.language || "").slice(0, 2).toLowerCase();
        if (isLocale(nav)) initial = nav;
      }
    } catch {
      /* localStorage kann blockiert sein – dann Default */
    }
    setLocaleState(initial);
  }, []);

  // <html lang> synchron halten.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignorieren */
    }
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    const table = messages[locale] ?? messages[DEFAULT_LOCALE];
    let str = table[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  };

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n muss innerhalb von <LanguageProvider> genutzt werden.");
  return ctx;
}

/** Kurzform, wenn nur die Übersetzungsfunktion gebraucht wird. */
export function useT() {
  return useI18n().t;
}
