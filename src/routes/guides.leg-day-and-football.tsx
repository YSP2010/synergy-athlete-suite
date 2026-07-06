import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const URL = "https://synergy-athlete-suite.lovable.app/guides/leg-day-and-football";
const TITLE = "Leg Day & Fußball: Beintraining rund um Matches richtig planen";
const DESCRIPTION =
  "Wie du schweres Beintraining und Fußballspiele kombinierst, ohne mit müden Beinen aufzulaufen. 48–72 h Recovery-Fenster, Volumen-Template nach Spielhärte und ein Beispielplan.";

export const Route = createFileRoute("/guides/leg-day-and-football")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          author: { "@type": "Organization", name: "Hybrid Athlete" },
          publisher: { "@type": "Organization", name: "Hybrid Athlete" },
          mainEntityOfPage: URL,
        }),
      },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Link>
        <Link
          to="/auth"
          className="rounded-lg bg-neon px-4 py-2 text-sm font-medium text-neon-foreground transition hover:bg-neon/90"
        >
          Anmelden
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-20">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">
          Leg Day &amp; Fußball: Beintraining rund um Matches richtig planen
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          Der häufigste Fehler von Hybrid-Athleten: Kniebeugen am Freitag, Spiel am Sonntag – und
          dann fragt man sich, warum der Sprint fehlt. Beintraining und Fußball teilen sich denselben
          neuromuskulären Topf. Wer beides ernst nimmt, muss den Leg Day um Spiele herum planen und
          nicht andersherum.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Das 48–72-Stunden-Recovery-Fenster</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Schwere Beinarbeit (Kniebeugen, Kreuzheben, Ausfallschritte mit hoher Last) erzeugt
          Mikrotraumata und einen Abfall der Sprint- und Sprungkraft, der 24 bis 72 Stunden anhält.
          Kraft- und Explosivwerte kehren typischerweise nach 48 Stunden zu ~90 % zurück und nach 72
          Stunden vollständig – bei sehr hohem Volumen (z. B. 20+ Sätze Beine) eher länger. Deshalb
          gilt: Ein voller Leg Day braucht mindestens 48 Stunden Abstand zu einem Spiel mit hoher
          Intensität, besser 72.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Volumen-Template nach Spielhärte</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Statt jeden Leg Day gleich zu programmieren, staffle das Volumen nach der Härte des
          nächsten Spiels:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Hartes Match (Pflichtspiel, Playoff):</strong> Voller Leg Day (12–16 Sätze
            Unterkörper) mindestens 72 h vorher. In den 48 h davor nur Mobility, Core und leichte
            Aktivierung – keine schweren Beinlifts.
          </li>
          <li>
            <strong>Mittleres Spiel (Ligaspiel Standardintensität):</strong> Reduzierter Leg Day
            (8–10 Sätze, moderate Last, keine Maximalversuche) 48 h vorher ist machbar.
          </li>
          <li>
            <strong>Leichtes Spiel oder Testspiel:</strong> Leg Day kann bis auf 24 h herangezogen
            werden, wenn Volumen und Intensität moderat bleiben.
          </li>
          <li>
            <strong>Kein Spiel diese Woche:</strong> Nutze die Gelegenheit für den härtesten Leg Day
            des Blocks – hier baust du Kraft und Muskelmasse auf.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">Beispielwoche mit Sonntagsspiel</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Montag:</strong> Push (Brust, Schulter, Trizeps)
          </li>
          <li>
            <strong>Dienstag:</strong> Fußballtraining
          </li>
          <li>
            <strong>Mittwoch:</strong> <em>Leg Day</em> – 72 h vor dem Spiel, voller Umfang
          </li>
          <li>
            <strong>Donnerstag:</strong> Fußballtraining, dazu Mobility für die Unterschenkel
          </li>
          <li>
            <strong>Freitag:</strong> Pull (Rücken, Bizeps) – kein Bein
          </li>
          <li>
            <strong>Samstag:</strong> Aktive Erholung, Carbo-Loading (~7,5 g Kohlenhydrate / kg)
          </li>
          <li>
            <strong>Sonntag:</strong> Match
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">Wenn zwei Spiele pro Woche anstehen</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Bei englischen Wochen (z. B. Mittwoch- und Sonntagsspiel) fällt der klassische Leg Day
          weg. Ersetze ihn durch eine kurze Unterkörper-Aktivierung (2–3 Sätze Kniebeuge mit 50 %,
          Hip Thrusts, kein Muskelversagen), damit du das Bewegungsmuster hältst, ohne Ermüdung
          aufzubauen. Den vollen Leg Day legst du in die nächste spielfreie Woche.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Recovery-Signale beachten</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Selbst mit gutem Timing kann Muskelkater, schlechter Schlaf oder hoher Stress dazwischen
          kommen. Wenn dein Recovery-Score niedrig ist, ziehe den Leg Day einen Tag nach hinten oder
          reduziere Volumen und Intensität – lieber einen kleineren Reiz als ein müdes Spiel.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-elevated p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Der Hybrid Athlete Planer verschiebt harte Leg Days automatisch weg von deinen
            Spieltagen und passt Volumen an deinen Recovery-Score an.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex rounded-lg bg-neon px-6 py-3 text-sm font-semibold text-neon-foreground transition hover:bg-neon/90 glow"
          >
            Kostenlos starten
          </Link>
        </div>
      </article>
    </div>
  );
}
