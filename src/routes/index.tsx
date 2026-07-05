import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Zap, CalendarDays, HeartPulse, Utensils, Camera, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const APP_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Hybrid Athlete Performance Planner",
  description:
    "Trainingsplaner für Hybrid-Athleten, die Fußball und Krafttraining kombinieren. Dynamische Wochenplanung, Recovery-Score, Makro-Berechnung und KI-Food-Scanner.",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
};

export const Route = createFileRoute("/")({
  // Eingeloggte Nutzer serverseitig direkt ins Dashboard leiten.
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Hybrid Athlete – Fußball + Gym Trainingsplaner" },
      {
        name: "description",
        content:
          "Fußball und Krafttraining smart kombinieren: Wochenplan, Recovery-Score, Makros und KI-Food-Scanner.",
      },
      { property: "og:title", content: "Hybrid Athlete – Fußball + Gym Trainingsplaner" },
      {
        property: "og:description",
        content:
          "Wochenplan, Recovery-Score, Makros und KI-Food-Scanner für Hybrid-Athlet:innen.",
      },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/" },
      { name: "twitter:title", content: "Hybrid Athlete – Fußball + Gym Trainingsplaner" },
      {
        name: "twitter:description",
        content:
          "Wochenplan, Recovery-Score, Makros und KI-Food-Scanner für Hybrid-Athlet:innen.",
      },
    ],
    links: [{ rel: "canonical", href: "https://synergy-athlete-suite.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(APP_JSON_LD),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-neon text-neon-foreground font-display text-lg font-bold glow">
            H
          </div>
          <span className="font-display text-lg font-semibold">Hybrid Athlete</span>
        </div>
        <Link
          to="/auth"
          className="rounded-lg bg-neon px-4 py-2 text-sm font-medium text-neon-foreground transition hover:bg-neon/90"
        >
          Anmelden
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pt-10 pb-16 text-center md:pt-16">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-neon text-neon-foreground glow">
            <Zap className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">
            Trainingsplaner für Hybrid-Athleten – Fußball + Gym
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Wer gleichzeitig Fußball spielt und im Gym Kraft aufbaut, jongliert Spieltage, Beintage,
            Regeneration und Ernährung. Der Hybrid Athlete Performance Planner bringt all das in einen
            intelligenten Wochenplan – damit du hart trainierst, ohne am Spieltag platt zu sein.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className="rounded-lg bg-neon px-6 py-3 text-sm font-semibold text-neon-foreground transition hover:bg-neon/90 glow"
            >
              Kostenlos starten
            </Link>
            <Link
              to="/guides/hybrid-training-splits"
              className="rounded-lg border border-border bg-elevated px-6 py-3 text-sm font-semibold text-foreground transition hover:border-neon/40"
            >
              Trainings-Ratgeber lesen
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <h2 className="mb-3 font-display text-2xl font-bold">
            Fußball und Krafttraining clever verbinden
          </h2>
          <p className="mb-8 max-w-3xl text-sm text-muted-foreground">
            Ein reiner Gym-Plan ignoriert deine Spieltage, ein reiner Fußball-Plan lässt Muskelaufbau
            liegen. Wir kombinieren beides: Der Planer verteilt Push-, Pull- und Beintage automatisch so
            um deine Matches herum, dass deine Beine am Spieltag frisch sind. Harte Einheiten werden vor
            wichtigen Spielen zurückgefahren, Regenerationstage dann eingeplant, wenn dein Körper sie
            wirklich braucht.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={CalendarDays}
              title="Dynamische Wochenplanung"
              text="Push/Pull/Legs rund um deine Spieltage – mit der 48-Stunden-Regel, die kein Beintraining direkt vor ein hartes Match legt."
            />
            <Feature
              icon={HeartPulse}
              title="Recovery-Score"
              text="Schlaf, Muskelkater, Stress und Trainingslast fließen in einen Score. Bei niedrigem Wert ersetzt der Plan die nächste harte Einheit durch Active Recovery."
            />
            <Feature
              icon={Utensils}
              title="Makro-Berechnung"
              text="Kalorien und Makros pro Tag – inklusive Carbo-Loading vor harten Spielen mit bis zu 7,5 g Kohlenhydraten pro Kilo Körpergewicht."
            />
            <Feature
              icon={Camera}
              title="KI-Food-Scanner"
              text="Foto der Mahlzeit machen, KI schätzt Kalorien, Makros und wie gut das Essen zu deinem Tagesziel passt."
            />
            <Feature
              icon={Users}
              title="Team & Coach"
              text="Trainer laden Athleten ein, sehen Trainings- und Recovery-Daten und tauschen sich im Team-Chat aus."
            />
            <Feature
              icon={Zap}
              title="Ein System statt fünf Apps"
              text="Plan, Check-in, Gym-Log, Sport-Log, Ernährung und Tagebuch greifen ineinander – keine Zettelwirtschaft mehr."
            />
          </div>
        </section>

        {/* Why */}
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <h2 className="mb-3 font-display text-2xl font-bold">Warum Recovery über den Trainingsplan entscheidet</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Muskeln wachsen nicht im Training, sondern in der Erholung. Für Hybrid-Athleten ist das
            besonders heikel: Ein intensives Beintraining am Freitag und ein hartes Spiel am Sonntag
            überlagern sich – die Beine sind noch nicht regeneriert, das Verletzungsrisiko steigt und die
            Leistung sinkt. Deshalb bewertet der Planer deinen Recovery-Status täglich anhand von
            Schlafdauer, Schlafqualität, Muskelkater, Stress und der Trainingslast der letzten 72 Stunden.
            Ist der Score niedrig, schlägt die App aktiv vor, die nächste harte Einheit gegen leichte
            Mobility-Arbeit zu tauschen. So trainierst du periodisiert statt permanent im roten Bereich –
            und kommst ausgeruht in dein nächstes Spiel.
          </p>
        </section>

        {/* Nutrition */}
        <section className="mx-auto max-w-5xl px-4 pb-16">
          <h2 className="mb-3 font-display text-2xl font-bold">Ernährung, die zum Spieltag passt</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            An einem lockeren Ruhetag brauchst du andere Kohlenhydratmengen als am Tag vor einem harten
            Match. Der Planer berechnet deinen Kalorienbedarf über die Mifflin-St-Jeor-Formel, passt den
            Aktivitätsfaktor an dein tatsächliches Tagestraining an und hebt vor harten Spielen die
            Kohlenhydrate auf bis zu 7,5 g pro Kilogramm Körpergewicht an (Carbo-Loading), während Fett
            leicht reduziert wird. Protein bleibt konstant hoch bei rund 2 g pro Kilo, um deine Muskulatur
            zwischen den Belastungen zu schützen. Mit dem KI-Food-Scanner trackst du Mahlzeiten in Sekunden
            und siehst sofort, ob sie zu deinem Tagesziel passen.
          </p>
          <div className="mt-8">
            <Link
              to="/auth"
              className="inline-flex rounded-lg bg-neon px-6 py-3 text-sm font-semibold text-neon-foreground transition hover:bg-neon/90 glow"
            >
              Jetzt kostenlos loslegen
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Hybrid Athlete Performance Planner</span>
          <div className="flex gap-4">
            <Link to="/guides/hybrid-training-splits" className="hover:text-foreground">
              Ratgeber
            </Link>
            <Link to="/auth" className="hover:text-foreground">
              Anmelden
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Zap;
  title: string;
  text: string;
}) {
  return (
    <div className="card-elevated p-5">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-neon-soft text-neon">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
