import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const URL = "https://synergy-athlete-suite.lovable.app/guides/best-hybrid-athlete-programs";
const TITLE = "Hybrid Athlete Trainingsprogramme im Vergleich 2026";
const DESCRIPTION =
  "Nick Bare, Hybrid Performance Method, Tactical Barbell & Synergy Athlete im Vergleich: Aufbau, Aufwand, Ausdaueranteil und wer Spieltag-Planung wirklich abbildet.";

export const Route = createFileRoute("/guides/best-hybrid-athlete-programs")({
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
              name: "Welches Hybrid-Trainingsprogramm passt zu Fußballern?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Fußballer brauchen ein Programm, das Spieltage und Mannschaftstraining als feste Termine behandelt und schweres Beintraining aus dem 48-Stunden-Fenster vor dem Spiel heraushält. Klassische Programme wie Nick Bare oder Hybrid Performance Method sind auf Lauf- und Kraftziele ausgelegt und kennen keinen Spieltag.",
              },
            },
            {
              "@type": "Question",
              name: "Wie viele Einheiten pro Woche sind für Hybrid-Training realistisch?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Drei Krafteinheiten plus zwei bis vier Ausdauer- oder Sporteinheiten sind für die meisten Amateure machbar. Entscheidend ist nicht die Anzahl, sondern dass harte Einheiten mindestens 24 bis 48 Stunden auseinanderliegen.",
              },
            },
            {
              "@type": "Question",
              name: "Kann man Kraft und Ausdauer gleichzeitig aufbauen?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Ja, wenn Intensitäten getrennt werden: Ausdauer überwiegend in Zone 2, Kraft mit wenigen schweren Sätzen und ausreichend Kohlenhydraten. Der Interferenz-Effekt wird vor allem dann groß, wenn harte Läufe direkt vor oder nach schwerem Beintraining liegen.",
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
          Die besten Hybrid-Athlete-Trainingsprogramme im Vergleich
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          Hybrid Training heißt: Kraft und Ausdauer gleichzeitig entwickeln, ohne dass eine Qualität
          die andere auffrisst. Die bekanntesten Programme lösen das unterschiedlich – und keines
          davon ist für alle richtig. Dieser Vergleich zeigt, wie Nick Bare, Hybrid Performance
          Method, Tactical Barbell und der Synergy-Athlete-Ansatz aufgebaut sind, wie viel Zeit sie
          kosten und welches Programm zu welchem Ziel passt.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Kurzvergleich</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Programm</th>
                <th className="py-2 pr-3 font-semibold">Fokus</th>
                <th className="py-2 pr-3 font-semibold">Aufwand / Woche</th>
                <th className="py-2 font-semibold">Passt zu</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border">
                <td className="py-3 pr-3 font-medium text-foreground">Nick Bare (BPN / Hybrid)</td>
                <td className="py-3 pr-3">Hypertrophie + Laufdistanz</td>
                <td className="py-3 pr-3">8–11 Einheiten</td>
                <td className="py-3">Marathon-Ziel bei erhaltener Muskelmasse</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 pr-3 font-medium text-foreground">Hybrid Performance Method</td>
                <td className="py-3 pr-3">Powerlifting + CrossFit-Conditioning</td>
                <td className="py-3 pr-3">6–9 Einheiten</td>
                <td className="py-3">Maximalkraft mit hoher Arbeitskapazität</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 pr-3 font-medium text-foreground">Tactical Barbell</td>
                <td className="py-3 pr-3">Minimalistische Kraft + viel Conditioning</td>
                <td className="py-3 pr-3">5–7 Einheiten</td>
                <td className="py-3">Einsatzkräfte, unregelmäßige Wochen</td>
              </tr>
              <tr>
                <td className="py-3 pr-3 font-medium text-foreground">Synergy Athlete</td>
                <td className="py-3 pr-3">Mannschaftssport + 3× Gym</td>
                <td className="py-3 pr-3">5–7 Einheiten, dynamisch</td>
                <td className="py-3">Fußballer, Tennis- und Triathlon-Hybride</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 font-display text-2xl font-bold">Nick Bare: Laufvolumen zuerst</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Der Ansatz von Nick Bare ist populär geworden, weil er zeigt, dass Marathonzeiten und
          Muskelmasse sich nicht ausschließen. Der Preis ist Volumen: oft fünf Läufe und vier
          Krafteinheiten pro Woche, teils als Doppeltage. Das funktioniert für Athleten mit
          planbarem Alltag und ohne Wettkampfsport am Wochenende. Wer Samstag ein Punktspiel hat,
          bekommt das Laufvolumen und die Spielbelastung nur schwer unter einen Hut.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Hybrid Performance Method: Kraft mit Conditioning
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          HPM kommt aus dem Powerlifting und ergänzt schwere Grundübungen um metabolische
          Conditioning-Blöcke. Die Kraftentwicklung ist stark, die Ausdauer bleibt aber überwiegend
          im hochintensiven Bereich – aerobe Grundlage wird kaum aufgebaut. Für Sportarten mit
          langen, wiederholten Sprintanforderungen wie Fußball fehlt genau dieser Zone-2-Unterbau.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Tactical Barbell: minimal und robust
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Tactical Barbell reduziert Kraft auf wenige Grundübungen mit klaren Prozentvorgaben und
          lässt viel Raum für Conditioning. Das macht es sehr robust gegenüber unregelmäßigen
          Wochen. Der Nachteil: Hypertrophie ist nicht das Ziel, und die Steuerung erfolgt starr
          nach Plan – nicht nach Tagesform, Schlaf oder HRV.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Synergy Athlete: der Spieltag ist der Fixpunkt
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Der Unterschied dieses Ansatzes liegt nicht in einer neuen Übungsauswahl, sondern in der
          Reihenfolge der Planung. Zuerst stehen Spieltag und Mannschaftstraining fest, danach
          werden die drei Gym-Einheiten so verteilt, dass schwere Beinarbeit außerhalb des
          48-Stunden-Fensters vor dem Spiel liegt. Konkret bedeutet das:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Spieltag-Sperre:</strong> Leg Day wird automatisch verschoben, wenn er zu nah am
            Anpfiff liegt.
          </li>
          <li>
            <strong>Matchday-Plan:</strong> Countdown mit Mahlzeiten- und Trinkplan, synchron zur
            Anstoßzeit.
          </li>
          <li>
            <strong>Ernährung folgt dem Plan:</strong> Kohlenhydrate und Kalorien ändern sich, sobald
            im Wochenplan Gym oder Spiel steht.
          </li>
          <li>
            <strong>Belastungssteuerung:</strong> Recovery-Score aus Schlaf, HRV und Muskelkater;
            Deload-Warnung bei ungünstigem ACWR.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">Welches Programm für welches Ziel?</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>Marathon plus Muskelmasse:</strong> Nick-Bare-Stil, wenn du 8+ Einheiten pro
            Woche unterbringst.
          </li>
          <li>
            <strong>Maximalkraft plus Arbeitskapazität:</strong> Hybrid Performance Method.
          </li>
          <li>
            <strong>Unplanbare Wochen, Grundkraft erhalten:</strong> Tactical Barbell.
          </li>
          <li>
            <strong>Wettkampfsport am Wochenende plus 3× Gym:</strong> Synergy Athlete – weil Spiel-
            und Regenerationsfenster den Plan bestimmen, nicht umgekehrt.
          </li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold">Häufige Fragen</h2>
        <h3 className="mt-6 font-display text-lg font-semibold">
          Wie viele Einheiten pro Woche sind realistisch?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Drei Krafteinheiten plus zwei bis vier Sport- oder Ausdauereinheiten reichen für die
          meisten Amateure. Wichtiger als die Zahl ist der Abstand: harte Reize brauchen 24 bis 48
          Stunden Abstand zueinander.
        </p>
        <h3 className="mt-6 font-display text-lg font-semibold">
          Kann man Kraft und Ausdauer gleichzeitig aufbauen?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Ja – solange der Großteil der Ausdauer in Zone 2 liegt, das Krafttraining schwer und kurz
          bleibt und die Kohlenhydratzufuhr an Doppeltagen steigt. Interferenz entsteht vor allem
          durch harte Läufe direkt um den Leg Day herum.
        </p>
        <h3 className="mt-6 font-display text-lg font-semibold">
          Braucht es überhaupt ein fertiges Programm?
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Ein statisches PDF passt selten zu einer Saison mit Spielverlegungen, Krankheit und
          Urlaub. Sinnvoller ist ein Plan, der sich an Termine und Tagesform anpasst – genau dort
          scheitern die meisten Kaufprogramme.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-elevated p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Der Hybrid Athlete Planer baut deinen Wochenplan um Spieltag und Mannschaftstraining
            herum – inklusive Recovery-Score, Deload-Warnung und passender Ernährung pro Tag.
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
