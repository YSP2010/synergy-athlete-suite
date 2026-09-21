import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n, type Locale } from "@/lib/i18n";
import { AvatarFigure } from "./AvatarFigure";
import {
  type AvatarConfig,
  type ColorOption,
  type StyleOption,
  SKIN_TONES,
  HAIR_STYLES,
  HAIR_COLORS,
  JERSEY_STYLES,
  JERSEY_COLORS,
  ACCESSORIES,
} from "@/lib/gamification/avatar";

type Strings = {
  title: string;
  skin: string;
  hair: string;
  hairColor: string;
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
    skin: "Hautton",
    hair: "Frisur",
    hairColor: "Haarfarbe",
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
    skin: "Skin tone",
    hair: "Hair",
    hairColor: "Hair color",
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
    skin: "Тон шкіри",
    hair: "Зачіска",
    hairColor: "Колір волосся",
    jersey: "Форма",
    jerseyColor: "Колір форми",
    accessory: "Аксесуар",
    save: "Зберегти",
    cancel: "Скасувати",
    saved: "Аватар збережено",
    error: "Не вдалося зберегти",
  },
};

// Minimaler Updater-Typ: avatar ist (noch) nicht in den generierten Supabase-Typen.
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

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-4">
        <div
          className="overflow-hidden rounded-full bg-[var(--elevated)]"
          style={{ width: 96, height: 96 }}
        >
          <AvatarFigure config={cfg} size={96} />
        </div>
        <div className="font-display text-lg font-bold">{g.title}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
