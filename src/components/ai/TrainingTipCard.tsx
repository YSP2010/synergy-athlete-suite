import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateTrainingTip } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { humanError } from "@/lib/errors";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SPORTS = ["football", "tennis", "running", "triathlon"] as const;
const FOCUSES = ["endurance", "strength", "speed", "recovery"] as const;
type Sport = (typeof SPORTS)[number];
type Focus = (typeof FOCUSES)[number];

/**
 * Kleine Karte für einen KI-Trainingstipp (Server-Funktion generateTrainingTip).
 * `compact` blendet den Beschreibungstext aus – für den Dashboard-Teaser.
 * Fehler (z. B. fehlender LOVABLE_API_KEY) landen als Toast, die Karte bleibt stabil.
 */
export function TrainingTipCard({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const [sport, setSport] = useState<Sport>("football");
  const [focus, setFocus] = useState<Focus>("endurance");
  const [tip, setTip] = useState<string | null>(null);
  const run = useServerFn(generateTrainingTip);

  const mutation = useMutation({
    mutationFn: async () => run({ data: { sport, focus, locale } }),
    onSuccess: (res) => setTip(res.tip),
    onError: (e: Error) => toast.error(humanError(e)),
  });

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-neon" /> {t("aitip.title")}
      </div>
      {!compact && <p className="mt-1 text-sm text-muted-foreground">{t("aitip.subtitle")}</p>}

      <div className="mt-3 space-y-2">
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("aitip.sportLabel")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SPORTS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={sport === s ? "default" : "outline"}
                onClick={() => setSport(s)}
              >
                {t(`aitip.sport.${s}`)}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("aitip.focusLabel")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FOCUSES.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={focus === f ? "default" : "outline"}
                onClick={() => setFocus(f)}
              >
                {t(`aitip.focus.${f}`)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        size="sm"
        className="glow mt-3 bg-neon text-neon-foreground hover:bg-neon/90"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t("aitip.loading")}
          </>
        ) : (
          <>
            <Sparkles className="mr-1 h-4 w-4" /> {t("aitip.button")}
          </>
        )}
      </Button>

      <div className={cn("mt-3 whitespace-pre-line text-sm", !tip && "text-muted-foreground")}>
        {tip ?? t("aitip.empty")}
      </div>
    </div>
  );
}
