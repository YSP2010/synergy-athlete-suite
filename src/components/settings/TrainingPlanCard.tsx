import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Dumbbell, Trophy } from "lucide-react";
import { humanError } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { FocusPicker } from "@/components/plan/FocusPicker";
import { getTrainingPlanStatus, generateTrainingPlan } from "@/lib/plan.functions";
import {
  EMPTY_FOCUS,
  type PlanStatus,
  type PlanType,
  type PlanTypeStatus,
  type TrainingFocus,
} from "@/lib/plan-types";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

/**
 * Einstellungen-Karte „Trainingsplan": Fokus-Auswahl + je Typ (Gym/Sport)
 * Status und Anforderung eines neuen Plans in der App-Sprache. Der Fokus wird
 * vor der Generierung ins Profil gespeichert. 4-Wochen-Sperre serverseitig.
 */
export function TrainingPlanCard() {
  const qc = useQueryClient();
  const { t, locale } = useI18n();
  const getStatus = useServerFn(getTrainingPlanStatus);
  const generate = useServerFn(generateTrainingPlan);

  const { data: status, isLoading } = useQuery({
    queryKey: ["training-plan-status"],
    queryFn: () => getStatus({ data: undefined }) as Promise<PlanStatus>,
  });

  const { data: profileFocus } = useQuery({
    queryKey: ["profile-focus"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.user.id)
        .maybeSingle();
      return (
        (data as unknown as { training_focus: TrainingFocus | null } | null)?.training_focus ?? null
      );
    },
  });

  const [focus, setFocus] = useState<TrainingFocus>(EMPTY_FOCUS);
  useEffect(() => {
    if (profileFocus) setFocus(profileFocus);
  }, [profileFocus]);

  async function persistFocus() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ training_focus: focus } as never)
      .eq("id", u.user.id);
    if (error) throw error;
  }

  const gen = useMutation({
    mutationFn: async (type: PlanType) => {
      await persistFocus();
      return generate({ data: { type, locale } });
    },
    onSuccess: () => {
      toast.success(t("plan.toast.created"));
      qc.invalidateQueries({ queryKey: ["training-plan-status"] });
      qc.invalidateQueries({ queryKey: ["training-plans"] });
      qc.invalidateQueries({ queryKey: ["profile-focus"] });
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  return (
    <div className="card-elevated space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">{t("plan.card.title")}</h2>
      <p className="text-xs text-muted-foreground">{t("plan.card.subtitle")}</p>

      <FocusPicker value={focus} onChange={setFocus} />

      <div className="space-y-4 border-t border-border pt-4">
        <PlanRow
          icon={<Dumbbell className="h-4 w-4 text-neon" />}
          title={t("plan.gym.title")}
          desc={t("plan.gym.desc")}
          status={status?.gym}
          loading={isLoading}
          pending={gen.isPending && gen.variables === "gym"}
          onGenerate={() => gen.mutate("gym")}
          t={t}
        />

        <PlanRow
          icon={<Trophy className="h-4 w-4 text-neon" />}
          title={t("plan.sport.title")}
          desc={t("plan.sport.desc")}
          status={status?.sport}
          loading={isLoading}
          pending={gen.isPending && gen.variables === "sport"}
          onGenerate={() => gen.mutate("sport")}
          t={t}
        />
      </div>
    </div>
  );
}

function PlanRow({
  icon,
  title,
  desc,
  status,
  loading,
  pending,
  onGenerate,
  t,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  status: PlanTypeStatus | undefined;
  loading: boolean;
  pending: boolean;
  onGenerate: () => void;
  t: TFn;
}) {
  const canGenerate = status?.canGenerate ?? true;
  const label = status?.lastGeneratedAt ? t("plan.action.recreate") : t("plan.action.create");

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm">
        <span className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
        {status && !canGenerate && status.nextAvailableAt && (
          <span className="mt-1 block text-xs text-muted-foreground">
            {t("plan.next", { date: formatDate(status.nextAvailableAt) })}
          </span>
        )}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={loading || pending || !canGenerate}
        onClick={onGenerate}
      >
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {label}
      </Button>
    </div>
  );
}
