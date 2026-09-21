// Avatar-Baukasten: Datenmodell + Options-Kataloge.
// Die Konfiguration wird als JSONB in profiles.avatar gespeichert.

import type { Locale } from "@/lib/i18n/messages";

export interface AvatarConfig {
  skin: string;
  hair: string;
  hairColor: string;
  jersey: string;
  jerseyColor: string;
  accessory: string;
}

export interface ColorOption {
  key: string;
  label: Record<Locale, string>;
  hex: string;
}
export interface StyleOption {
  key: string;
  label: Record<Locale, string>;
}

export const SKIN_TONES: ColorOption[] = [
  { key: "light", label: { de: "Hell", en: "Light", uk: "Світла" }, hex: "#f2c9a0" },
  { key: "fair", label: { de: "Mittel-hell", en: "Fair", uk: "Світло-бежева" }, hex: "#e0b088" },
  { key: "tan", label: { de: "Gebräunt", en: "Tan", uk: "Засмагла" }, hex: "#c68642" },
  { key: "brown", label: { de: "Braun", en: "Brown", uk: "Коричнева" }, hex: "#8d5524" },
  { key: "deep", label: { de: "Dunkel", en: "Deep", uk: "Темна" }, hex: "#5c3a21" },
];

export const HAIR_COLORS: ColorOption[] = [
  { key: "black", label: { de: "Schwarz", en: "Black", uk: "Чорне" }, hex: "#2b2b2b" },
  { key: "brown", label: { de: "Braun", en: "Brown", uk: "Каштанове" }, hex: "#5a3821" },
  { key: "blonde", label: { de: "Blond", en: "Blonde", uk: "Блонд" }, hex: "#d8a94b" },
  { key: "red", label: { de: "Rot", en: "Red", uk: "Руде" }, hex: "#a83c1e" },
  { key: "gray", label: { de: "Grau", en: "Gray", uk: "Сиве" }, hex: "#9aa0a6" },
  { key: "white", label: { de: "Weiß", en: "White", uk: "Біле" }, hex: "#e8e8e8" },
];

export const JERSEY_COLORS: ColorOption[] = [
  { key: "red", label: { de: "Rot", en: "Red", uk: "Червоний" }, hex: "#e0384f" },
  { key: "blue", label: { de: "Blau", en: "Blue", uk: "Синій" }, hex: "#2f6fed" },
  { key: "green", label: { de: "Grün", en: "Green", uk: "Зелений" }, hex: "#22a06b" },
  { key: "black", label: { de: "Schwarz", en: "Black", uk: "Чорний" }, hex: "#2a2f3a" },
  { key: "white", label: { de: "Weiß", en: "White", uk: "Білий" }, hex: "#e9edf2" },
  { key: "yellow", label: { de: "Gelb", en: "Yellow", uk: "Жовтий" }, hex: "#f4c027" },
  { key: "purple", label: { de: "Lila", en: "Purple", uk: "Фіолетовий" }, hex: "#8b5cf6" },
  { key: "orange", label: { de: "Orange", en: "Orange", uk: "Помаранчевий" }, hex: "#f5822e" },
];

export const HAIR_STYLES: StyleOption[] = [
  { key: "none", label: { de: "Glatze", en: "None", uk: "Без волосся" } },
  { key: "buzz", label: { de: "Rasiert", en: "Buzz", uk: "Дуже коротке" } },
  { key: "short", label: { de: "Kurz", en: "Short", uk: "Коротке" } },
  { key: "medium", label: { de: "Mittel", en: "Medium", uk: "Середнє" } },
  { key: "long", label: { de: "Lang", en: "Long", uk: "Довге" } },
];

export const JERSEY_STYLES: StyleOption[] = [
  { key: "solid", label: { de: "Einfarbig", en: "Solid", uk: "Однотонна" } },
  { key: "stripes", label: { de: "Streifen", en: "Stripes", uk: "Смужки" } },
  { key: "hoops", label: { de: "Querstreifen", en: "Hoops", uk: "Горизонтальні" } },
  { key: "sash", label: { de: "Schärpe", en: "Sash", uk: "Стрічка" } },
];

export const ACCESSORIES: StyleOption[] = [
  { key: "none", label: { de: "Keine", en: "None", uk: "Немає" } },
  { key: "headband", label: { de: "Stirnband", en: "Headband", uk: "Пов’язка" } },
  { key: "cap", label: { de: "Cap", en: "Cap", uk: "Кепка" } },
  { key: "armband", label: { de: "Kapitänsbinde", en: "Armband", uk: "Пов’язка капітана" } },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "fair",
  hair: "short",
  hairColor: "brown",
  jersey: "solid",
  jerseyColor: "red",
  accessory: "none",
};

function pick(list: { key: string }[], key: unknown, fallback: string): string {
  return list.some((o) => o.key === key) ? (key as string) : fallback;
}

/** Robust gegen leere/teilweise/fehlerhafte JSONB-Werte aus der DB. */
export function sanitizeAvatar(raw: unknown): AvatarConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    skin: pick(SKIN_TONES, r.skin, DEFAULT_AVATAR.skin),
    hair: pick(HAIR_STYLES, r.hair, DEFAULT_AVATAR.hair),
    hairColor: pick(HAIR_COLORS, r.hairColor, DEFAULT_AVATAR.hairColor),
    jersey: pick(JERSEY_STYLES, r.jersey, DEFAULT_AVATAR.jersey),
    jerseyColor: pick(JERSEY_COLORS, r.jerseyColor, DEFAULT_AVATAR.jerseyColor),
    accessory: pick(ACCESSORIES, r.accessory, DEFAULT_AVATAR.accessory),
  };
}

export function colorHex(list: ColorOption[], key: string): string {
  return list.find((o) => o.key === key)?.hex ?? list[0].hex;
}
