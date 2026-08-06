import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n, LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";

/** Sprachauswahl: Deutsch / English / Українська. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="card-elevated space-y-3 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Languages className="h-4 w-4" /> {t("language.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("language.desc")}</p>
      </div>
      <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LOCALES.map((l) => (
            <SelectItem key={l} value={l}>
              {LOCALE_NAMES[l]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
