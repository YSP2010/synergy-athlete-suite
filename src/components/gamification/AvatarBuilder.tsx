import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n, type Locale } from "@/lib/i18n";
import { AvatarFigure } from "./AvatarFigure";
import {
  type AvatarConfig,
  type AvatarMode,
  type ColorOption,
  type StyleOption,
  FACE_SHAPES,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  EYE_COLORS,
  GLASSES,
  BEARDS,
  FRECKLES,
  JERSEY_STYLES,
  JERSEY_COLORS,
  ACCESSORIES,
} from "@/lib/gamification/avatar";
import {
  type GalleryItem,
  DICEBEAR_GALLERY,
  ILLUSTRATED_GALLERY,
  dicebearUrl,
  presetUrl,
} from "@/lib/gamification/galleries";

type Strings = {
  title: string;
  tabCustom: string;
  tabLibrary: string;
  tabIllustrated: string;
  libraryHint: string;
  illustratedHint: string;
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
  save: string;
  cancel: string;
  saved: string;
  error: string;
};

const GROUP: Record<Locale, Strings> = {
  de: {
    title: "Avatar anpassen",
    tabCustom: "Baukasten",
    tabLibrary: "Bibliothek",
    tabIllustrated: "Illustriert",
    libraryHint: "Fertige Avatar-Stile zum Auswählen.",
    illustratedHint: "Illustrierte Charaktere zum Auswählen.",
    face: "Gesichtsform",
    skin: "Hautton",
    hair: "Frisur",
    hairColor: "Haarfarbe",
    eyeColor: "Augenfarbe",
    glasses: "Brille",
    beard: "Bart",
    freckles: "Sommersprossen",
    jersey: "Trikot",
    jerseyColor: "Trikotfarbe",
    accessory: "Accessoire",
    save: "Speichern",
    cancel: "Abbrechen",
    saved: "Avatar gespeichert",
    error: "Konnte nicht speichern",
  },
  en: {
    title: "Customize avatar",
    tabCustom: "Builder",
    tabLibrary: "Library",
    tabIllustrated: "Illustrated",
    libraryHint: "Ready-made avatar styles to pick from.",
    illustratedHint: "Illustrated characters to pick from.",
    face: "Face shape",
    skin: "Skin tone",
    hair: "Hair",
    hairColor: "Hair color",
    eyeColor: "Eye color",
    glasses: "Glasses",
    beard: "Beard",
    freckles: "Freckles",
    jersey: "Jersey",
    jerseyColor: "Jersey color",
    accessory: "Accessory",
    save: "Save",
    cancel: "Cancel",
    saved: "Avatar saved",
    error: "Could not save",
  },
  uk: {
    title: "Налаштувати аватар",
    tabCustom: "Конструктор",
    tabLibrary: "Бібліотека",
    tabIllustrated: "Ілюстрований",
    libraryHint: "Готові стилі аватарів на вибір.",
    illustratedHint: "Ілюстровані персонажі на вибір.",
    face: "Форма обличчя",
    skin: "Тон шкіри",
    hair: "Зачіска",
    hairColor: "Колір волосся",
    eyeColor: "Колір очей",
    glasses: "Окуляри",
    beard: "Борода",
    freckles: "Веснянки",
    jersey: "Форма",
    jerseyColor: "Колір форми",
    accessory: "Аксесуар",
    save: "Зберегти",
    cancel: "Скасувати",
    saved: "Аватар збережено",
    error: "Не вдалося зберегти",
  },
};

type ProfileUpdater = {
  update: (v: Record<string, unknown>) => {
    eq: (col: string, val: string) => Promise<{ error: unknown }>;
  };
};

function ColorRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ColorOption[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-label={o.key}
            className={cn(
              "h-8 w-8 rounded-full border-2 transition",
              value === o.key ? "border-foreground" : "border-transparent",
            )}
            style={{ background: o.hex }}
          />
        ))}
      </div>
    </div>
  );
}

function StyleRow({
  label,
  options,
  value,
  onChange,
  locale,
}: {
  label: string;
  options: StyleOption[];
  value: string;
  onChange: (k: string) => void;
  locale: Locale;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition",
              value === o.key ? "border-neon font-semibold" : "border-border",
            )}
          >
            {o.label[locale] ?? o.label.de}
          </button>
        ))}
      </div>
    </div>
  );
}

