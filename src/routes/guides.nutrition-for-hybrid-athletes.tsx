import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/guides/nutrition-for-hybrid-athletes")({
  head: () => ({
    meta: [
      {
        title: "Ernährung für Hybrid-Athleten: Kalorien, Protein & Carbo-Loading für Fußball + Gym",
      },
      {
        name: "description",
        content:
          "Wie viel sollten Fußballer essen, die zusätzlich Kraft aufbauen? Kalorienbedarf nach Mifflin-St-Jeor, 2 g Protein pro kg, Carbo-Loading mit 7,5 g/kg und Meal-Timing rund um Spieltage.",
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
          Ernährung für Hybrid-Athleten: Kalorien, Protein &amp; Carbo-Loading für Fußball + Gym
        </h1>
        <p className="mt-5 text-base text-muted-foreground">
          Wer Fußball spielt und gleichzeitig im Gym Muskeln aufbaut, hat einen Energiebedarf, der
          mit Standard-Ernährungsplänen nicht abgedeckt ist. Ein hartes Spiel verbrennt so viel wie
          ein langes Ausdauertraining, ein schwerer Beintag kommt obendrauf – und beides will
          versorgt werden, ohne dass du zunimmst, wo du nicht willst, oder am Spieltag leer
          aufläufst. Dieser Ratgeber zeigt, wie du deinen Bedarf berechnest, Protein und
          Kohlenhydrate richtig dosierst und deine Mahlzeiten um Training und Spiele herum planst –
          mit genau den Formeln, mit denen auch der Makro-Rechner der App arbeitet.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Dein Kalorienbedarf: Grundumsatz plus Trainingsalltag
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Ausgangspunkt ist der Grundumsatz nach der Mifflin-St-Jeor-Formel: 10 × Körpergewicht (kg)
          + 6,25 × Größe (cm) − 5 × Alter (Jahre), plus 5 für Männer bzw. minus 161 für Frauen. Ein
          25-jähriger Mann mit 75 kg und 178 cm landet so bei rund 1.750 kcal – das ist aber nur der
          Ruhewert. Darauf kommt ein Aktivitätsfaktor, der mit deinem Tag mitatmet: Die Basis liegt
          bei etwa 1,4 für einen aktiven Alltag. Jede Gym-Einheit hebt den Faktor je nach Härte an
          (ein Bein- oder Ganzkörpertag mehr als eine Mobility-Session), ein Fußballtraining addiert
          je nach Intensität etwa 0,08 bis 0,25 – und ein Spieltag schlägt mit +0,35 zu Buche, nach
          oben gedeckelt bei 2,1. Zum Schluss kommt dein Ziel dazu: Für Muskelaufbau rechnest du
          rund 10 % Überschuss (×1,1), für Performance ein leichtes Plus von 5 %, für Rekomposition
          ein mildes Defizit von etwa 5 % (×0,95). Das Ergebnis: An einem Spieltag mit vollem
          Programm können für denselben Athleten 3.500 kcal und mehr korrekt sein, an einem Ruhetag
          deutlich unter 2.500. Wer jeden Tag gleich isst, isst an den meisten Tagen falsch.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Protein: das Fundament bei doppelter Belastung
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Als Hybrid-Athlet baust du Muskulatur auf und reißt sie gleichzeitig durch Sprints,
          Zweikämpfe und lange Spiele ein. Deshalb ist Protein deine konstanteste Größe: rund 2 g
          pro Kilogramm Körpergewicht, jeden Tag – bei 75 kg also etwa 150 g. Dieser Wert bleibt
          bewusst stabil, auch am Spieltag und im Carbo-Loading, denn er schützt die Muskulatur
          unabhängig davon, wie der Rest des Tellers aussieht. Verteile die Menge auf 3–5 Mahlzeiten
          mit je 25–45 g, statt abends alles nachzuholen. Gute Anker: Eier oder Skyr zum Frühstück,
          eine vollwertige Proteinquelle zu jeder Hauptmahlzeit, ein proteinreicher Snack nach dem
          Training.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Kohlenhydrate und Carbo-Loading vor harten Spielen
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Kohlenhydrate sind bei dieser Doppelbelastung kein Feind, sondern dein Treibstoff. An
          normalen Tagen füllen sie schlicht die Kalorien auf, die nach Protein und Fett (etwa 1 g
          Fett pro kg) übrig bleiben. Vor einem harten Spiel ändert sich das Spiel: Am Vortag und am
          Spieltag selbst lohnt sich gezieltes Carbo-Loading mit bis zu 7,5 g Kohlenhydraten pro
          Kilogramm Körpergewicht – für einen 75-kg-Spieler also gut 560 g. Damit das reinpasst,
          wird Fett vorübergehend auf etwa 0,8 g/kg reduziert, während Protein bei 2 g/kg bleibt.
          Volle Glykogenspeicher sind der Unterschied zwischen &bdquo;läuft bis zur 90.
          Minute&ldquo; und &bdquo;Einbruch nach der Pause&ldquo;. Genau so rechnet der Planer der
          App: Erkennt er ein hartes Match, blendet er am Vortag automatisch den
          Carbo-Loading-Hinweis ein und passt die Makro-Ziele an.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Timing: Wann du isst, ist fast so wichtig wie was
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Vor dem Training (2–3 h): eine vollwertige Mahlzeit mit Carbs und Protein, fett- und
          ballaststoffarm genug, um den Magen nicht zu belasten. 60–90 Minuten vorher reicht ein
          leichter Snack – Banane, Toast mit Honig, Reiswaffeln. Nach dem Training: innerhalb von
          ein bis zwei Stunden Protein (30–45 g) plus Kohlenhydrate, um Regeneration und
          Glykogenaufbau zu starten – besonders wichtig, wenn am nächsten Tag die nächste Einheit
          oder ein Spiel wartet. Am Spieltag: letzte große Mahlzeit 3–4 Stunden vor Anpfiff
          (carblastig, vertraut, nichts Neues ausprobieren), kleiner Snack 60 Minuten vorher, und
          nach dem Abpfiff so bald wie möglich Carbs plus Protein – das Spiel ist die härteste
          Einheit deiner Woche und verdient die konsequenteste Nachbereitung.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Hydration: der unterschätzte Leistungsfaktor
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Schon 2 % Flüssigkeitsverlust kosten messbar Sprintleistung und Konzentration. Als
          Grundlinie gelten etwa 35–40 ml pro kg Körpergewicht am Tag, an Trainings- und Spieltagen
          deutlich mehr. Praktisch: 500 ml in den zwei Stunden vor Anpfiff, in der Halbzeit gezielt
          nachtrinken, und nach intensiven Einheiten das 1,5-Fache des verlorenen Gewichts wieder
          auffüllen. Bei Spielen über 60 Minuten und bei Hitze sind Elektrolyte (v. a. Natrium)
          sinnvoll – ein einfaches Sportgetränk oder eine Prise Salz im Getränk reicht.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Ernährungsstile und Allergien: Der Plan passt sich dir an
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Ob omnivor, vegetarisch, vegan, pescetarisch oder low-carb – die Zielwerte bleiben
          identisch, nur die Quellen ändern sich. Vegetarier und Veganer sollten die 2 g/kg Protein
          bewusster planen (Hülsenfrüchte, Tofu, Tempeh, Seitan, ggf. veganes Proteinpulver) und
          Kalorienlücken über energiedichte Lebensmittel wie Nüsse und Öle schließen. Low-Carb
          funktioniert an ruhigen Tagen, kollidiert aber mit dem Carbo-Loading – vor harten Spielen
          haben Kohlenhydrate Vorrang vor der Ideologie. In der App hinterlegst du deinen
          Ernährungsstil und deine Allergien im Profil; beides fließt in Bewertungen und
          Empfehlungen ein, damit dir kein Plan Lebensmittel vorschlägt, die für dich nicht infrage
          kommen.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">
          Den KI-Food-Scanner sinnvoll nutzen
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Der Food-Scanner schätzt aus einem Foto Kalorien und Makros, vergibt einen Health-Score
          und einen Plan-Fit-Score – also wie gut die Mahlzeit zu deinem heutigen Bedarf und Timing
          passt. Nutze ihn dort, wo er stark ist: bei gemischten Tellern, Kantinenessen und
          unterwegs, wo Abwiegen unrealistisch ist. Fotografiere die ganze Portion von schräg oben
          und übernimm das Ergebnis mit einem Tap ins Ernährungslog. Wichtig: Eine Foto-Schätzung
          ist eine gute Näherung, kein Laborwert – bei abgepackten Lebensmitteln bleibt das Etikett
          genauer. Der Scanner ersetzt kein Tracking-Gewissen, er senkt die Hürde, überhaupt zu
          tracken.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Supplements: weniger ist mehr</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Für Hybrid-Athleten sind genau zwei Basics gut belegt und sinnvoll: Kreatin-Monohydrat
          (3–5 g täglich, unabhängig vom Timing) unterstützt Schnellkraft, Sprintwiederholungen und
          Kraftaufbau. Whey- oder veganes Proteinpulver ist kein Muss, aber der einfachste Weg, die
          2 g/kg an vollen Tagen zu erreichen. Alles darüber hinaus – Booster, exotische Kapseln,
          teure Stacks – ändert wenig, solange Kalorien, Protein, Schlaf und Timing nicht stimmen.
          Supplements ergänzen eine gute Ernährung; sie reparieren keine schlechte.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-elevated p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Lass den Makro-Rechner deinen Kalorienbedarf, dein Carbo-Loading und deine Makro-Ziele
            automatisch für jeden Tag berechnen.
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
