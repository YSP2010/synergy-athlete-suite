import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wiederverwendbarer Fehler-Zustand fuer fehlgeschlagene Queries.
 * Zeigt eine Karte im App-Stil mit optionalem "Erneut versuchen"-Button.
 */
export function QueryError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card-elevated flex flex-col items-center gap-3 p-8 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <div className="font-display text-sm font-semibold">Daten konnten nicht geladen werden</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {message ?? "Bitte pruefe deine Verbindung und versuche es erneut."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Erneut versuchen
        </Button>
      )}
    </div>
  );
}