function Gallery({
  items,
  value,
  onPick,
}: {
  items: GalleryItem[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onPick(it.id)}
          title={it.label}
          className={cn(
            "aspect-square overflow-hidden rounded-xl border-2 bg-[var(--elevated)] transition",
            value === it.id ? "border-neon" : "border-transparent",
          )}
        >
          <img src={it.url} alt={it.label} className="h-full w-full object-cover" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

export function AvatarBuilder({
  initial,
  userId,
  onSaved,
  onCancel,
}: {
  initial: AvatarConfig;
  userId: string;
  onSaved: (c: AvatarConfig) => void;
  onCancel?: () => void;
}) {
  const { locale } = useI18n();
  const g = GROUP[locale] ?? GROUP.de;
  const [cfg, setCfg] = useState<AvatarConfig>(initial);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<AvatarConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const setMode = (m: AvatarMode) => setCfg((c) => ({ ...c, mode: m }));

  async function save() {
    setSaving(true);
    const { error } = await (supabase.from("profiles") as unknown as ProfileUpdater)
      .update({ avatar: cfg })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error(g.error);
      return;
    }
    toast.success(g.saved);
    onSaved(cfg);
  }

  const tabs: { key: AvatarMode; label: string }[] = [
    { key: "custom", label: g.tabCustom },
    { key: "dicebear", label: g.tabLibrary },
    { key: "illustrated", label: g.tabIllustrated },
  ];

  const previewUrl =
    cfg.mode === "dicebear"
      ? dicebearUrl(cfg.dicebearId)
      : cfg.mode === "illustrated"
        ? presetUrl(cfg.presetId)
        : "";

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <div
          className="overflow-hidden rounded-full bg-[var(--elevated)]"
          style={{ width: 96, height: 96 }}
        >
          {cfg.mode === "custom" ? (
            <AvatarFigure config={cfg} size={96} />
          ) : (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="font-display text-lg font-bold">{g.title}</div>
      </div>

      <div className="flex gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setMode(tb.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition",
              cfg.mode === tb.key ? "border-neon bg-neon/10 font-semibold" : "border-border",
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {cfg.mode === "custom" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StyleRow
            label={g.face}
            options={FACE_SHAPES}
            value={cfg.face}
            onChange={(k) => set({ face: k })}
            locale={locale}
          />
          <ColorRow
            label={g.skin}
            options={SKIN_TONES}
            value={cfg.skin}
            onChange={(k) => set({ skin: k })}
          />
          <StyleRow
            label={g.hair}
            options={HAIR_STYLES}
            value={cfg.hair}
            onChange={(k) => set({ hair: k })}
            locale={locale}
          />
          <ColorRow
            label={g.hairColor}
            options={HAIR_COLORS}
            value={cfg.hairColor}
            onChange={(k) => set({ hairColor: k })}
          />
          <ColorRow
            label={g.eyeColor}
            options={EYE_COLORS}
            value={cfg.eyeColor}
            onChange={(k) => set({ eyeColor: k })}
          />
          <StyleRow
            label={g.glasses}
            options={GLASSES}
            value={cfg.glasses}
            onChange={(k) => set({ glasses: k })}
            locale={locale}
          />
          <StyleRow
            label={g.beard}
            options={BEARDS}
            value={cfg.beard}
            onChange={(k) => set({ beard: k })}
            locale={locale}
          />
          <StyleRow
            label={g.freckles}
            options={FRECKLES}
            value={cfg.freckles}
            onChange={(k) => set({ freckles: k })}
            locale={locale}
          />
          <StyleRow
            label={g.jersey}
            options={JERSEY_STYLES}
            value={cfg.jersey}
            onChange={(k) => set({ jersey: k })}
            locale={locale}
          />
          <ColorRow
            label={g.jerseyColor}
            options={JERSEY_COLORS}
            value={cfg.jerseyColor}
            onChange={(k) => set({ jerseyColor: k })}
          />
          <StyleRow
            label={g.accessory}
            options={ACCESSORIES}
            value={cfg.accessory}
            onChange={(k) => set({ accessory: k })}
            locale={locale}
          />
        </div>
      )}

      {cfg.mode === "dicebear" && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{g.libraryHint}</div>
          <Gallery
            items={DICEBEAR_GALLERY}
            value={cfg.dicebearId}
            onPick={(id) => set({ dicebearId: id })}
          />
        </div>
      )}

      {cfg.mode === "illustrated" && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{g.illustratedHint}</div>
          <Gallery
            items={ILLUSTRATED_GALLERY}
            value={cfg.presetId}
            onPick={(id) => set({ presetId: id })}
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-neon px-4 py-2 text-sm font-semibold text-neon-foreground disabled:opacity-60"
        >
          {g.save}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm"
          >
            {g.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
