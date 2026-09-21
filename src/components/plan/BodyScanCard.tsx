import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Camera, Loader2, ShieldCheck } from "lucide-react";
import { humanError } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { isMinor } from "@/lib/youth";
import { analyzeBodyScan } from "@/lib/bodyscan.functions";

interface Suggestion {
  emphasize: string[];
  note: string;
}

/**
 * Optionaler Body-Scan: Foto hochladen → KI schlägt zu betonende Muskelgruppen
 * vor. Foto wird serverseitig sofort nach der Analyse gelöscht. Für unter
 * 16-Jährige komplett gesperrt. Ausgabe ist nur ein Trainings-Fokus-Vorschlag.
 *
 * `birthDate` überschreibt die Altersprüfung (Onboarding: lokale Eingabe, bevor
 * das Profil gespeichert ist). Ohne die Prop wird das Geburtsdatum aus dem
 * Profil gelesen (Einstellungen). `onBeforeScan` wird vor dem Upload aufgerufen
 * (Onboarding: Geburtsdatum persistieren, damit auch die Server-Sperre greift).
 */
export function BodyScanCard({
  onApply,
  birthDate,
  onBeforeScan,
}: {
  onApply: (groups: string[]) => void;
  birthDate?: string | null;
  onBeforeScan?: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const analyze = useServerFn(analyzeBodyScan);
  const useLocalBirth = birthDate !== undefined;

  const { data: dbBirth, isLoading } = useQuery({
    queryKey: ["profile-birthdate"],
    enabled: !useLocalBirth,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("birth_date")
        .eq("id", u.user.id)
        .maybeSingle();
      return data?.birth_date ?? null;
    },
  });

  const run = useMutation({
    mutationFn: async (file: File) => {
      if (onBeforeScan) await onBeforeScan();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Nicht angemeldet");
      await supabase
        .from("consents")
        .insert({ user_id: u.user.id, kind: "body_scan", granted: true, version: "v1" });
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${u.user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("body-scans")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw new Error(up.error.message);
      const res = await analyze({ data: { imagePath: path, locale } });
      return res.suggestion as Suggestion;
    },
    onSuccess: (s) => setSuggestion(s),
    onError: (e: Error) => toast.error(humanError(e)),
  });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("bodyscan.errorType"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t("bodyscan.errorSize"));
      return;
    }
    run.mutate(file);
  }

  if (!useLocalBirth && isLoading) return null;

  const effectiveBirth = useLocalBirth ? (birthDate ?? null) : (dbBirth ?? null);
  const blocked = isMinor(effectiveBirth);

  return (
    <div className="rounded-lg border border-border bg-elevated p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Camera className="h-4 w-4 text-neon" />
        {t("bodyscan.title")}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("bodyscan.subtitle")}</p>

      {blocked ? (
        <p className="mt-3 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
          {t("bodyscan.minorBlocked")}
        </p>
      ) : (
        <>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">{t("bodyscan.consent")}</span>
          </label>

          <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={!consent || run.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {run.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("bodyscan.analyzing")}
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" /> {t("bodyscan.upload")}
              </>
            )}
          </Button>

          {suggestion && (
            <div className="mt-3 rounded-md border border-border bg-card p-3">
              <div className="text-xs font-semibold">{t("bodyscan.suggestionTitle")}</div>
              {suggestion.note && (
                <p className="mt-1 text-xs text-muted-foreground">{suggestion.note}</p>
              )}
              {suggestion.emphasize.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {suggestion.emphasize.map((g) => (
                    <span
                      key={g}
                      className="rounded bg-neon-soft px-1.5 py-0.5 text-[11px] text-foreground"
                    >
                      {t(`focus.group.${g}`)}
                    </span>
                  ))}
                </div>
              )}
              {suggestion.emphasize.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    onApply(suggestion.emphasize);
                    toast.success(t("bodyscan.applied"));
                  }}
                >
                  {t("bodyscan.apply")}
                </Button>
              )}
            </div>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            {t("bodyscan.disclaimer")}
          </p>
        </>
      )}
    </div>
  );
}
