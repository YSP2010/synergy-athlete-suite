import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const URL = "https://synergy-athlete-suite.lovable.app/guides/running-and-leg-day";
const TITLE = "Laufen nach Leg Day: Timing für Ausdauer & Beinkraft";
const DESCRIPTION =
  "Wie lange du nach schwerem Beintraining mit dem Laufen wartest, welche Einheiten am selben Tag erlaubt sind und wie du Interferenz vermeidest – mit Beispielwoche.";

export const Route = createFileRoute("/guides/running-and-leg-day")({
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
          Laufen nach Leg Day: das richtige Timing für Ausdauer und Beinkraft
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          „Kann ich am Tag nach dem Beintraining laufen gehen?" ist die häufigste Frage von
          Hybrid-Athleten. Die kurze Antwort: ja – aber nicht jede Laufeinheit und nicht zu jedem
          Zeitpunkt. Entscheidend sind Abstand, Intensität und die Reihenfolge innerhalb des Tages.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Warum Laufen nach dem Leg Day heikel ist
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Schwere Kniebeugen, Kreuzheben und Ausfallschritte hinterlassen Mikrotraumata in der
          Oberschenkel- und Gesäßmuskulatur. In den 24 bis 48 Stunden danach sind Kraftentwicklung,
          Laufökonomie und exzentrische Belastbarkeit reduziert – genau die Eigenschaften, die ein
          harter Lauf braucht. Läufst du in dieser Phase intensiv, verlängerst du die Regeneration,
          statt Ausdauer aufzubauen: das ist der klassische Interferenz-Effekt.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Zeitfenster: Was wann sinnvoll ist
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>0–6 h nach dem Leg Day:</strong> Nur sehr lockeres Auslaufen (10–15 Minuten,
            Zone 1). Alles darüber addiert Ermüdung auf einen bereits erschöpften Muskel.
          </li>
          <li>
            <strong>6–24 h danach:</strong> Ruhiger Dauerlauf in Zone 2, maximal 30–45 Minuten,
            flaches Profil. Kein Tempo, keine Bergläufe, keine Sprints.
          </li>
          <li>
            <strong>24–48 h danach:</strong> Längerer Zone-2-Lauf oder Fahrtspiel möglich, sofern
            der Muskelkater unter „spürbar, aber nicht schmerzhaft" bleibt.
          </li>
          <li>
            <strong>Ab 48 h:</strong> Intervalle, Tempoläufe und Sprints sind wieder freigegeben –
            das ist das Fenster für deine harte Ausdauereinheit.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Wenn beides am selben Tag stattfindet
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Steht Laufen und Beintraining am gleichen Tag an, priorisiere das Ziel: Willst du Kraft und
          Muskelmasse aufbauen, hebe zuerst und laufe frühestens sechs Stunden später locker. Steht
          eine wichtige Laufeinheit im Kalender (Intervalle, Testlauf), läufst du zuerst und
          reduzierst den anschließenden Leg Day um etwa ein Drittel des Volumens. Zwei harte
          Einheiten direkt hintereinander bringen keinen zusätzlichen Reiz, nur zusätzliche
          Ermüdung.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Beispielwoche Hybrid</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Montag:</strong> Leg Day (voller Umfang, 12–16 Sätze Unterkörper)
          </li>
          <li>
            <strong>Dienstag:</strong> Zone-2-Lauf, 35–45 Minuten locker
          </li>
          <li>
            <strong>Mittwoch:</strong> Oberkörper Push + Core
          </li>
          <li>
            <strong>Donnerstag:</strong> Intervalle oder Tempolauf (72 h nach dem Leg Day)
          </li>
          <li>
            <strong>Freitag:</strong> Oberkörper Pull, leichte Unterkörper-Aktivierung
          </li>
          <li>
            <strong>Samstag:</strong> Langer Lauf in Zone 2
          </li>
          <li>
            <strong>Sonntag:</strong> Ruhetag oder Mobility
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Regeneration aktiv unterstützen
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Kohlenhydrate rund um beide Einheiten füllen die Glykogenspeicher, die Laufen und Krafttraining
          gemeinsam leeren – an Doppeltagen eher 6–8 g pro Kilogramm Körpergewicht. Dazu 1,6–2,2 g
          Protein pro Kilogramm, Schlaf über sieben Stunden und Blick auf HRV und Ruhepuls. Sinkt der
          Recovery-Score, wird aus dem geplanten Zone-2-Lauf ein Spaziergang – das kostet dich keine
          Form, ein überzogener Lauf dagegen eine ganze Woche.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-elevated p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Der Hybrid Athlete Planer legt harte Laufeinheiten automatisch außerhalb des
            48-Stunden-Fensters nach deinem Leg Day und passt die Kohlenhydrate an Doppeltage an.
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
