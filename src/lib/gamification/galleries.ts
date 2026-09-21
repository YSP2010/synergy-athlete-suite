// Vorgenerierte Galerien fuer die Modi "Bibliothek" (DiceBear) und
// "Illustriert" (KI-illustrierte Presets). Die Assets liegen unter
// public/avatars/... und werden per absoluter URL referenziert – keine
// Laufzeit-Abhaengigkeit noetig.

export interface GalleryItem {
  id: string;
  label: string;
  url: string;
}

const DB_STYLES: [string, string][] = [
  ["avataaars", "Avataaars"],
  ["adventurer", "Adventurer"],
  ["openpeeps", "Open Peeps"],
  ["personas", "Personas"],
  ["micah", "Micah"],
  ["notionists", "Notionists"],
];

export const DICEBEAR_GALLERY: GalleryItem[] = DB_STYLES.flatMap(([k, label]) =>
  [1, 2, 3, 4].map((n) => ({ id: `${k}-${n}`, label, url: `/avatars/dicebear/${k}-${n}.svg` })),
);

export const ILLUSTRATED_GALLERY: GalleryItem[] = [
  { id: "athlete-red", label: "Athlet", url: "/avatars/illustrated/athlete-red.webp" },
  { id: "runner-blue", label: "Läuferin", url: "/avatars/illustrated/runner-blue.webp" },
];

export function dicebearUrl(id: string): string {
  return (DICEBEAR_GALLERY.find((x) => x.id === id) ?? DICEBEAR_GALLERY[0]).url;
}
export function presetUrl(id: string): string {
  return (ILLUSTRATED_GALLERY.find((x) => x.id === id) ?? ILLUSTRATED_GALLERY[0])?.url ?? "";
}
