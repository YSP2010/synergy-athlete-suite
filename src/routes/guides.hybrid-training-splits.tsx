import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const CANONICAL = "https://synergy-athlete-suite.lovable.app/guides/hybrid-training-splits";
const TITLE = "Hybrid-Splits: Push/Pull/Legs vs. Upper/Lower";
const DESCRIPTION =
  "Push/Pull/Legs vs. Upper/Lower für Fußballer: 48h-Beintraining-Regel und Carbo-Loading vor Spielen.";

export const Route = createFileRoute("/guides/hybrid-training-splits")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          mainEntityOfPage: CANONICAL,
          inLanguage: "de",
          author: { "@type": "Organization", name: "Hybrid Athlete" },
          publisher: { "@type": "Organization", name: "Hybrid Athlete" },
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
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
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
          Hybrid-Training-Splits: Push/Pull/Legs vs. Upper/Lower rund um Spieltage
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          Wenn du Fußball spielst und gleichzeitig im Gym Kraft aufbaust, ist die Wahl des richtigen
          Splits keine Geschmacksfrage – sie entscheidet darüber, ob du am Spieltag frische Beine hast
          oder mit Muskelkater aufläufst. Dieser Ratgeber zeigt, wie du Push/Pull/Legs und Upper/Lower
          um deine Matches herum organisierst, warum die 48-Stunden-Regel für Beintraining gilt und wie
          du dich mit Carbo-Loading auf harte Spiele vorbereitest.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Push/Pull/Legs vs. Upper/Lower</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Der klassische <strong>Push/Pull/Legs</strong>-Split (Drücken, Ziehen, Beine) eignet sich, wenn
          du drei oder mehr Gym-Einheiten pro Woche unterbringst und deine Beine gut vom Spieltag
          entkoppeln kannst. Der Vorteil: Der isolierte Beintag lässt sich gezielt weit weg vom Match
          legen. <strong>Upper/Lower</strong> (Oberkörper / Unterkörper) ist die bessere Wahl bei nur zwei
          Gym-Tagen pro Woche oder in intensiven Spielphasen, weil du Unterkörper-Volumen leichter
          reduzierst, ohne den ganzen Oberkörper-Reiz zu verlieren. Faustregel: In der Vorbereitung mit
          wenig Spielen fährst du gut mit Push/Pull/Legs, in der heißen Saisonphase mit dicht gedrängten
          Spieltagen ist Upper/Lower oft robuster.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Die 48-Stunden-Regel für Beintraining</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Schweres Beintraining erzeugt Mikrotraumata und neuromuskuläre Ermüdung, die 24 bis 72 Stunden
          nachwirken. Ein Beintag zu nah am Spiel bedeutet: langsamere Sprints, schlechtere Sprungkraft und
          ein höheres Verletzungsrisiko. Deshalb gilt die einfache Regel: <strong>Kein hartes Bein- oder
          Unterkörpertraining in den 48 Stunden vor einem wichtigen Spiel.</strong> In der Praxis heißt
          das, einen für Freitag geplanten Beintag vor einem Sonntagsspiel auf leichtes Upper-Body-Training
          oder Mobility zu verschieben. Genau diese Logik nimmt dir der Hybrid-Athlete-Planer ab: Erkennt er
          ein hartes Match, tauscht er ein Bein- oder Unterkörpertraining in den zwei Tagen davor
          automatisch gegen eine schonende Einheit und markiert die Verschiebung.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Eine Beispielwoche mit Sonntagsspiel</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li><strong>Montag:</strong> Gym Push (Brust, Schulter, Trizeps)</li>
          <li><strong>Dienstag:</strong> Fußballtraining</li>
          <li><strong>Mittwoch:</strong> Gym Legs (Beine, Glutes, Core) – weit genug vom Spiel entfernt</li>
          <li><strong>Donnerstag:</strong> Fußballtraining</li>
          <li><strong>Freitag:</strong> Gym Pull (Rücken, Bizeps) statt Beine – 48h-Regel greift</li>
          <li><strong>Samstag:</strong> Ruhetag oder Active Recovery + Carbo-Loading</li>
          <li><strong>Sonntag:</strong> Spiel (hart)</li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">Carbo-Loading vor harten Spielen</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Volle Glykogenspeicher sind der Unterschied zwischen &bdquo;läuft bis zur 90. Minute&ldquo; und
          &bdquo;Einbruch nach der Pause&ldquo;. Vor einem harten Match lohnt es sich, die Kohlenhydrate am
          Vortag deutlich anzuheben – als Zielgröße dienen rund <strong>7,5 g Kohlenhydrate pro Kilogramm
          Körpergewicht</strong>. Für einen 75-kg-Athleten sind das etwa 560 g Kohlenhydrate am Tag vor dem
          Spiel. Fett wird dabei leicht reduziert (etwa 0,8 g/kg statt 1,0 g/kg), damit die zusätzlichen
          Carbs Platz haben, während <strong>Protein konstant bei rund 2 g/kg</strong> bleibt, um die
          Muskulatur zu schützen. Genau mit diesen Zahlen rechnet der Makro-Rechner der App und blendet am
          Vortag eines harten Spiels automatisch einen Carbo-Loading-Hinweis ein.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Recovery steuert den Plan</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Der beste Split nützt wenig, wenn du dauerhaft übermüdet trainierst. Behalte Schlaf, Muskelkater
          und Stress im Blick – und reduziere die nächste harte Einheit, wenn dein Recovery-Status niedrig
          ist. Periodisiere bewusst statt jede Woche ans Limit zu gehen: So baust du Kraft auf und bleibst
          auf dem Platz leistungsfähig.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-elevated p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Lass den Planer die Split-Verschiebungen, den Recovery-Score und dein Carbo-Loading automatisch
            für dich berechnen.
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
