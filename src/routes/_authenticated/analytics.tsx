import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analyse – Hybrid Athlete" },
      { name: "description", content: "Belastung, Form, VO2max, Effizienz und Erholung aus deinen Garmin-Daten – verständlich erklärt." },
      { property: "og:title", content: "Analyse – Hybrid Athlete" },
      { property: "og:description", content: "Belastung, Form und Erholung aus deinen Garmin-Daten." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/analytics" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Analyse – Hybrid Athlete" },
      { name: "twitter:description", content: "Belastung, Form und Erholung aus deinen Garmin-Daten." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: uid } = useQuery({
    queryKey: ["analytics-uid"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Analyse</h1>
        <p className="text-sm text-muted-foreground">
          Deine Trainingsdaten – jede Kennzahl mit Erklärung, was sie für dich bedeutet.
        </p>
      </header>
      {uid ? (
        <AnalyticsView userId={uid} />
      ) : (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
