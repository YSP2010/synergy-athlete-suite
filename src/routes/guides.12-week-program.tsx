import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

const URL = "https://synergy-athlete-suite.lovable.app/guides/12-week-program";
const TITLE = "12-Wochen Hybrid Athlete Training Program für Fußballer";
const DESCRIPTION =
  "Periodisiertes 12-Wochen-Programm für Fußballer: Kraft, Hypertrophie und Peaking rund um Spieltage. Wöchentlicher Plan mit Gym- und Platz-Sessions.";

export const Route = createFileRoute("/guides/12-week-program")({
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

function Block({
  weeks,
  phase,
  focus,
  gym,
  pitch,
}: {
  weeks: string;
  phase: string;
  focus: string;
  gym: string;
  pitch: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-5">
      <div className="text-xs uppercase tracking-wide text-neon">{weeks}</div>
      <h2 className="mt-1 font-display text-lg font-semibold">{phase}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{focus}</p>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <div className="font-medium text-foreground">Gym</div>
          <div className="text-muted-foreground">{gym}</div>
        </div>
        <div>
          <div className="font-medium text-foreground">Platz</div>
          <div className="text-muted-foreground">{pitch}</div>
        </div>
      </div>
    </div>
  );
}

function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      <h1 className="mt-6 font-display text-3xl font-bold md:text-4xl">
        12-Wochen Hybrid Athlete Training Program
      </h1>
      <p className="mt-3 text-muted-foreground">
        Ein periodisiertes Programm für Fußballer, die parallel Kraft und Muskulatur aufbauen wollen —
        ohne Leistungseinbruch auf dem Platz. Drei Blöcke à vier Wochen: Basis, Intensivierung, Peaking.
      </p>

      <section className="mt-10 space-y-4">
        <Block
          weeks="Woche 1–4"
          phase="Block 1 · Basis & Kraftaufbau"
          focus="Neuromuskuläre Grundlage, saubere Technik in Kniebeuge / Kreuzheben / Bankdrücken, aerobe Basis."
          gym="3× / Woche Ganzkörper. 4×5 Grundübungen bei 75–80 % 1RM, 3×8 Assistenz."
          pitch="4× / Woche: 2 taktisch, 1 aerob (Dauerlauf 30–40 min), 1 Match."
        />
        <Block
          weeks="Woche 5–8"
          phase="Block 2 · Hypertrophie & Explosivität"
          focus="Muskelquerschnitt in Beinen/Rumpf, Explosivkraft für Sprints und Kopfbälle."
          gym="4× / Woche Upper/Lower + 1 Plyo-Einheit. 4×6 schwer, 3×10 Volumen, 5×3 Sprünge."
          pitch="3× / Woche + Match. Sprint-Intervalle (10× 30 m), Positionsspiele."
        />
        <Block
          weeks="Woche 9–12"
          phase="Block 3 · Peaking & Match-Form"
          focus="Kraft halten bei reduziertem Volumen, maximale Frische an Spieltagen."
          gym="2× / Woche kurz & schwer (3×3 bei 85–90 %). Kein Beintraining 48 h vor Match."
          pitch="Match-fokus: 2 taktisch + 1 Set-Piece + Match. Deload in Woche 12."
        />
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Wöchentliches Rahmenschema</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-elevated text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Tag</th>
                <th className="px-3 py-2">Block 1</th>
                <th className="px-3 py-2">Block 2</th>
                <th className="px-3 py-2">Block 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Mo", "Gym Full-Body", "Gym Lower", "Gym Full-Body (schwer, kurz)"],
                ["Di", "Platz taktisch", "Platz + Sprint", "Platz taktisch"],
                ["Mi", "Ruhe / Mobility", "Gym Upper", "Platz Set-Pieces"],
                ["Do", "Gym Full-Body", "Platz taktisch", "Gym Oberkörper (leicht)"],
                ["Fr", "Platz aerob", "Gym Lower + Plyo", "Aktivierung / Ruhe"],
                ["Sa", "Match", "Match", "Match"],
                ["So", "Regeneration", "Regeneration", "Regeneration"],
              ].map(([d, a, b, c]) => (
                <tr key={d}>
                  <td className="px-3 py-2 font-medium">{d}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a}</td>
                  <td className="px-3 py-2 text-muted-foreground">{b}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="font-display text-2xl font-semibold">Prinzipien</h2>
        <ul className="list-disc pl-5 text-muted-foreground">
          <li>48–72 h zwischen schwerem Beintraining und Match.</li>
          <li>Progression über Blöcke: erst Kraft, dann Volumen, dann Peaking.</li>
          <li>Deload alle 4 Wochen (−40 % Volumen), damit Adaptation greift.</li>
          <li>Ernährung: 1,8–2,2 g Protein/kg, Carbs an Trainings- und Match-Tagen erhöhen.</li>
        </ul>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">
        Passe Volumen und Intensität an deinen Ligakalender an — die drei Blöcke funktionieren auch
        als 3× 4-Wochen-Mesozyklen innerhalb einer Saison.
      </p>
    </div>
  );
}
