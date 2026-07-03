import { createFileRoute, Link } from "@tanstack/react-router";
import { Construction } from "lucide-react";

function ComingSoon({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-neon-soft text-neon">
        <Construction className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
      <Link
        to="/dashboard"
        className="mt-6 inline-block rounded-lg bg-neon px-4 py-2 text-sm font-semibold text-neon-foreground glow"
      >
        Zum Dashboard
      </Link>
    </div>
  );
}

export const GymRoute = createFileRoute("/_authenticated/gym")({
  head: () => ({ meta: [{ title: "Gym-Log" }] }),
  component: () => (
    <ComingSoon
      title="Gym-Logger"
      hint="Kommt in Etappe 2: Übungen mit Sätzen, Wdh, Gewicht & RPE loggen – inkl. Vorschlägen aus der letzten Session."
    />
  ),
});
export const Route = GymRoute;
