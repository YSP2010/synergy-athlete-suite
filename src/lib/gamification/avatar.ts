// Avatar-Baukasten: Datenmodell + Options-Kataloge.
// Gespeichert als JSONB in profiles.avatar. Drei Modi: custom | dicebear | illustrated.

import type { Locale } from "@/lib/i18n/messages";

export type AvatarMode = "custom" | "dicebear" | "illustrated";

export interface AvatarConfig {
  mode: AvatarMode;
  // mode = custom
  face: string;
  skin: string;
  hair: string;
  hairColor: string;
  eyeColor: string;
  glasses: string;
  beard: string;
  freckles: string;
  jersey: string;
  jerseyColor: string;
  accessory: string;
  // mode = dicebear
  dicebearId: string;
  // mode = illustrated
  presetId: string;
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

export const FACE_SHAPES: StyleOption[] = [
  { key: "oval", label: { de: "Oval", en: "Oval", uk: "Овальне" } },
  { key: "round", label: { de: "Rund", en: "Round", uk: "Кругле" } },
  { key: "square", label: { de: "Eckig", en: "Square", uk: "Квадратне" } },
  { key: "heart", label: { de: "Herz", en: "Heart", uk: "Серцеподібне" } },
  { key: "long", label: { de: "Lang", en: "Long", uk: "Довге" } },
];

export const SKIN_TONES: ColorOption[] = [
  { key: "light", label: { de: "Hell", en: "Light", uk: "Світла" }, hex: "#ffd9bd" },
  { key: "fair", label: { de: "Mittel-hell", en: "Fair", uk: "Світло-бежева" }, hex: "#f0bd93" },
  { key: "tan", label: { de: "Gebräunt", en: "Tan", uk: "Засмагла" }, hex: "#d59a63" },
  { key: "brown", label: { de: "Braun", en: "Brown", uk: "Коричнева" }, hex: "#a86f3c" },
  { key: "deep", label: { de: "Dunkel", en: "Deep", uk: "Темна" }, hex: "#6d431f" },
];

export const HAIR_COLORS: ColorOption[] = [
  { key: "black", label: { de: "Schwarz", en: "Black", uk: "Чорне" }, hex: "#2a2a30" },
  { key: "brown", label: { de: "Braun", en: "Brown", uk: "Каштанове" }, hex: "#54331d" },
  { key: "blonde", label: { de: "Blond", en: "Blonde", uk: "Блонд" }, hex: "#dcae52" },
  { key: "red", label: { de: "Rot", en: "Red", uk: "Руде" }, hex: "#b34a24" },
  { key: "gray", label: { de: "Grau", en: "Gray", uk: "Сиве" }, hex: "#a6acb4" },
  { key: "white", label: { de: "Weiß", en: "White", uk: "Біле" }, hex: "#e9ecef" },
];

export const EYE_COLORS: ColorOption[] = [
  { key: "brown", label: { de: "Braun", en: "Brown", uk: "Карі" }, hex: "#6f4526" },
  { key: "blue", label: { de: "Blau", en: "Blue", uk: "Блакитні" }, hex: "#3b7fd4" },
  { key: "green", label: { de: "Grün", en: "Green", uk: "Зелені" }, hex: "#3f9d6a" },
  { key: "gray", label: { de: "Grau", en: "Gray", uk: "Сірі" }, hex: "#7f8a97" },
  { key: "amber", label: { de: "Bernstein", en: "Amber", uk: "Бурштинові" }, hex: "#c07a1e" },
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

export const GLASSES: StyleOption[] = [
  { key: "none", label: { de: "Keine", en: "None", uk: "Немає" } },
  { key: "round", label: { de: "Rund", en: "Round", uk: "Круглі" } },
  { key: "square", label: { de: "Eckig", en: "Square", uk: "Квадратні" } },
];

export const BEARDS: StyleOption[] = [
  { key: "none", label: { de: "Keiner", en: "None", uk: "Немає" } },
  { key: "stubble", label: { de: "Stoppeln", en: "Stubble", uk: "Щетина" } },
  { key: "goatee", label: { de: "Kinnbart", en: "Goatee", uk: "Еспаньйолка" } },
  { key: "full", label: { de: "Vollbart", en: "Full", uk: "Повна борода" } },
];

export const FRECKLES: StyleOption[] = [
  { key: "off", label: { de: "Aus", en: "Off", uk: "Вимк." } },
  { key: "on", label: { de: "An", en: "On", uk: "Увімк." } },
];

export const ACCESSORIES: StyleOption[] = [
  { key: "none", label: { de: "Keine", en: "None", uk: "Немає" } },
  { key: "headband", label: { de: "Stirnband", en: "Headband", uk: "Пов’язка" } },
  { key: "armband", label: { de: "Kapitänsbinde", en: "Armband", uk: "Пов’язка капітана" } },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  mode: "custom",
  face: "oval",
  skin: "fair",
  hair: "short",
  hairColor: "brown",
  eyeColor: "brown",
  glasses: "none",
  beard: "none",
  freckles: "off",
  jersey: "solid",
  jerseyColor: "red",
  accessory: "none",
  dicebearId: "avataaars-1",
  presetId: "athlete-red",
};

function pick(list: { key: string }[], key: unknown, fallback: string): string {
  return list.some((o) => o.key === key) ? (key as string) : fallback;
}
function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/** Robust gegen leere/teilweise/fehlerhafte JSONB-Werte aus der DB. */
export function sanitizeAvatar(raw: unknown): AvatarConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const mode = (["custom", "dicebear", "illustrated"] as const).includes(r.mode as AvatarMode)
    ? (r.mode as AvatarMode)
    : "custom";
  return {
    mode,
    face: pick(FACE_SHAPES, r.face, DEFAULT_AVATAR.face),
    skin: pick(SKIN_TONES, r.skin, DEFAULT_AVATAR.skin),
    hair: pick(HAIR_STYLES, r.hair, DEFAULT_AVATAR.hair),
    hairColor: pick(HAIR_COLORS, r.hairColor, DEFAULT_AVATAR.hairColor),
    eyeColor: pick(EYE_COLORS, r.eyeColor, DEFAULT_AVATAR.eyeColor),
    glasses: pick(GLASSES, r.glasses, DEFAULT_AVATAR.glasses),
    beard: pick(BEARDS, r.beard, DEFAULT_AVATAR.beard),
    freckles: pick(FRECKLES, r.freckles, DEFAULT_AVATAR.freckles),
    jersey: pick(JERSEY_STYLES, r.jersey, DEFAULT_AVATAR.jersey),
    jerseyColor: pick(JERSEY_COLORS, r.jerseyColor, DEFAULT_AVATAR.jerseyColor),
    accessory: pick(ACCESSORIES, r.accessory, DEFAULT_AVATAR.accessory),
    dicebearId: str(r.dicebearId, DEFAULT_AVATAR.dicebearId),
    presetId: str(r.presetId, DEFAULT_AVATAR.presetId),
  };
}

export function colorHex(list: ColorOption[], key: string): string {
  return list.find((o) => o.key === key)?.hex ?? list[0].hex;
}
