import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChevronDown, AlertTriangle } from "lucide-react";
import {
  FOCUS_PRESETS,
  MUSCLE_REGIONS,
  fullyExcludedRegions,
  type FocusLevel,
  type TrainingFocus,
} from "@/lib/plan-types";

const LEVELS: FocusLevel[] = ["normal", "focus", "less", "off"];

/**
 * Auswahl des Muskelgruppen-Fokus: Presets + Feinauswahl je Region/Gruppe.
 * Setzt eine ganze Region auf „Aus", erscheint ein ruhiger Hinweis mit den
 * Optionen „Rückgängig" / „Trotzdem so lassen". Kontrolliert über value/onChange.
 */
export function FocusPicker({
  value,
  onChange,
}: {
  value: TrainingFocus;
  onChange: (f: TrainingFocus) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const setPreset = (id: string) => {
    const preset = FOCUS_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (id === "custom") {
      onChange({ preset: "custom", groups: value.groups });
      setOpen(true);
    } else {
      onChange({ preset: id, groups: { ...preset.groups } });
      setAcknowledged([]);
    }
  };

  const setGroup = (group: string, level: FocusLevel) => {
    const groups = { ...value.groups };
    if (level === "normal") delete groups[group];
    else groups[group] = level;
    onChange({ preset: "custom", groups });
  };

  const revertRegion = (regionId: string) => {
    const region = MUSCLE_REGIONS.find((r) => r.id === regionId);
    if (!region) return;
    const groups = { ...value.groups };
    for (const g of region.groups) delete groups[g];
    onChange({ preset: "custom", groups });
  };

  const warnRegions = fullyExcludedRegions(value).filter((r) => !acknowledged.includes(r));

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-medium">{t("focus.title")}</div>
        <p className="text-xs text-muted-foreground">{t("focus.subtitle")}</p>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("focus.presetLabel")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FOCUS_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition",
                value.preset === p.id
                  ? "border-neon bg-neon-soft text-foreground"
                  : "border-border bg-elevated text-muted-foreground hover:border-border/60",
              )}
            >
              {t(`focus.preset.${p.id}`)}
            </button>
          ))}
        </div>
      </div>

      {warnRegions.map((r) => (
        <div
          key={r}
          className="flex flex-col gap-2 rounded-lg border border-[color:var(--warn)]/40 bg-warn/10 p-3 text-xs"
        >
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
            <span>{t("focus.warning", { region: t(`focus.region.${r}`) })}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => revertRegion(r)}
              className="rounded-md border border-border bg-card px-2 py-1 font-medium hover:bg-elevated"
            >
              {t("focus.revert")}
            </button>
            <button
              type="button"
              onClick={() => setAcknowledged((a) => [...a, r])}
              className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"
            >
              {t("focus.keep")}
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
        {t("focus.custom")}
      </button>

      {open && (
        <div className="space-y-3">
          {MUSCLE_REGIONS.map((region) => (
            <div key={region.id} className="rounded-lg border border-border bg-elevated p-3">
              <div className="mb-2 text-xs font-semibold">{t(`focus.region.${region.id}`)}</div>
              <div className="space-y-1.5">
                {region.groups.map((g) => {
                  const level = value.groups[g] ?? "normal";
                  return (
                    <div key={g} className="flex items-center justify-between gap-2">
                      <span className="text-xs">{t(`focus.group.${g}`)}</span>
                      <div className="flex gap-1">
                        {LEVELS.map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setGroup(g, lvl)}
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[10px] transition",
                              level === lvl
                                ? "border-neon bg-neon text-neon-foreground"
                                : "border-border bg-card text-muted-foreground hover:border-border/60",
                            )}
                          >
                            {t(`focus.level.${lvl}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
