import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Dumbbell, Trophy } from "lucide-react";
import { humanError } from "@/lib/errors";
import { getTrainingPlanStatus, generateTrainingPlan } from "@/lib/plan.functions";
import type { PlanStatus, PlanType, PlanTypeStatus } from "@/lib/plan-types";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("de-DE");
}

/**
 * Einstellungen-Karte „Trainingsplan": zeigt je Typ (Gym/Sport) den Status und
 * erlaubt das Anfordern eines neuen Plans. Die 4-Wochen-Sperre wird zusätzlich
 * serverseitig erzwungen – hier wird der Button nur passend deaktiviert.
 */
export function TrainingPlanCard() {
  const qc = useQueryClient();
  const getStatus = useServerFn(getTrainingPlanStatus);
  const generate = useServerFn(generateTrainingPlan);

  const { data: status, isLoading } = useQuery({
    queryKey: ["training-plan-status"],
    queryFn: () => getStatus({ data: undefined }) as Promise<PlanStatus>,
  });

  const gen = useMutation({
    mutationFn: (type: PlanType) => generate({ data: { type } }),
    onSuccess: () => {
      toast.success("Trainingsplan erstellt");
      qc.invalidateQueries({ queryKey: ["training-plan-status"] });
      qc.invalidateQueries({ queryKey: ["training-plans"] });
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  return (
    <div className="card-elevated space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">Trainingsplan</h2>
      <p className="text-xs text-muted-foreground">
        Lass dir einen persönlichen Plan erstellen – abgestimmt auf Profil, Ziel und Erfahrung. Ein
        neuer Plan ist je Typ alle 4 Wochen möglich.
      </p>

      <PlanRow
        icon={<Dumbbell className="h-4 w-4 text-neon" />}
        title="Gym-Trainingsplan"
        desc="Kraft & Aufbau passend zu Zielsetzung und Trainingstagen."
        status={status?.gym}
        loading={isLoading}
        pending={gen.isPending && gen.variables === "gym"}
        onGenerate={() => gen.mutate("gym")}
      />

      <PlanRow
        icon={<Trophy className="h-4 w-4 text-neon" />}
        title="Sport-Verbesserungsplan"
        desc="Sportartspezifisches Training für deine Disziplin."
        status={status?.sport}
        loading={isLoading}
        pending={gen.isPending && gen.variables === "sport"}
        onGenerate={() => gen.mutate("sport")}
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
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  status: PlanTypeStatus | undefined;
  loading: boolean;
  pending: boolean;
  onGenerate: () => void;
}) {
  const canGenerate = status?.canGenerate ?? true;
  const label = status?.lastGeneratedAt ? "Neu erstellen" : "Erstellen";

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
            Nächster Plan ab {formatDate(status.nextAvailableAt)}
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
