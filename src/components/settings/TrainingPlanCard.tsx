import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Dumbbell, Trophy } from "lucide-react";
import { humanError } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { getTrainingPlanStatus, generateTrainingPlan } from "@/lib/plan.functions";
import type { PlanStatus, PlanType, PlanTypeStatus } from "@/lib/plan-types";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

/**
 * Einstellungen-Karte „Trainingsplan": zeigt je Typ (Gym/Sport) den Status und
 * erlaubt das Anfordern eines neuen Plans in der eingestellten App-Sprache. Die
 * 4-Wochen-Sperre wird zusätzlich serverseitig erzwungen.
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

  const gen = useMutation({
    mutationFn: (type: PlanType) => generate({ data: { type, locale } }),
    onSuccess: () => {
      toast.success(t("plan.toast.created"));
      qc.invalidateQueries({ queryKey: ["training-plan-status"] });
      qc.invalidateQueries({ queryKey: ["training-plans"] });
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  return (
    <div className="card-elevated space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">{t("plan.card.title")}</h2>
      <p className="text-xs text-muted-foreground">{t("plan.card.subtitle")}</p>

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
