import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const URL =
  "https://synergy-athlete-suite.lovable.app/guides/supplements-for-hybrid-athletes";
const TITLE = "Kreatin & Beta-Alanin für Hybrid-Athleten: Guide";
const DESCRIPTION =
  "Wie Kreatin und Beta-Alanin bei Kraft plus Ausdauer wirken: Dosierung, Timing, Ladephase, Nebenwirkungen und ein Stack-Plan für Hybrid-Athleten.";

export const Route = createFileRoute("/guides/supplements-for-hybrid-athletes")({
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Wie viel Kreatin brauchen Hybrid-Athleten?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "3–5 g Kreatin-Monohydrat täglich, dauerhaft und unabhängig vom Trainingszeitpunkt. Eine Ladephase mit 20 g über fünf Tage füllt die Speicher schneller, ist aber nicht nötig.",
              },
            },
            {
              "@type": "Question",
              name: "Wann wirkt Beta-Alanin?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Beta-Alanin wirkt nicht akut als Pre-Workout, sondern über die Sättigung der Muskel-Carnosinspeicher. Nach vier bis zehn Wochen mit 3,2–6,4 g täglich, aufgeteilt in Portionen von maximal 1,6 g.",
              },
            },
            {
              "@type": "Question",
              name: "Macht Kreatin schwerer und langsamer beim Laufen?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Kreatin bindet Wasser in der Muskelzelle, typisch sind 0,5 bis 2 kg mehr Körpergewicht. Für Fußball, Tennis und Krafttraining ist das irrelevant; vor einem Marathon oder einer Bergaufwertung kann es minimal bremsen.",
              },
            },
          ],
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
          Supplements für Hybrid-Athleten: Kreatin und Beta-Alanin richtig einsetzen
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          Wer schweres Krafttraining mit Fußball, Tennis, Laufen oder Triathlon kombiniert, belastet
          zwei Energiesysteme gleichzeitig: das Phosphagen-System für kurze, maximale Aktionen und
          die glykolytische Ausdauer für wiederholte Sprints und lange Einheiten. Genau an diesen
          zwei Punkten setzen die beiden am besten belegten Supplements an – Kreatin-Monohydrat und
          Beta-Alanin. Alles andere ist Feinschliff.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Kreatin-Monohydrat: mehr Wiederholungen, schnellere Erholung zwischen Sprints
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Kreatin erhöht die Phosphokreatin-Speicher im Muskel um etwa 20 Prozent. Dadurch wird ATP
          in den ersten sechs bis zehn Sekunden einer maximalen Belastung schneller resynthetisiert.
          Für dich heißt das: ein bis zwei zusätzliche Wiederholungen bei Kniebeugen und Bankdrücken,
          höhere Spitzenleistung im Sprint und – der für Hybrid-Athleten wichtigste Punkt – eine
          schnellere Wiederherstellung zwischen wiederholten Sprints. Genau dieses Muster prägt die
          zweite Halbzeit im Fußball und lange Ballwechselserien im Tennis.
        </p>
        <h3 className="mt-6 font-display text-lg font-semibold">Dosierung und Timing</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Erhaltung:</strong> 3–5 g Kreatin-Monohydrat täglich, jeden Tag – auch an
            Ruhetagen und in der Off-Season.
          </li>
          <li>
            <strong>Ladephase (optional):</strong> 20 g pro Tag auf vier Portionen verteilt über
            fünf bis sieben Tage. Sättigt die Speicher in einer Woche statt in vier, erhöht aber das
            Risiko für Magen-Darm-Beschwerden.
          </li>
          <li>
            <strong>Timing:</strong> nachrangig. Ein leichter Vorteil zeigt sich für die Einnahme
            nach dem Training zusammen mit Kohlenhydraten und Protein.
          </li>
          <li>
            <strong>Form:</strong> Monohydrat. HCl, Kre-Alkalyn und Ethylester sind teurer, ohne
            belegten Mehrwert.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Nebenwirkung Nummer eins ist Wassereinlagerung in der Muskelzelle: 0,5 bis 2 kg mehr auf
          der Waage. Für Spielsportarten und Kraftaufbau ist das ein Vorteil, für einen
          Marathon-Peak oder eine Bergaufwertung im Radsport ein kleiner Nachteil, den du in der
          Wettkampfphase abwägen kannst.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Beta-Alanin: Puffer gegen das Brennen in der Ausdauerspitze
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Beta-Alanin ist die limitierende Vorstufe von Carnosin, das im Muskel Wasserstoffionen
          abpuffert. Wenn dich in der 60. bis 240. Sekunde einer harten Belastung das Brennen
          ausbremst – Intervalle über 400 bis 1000 Meter, wiederholte Steigerungsläufe,
          hochintensive Sätze mit 15 bis 25 Wiederholungen –, ist genau das dein Engpass. Studien
          zeigen dort Leistungszuwächse in der Größenordnung von zwei bis drei Prozent.
        </p>
        <h3 className="mt-6 font-display text-lg font-semibold">Dosierung und Timing</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Menge:</strong> 3,2–6,4 g täglich über mindestens vier, besser zehn Wochen.
          </li>
          <li>
            <strong>Aufteilung:</strong> Einzelportionen von maximal 1,6 g, sonst kribbelt die Haut
            (Parästhesie – harmlos, aber unangenehm). Retard-Kapseln reduzieren den Effekt.
          </li>
          <li>
            <strong>Timing:</strong> egal. Beta-Alanin wirkt über die Sättigung des Carnosinspeichers,
            nicht akut. Es gehört damit streng genommen nicht in ein Pre-Workout, auch wenn es dort
            fast immer enthalten ist.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Warum die Kombination für Hybrid-Athleten besonders passt
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Die beiden Substanzen decken zwei verschiedene Zeitfenster ab und stören sich nicht: Kreatin
          verbessert alles unter zehn Sekunden und die Erholung dazwischen, Beta-Alanin alles zwischen
          einer und vier Minuten. Ein Fußballspiel besteht aus genau dieser Mischung – kurze Sprints
          plus lange Phasen hoher Laktatbelastung. Im Gym profitierst du beim schweren Grundlagenblock
          von Kreatin und bei den Ausbelastungssätzen am Satzende von Beta-Alanin. Studien zur
          Kombination zeigen additive Effekte auf Körperzusammensetzung und Leistungsausdauer.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Basis-Stack: was wirklich zählt</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Kreatin-Monohydrat:</strong> 5 g täglich, dauerhaft.
          </li>
          <li>
            <strong>Beta-Alanin:</strong> 2 × 1,6 g täglich, mindestens vier Wochen vor der
            Saisonspitze beginnen.
          </li>
          <li>
            <strong>Koffein:</strong> 3 mg pro Kilogramm Körpergewicht, 45 Minuten vor harten
            Einheiten – nicht nach 15 Uhr, sonst kostet es dich Tiefschlaf und Regeneration.
          </li>
          <li>
            <strong>Protein:</strong> 1,6–2,2 g pro Kilogramm Körpergewicht pro Tag; Pulver nur, wenn
            du diese Menge über Lebensmittel nicht erreichst.
          </li>
          <li>
            <strong>Elektrolyte & Natrium:</strong> bei Einheiten über 60 Minuten oder starkem
            Schwitzen.
          </li>
          <li>
            <strong>Vitamin D3:</strong> im Winter, idealerweise nach Blutwert.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Nicht auf der Liste: BCAA (überflüssig bei ausreichend Protein), Fatburner und
          hochdosierte Antioxidantien direkt nach dem Training – letztere können die
          Anpassungssignale der Ausdauereinheit sogar abschwächen.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Sicherheit und Kontrolle</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Kreatin und Beta-Alanin gehören zu den am besten untersuchten Supplements überhaupt und
          stehen nicht auf der WADA-Verbotsliste. Wer im organisierten Wettkampfsport startet, sollte
          trotzdem auf Kölner Liste oder Informed Sport geprüfte Produkte setzen, um Kontaminationen
          auszuschließen. Bei Nierenerkrankungen, Schwangerschaft oder unter 18 Jahren gilt: vorher
          ärztlich abklären. Dieser Guide ersetzt keine medizinische Beratung.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-elevated p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Der Hybrid Athlete Planer verknüpft deinen Wochenplan mit Makros und Regeneration – so
            siehst du, wann harte Intervalle wirklich Sinn ergeben und wann dein Körper eine Pause
            braucht.
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
