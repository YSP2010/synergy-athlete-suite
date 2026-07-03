import { createFileRoute, Link } from "@tanstack/react-router";
import { Utensils } from "lucide-react";

export const Route = createFileRoute("/_authenticated/nutrition")({
  head: () => ({ meta: [{ title: "Ernährung" }] }),
  component: () => (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-neon-soft text-neon">
        <Utensils className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-bold">Ernährungs-Tracker</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Kommt in Etappe 3: Mahlzeiten loggen, Makro-Ziel-Tracking, KI-Empfehlungen und Verlauf.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-block rounded-lg bg-neon px-4 py-2 text-sm font-semibold text-neon-foreground glow"
      >
        Zum Dashboard
      </Link>
    </div>
  ),
});
