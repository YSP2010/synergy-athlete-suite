import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { zipSync, strToU8 } from "fflate";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount, exportMyData, exportMyTracks } from "@/lib/privacy.functions";
import { humanError } from "@/lib/errors";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/privacy")({
  head: () => ({
    meta: [
      { title: "Datenschutz – Hybrid Athlete" },
      { name: "description", content: "Datenfreigaben steuern, Daten exportieren oder Konto vollständig löschen." },
      { property: "og:title", content: "Datenschutz – Hybrid Athlete" },
      { property: "og:description", content: "Datenfreigaben steuern, exportieren oder löschen." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/privacy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Datenschutz – Hybrid Athlete" },
      { name: "twitter:description", content: "Datenfreigaben steuern, exportieren oder löschen." },
    ],
  }),
  component: PrivacyPage,
});

interface TrackRow {
  activity_id: string;
  points: unknown;
}

/** Baut aus einem gespeicherten Track eine GPX-Datei. */
function toGpx(activityId: string, points: unknown): string {
  const list = Array.isArray(points) ? (points as { lat?: number; lng?: number; ele?: number }[]) : [];
  const pts = list
    .filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number")
    .map((p) => `<trkpt lat="${p.lat}" lon="${p.lng}">${p.ele != null ? `<ele>${p.ele}</ele>` : ""}</trkpt>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Hybrid Athlete" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${activityId}</name><trkseg>
${pts}
  </trkseg></trk>
</gpx>`;
}

function PrivacyPage() {
  const nav = useNavigate();
  const runExport = useServerFn(exportMyData);
  const runTracks = useServerFn(exportMyTracks);
  const runDelete = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");

  const doExport = useMutation({
    mutationFn: async () => {
      const [main, tracks] = await Promise.all([runExport({ data: undefined }), runTracks({ data: undefined })]);
      const files: Record<string, Uint8Array> = {
        "daten.json": strToU8(JSON.stringify(JSON.parse(main.tablesJson), null, 2)),
        "export-info.txt": strToU8(
          `Export erstellt am ${new Date(main.exportedAt).toLocaleString("de-DE")}\nEnthält alle in Hybrid Athlete zu deinem Konto gespeicherten Daten.`,
        ),
      };
      const trackRows = JSON.parse(tracks.tracksJson) as TrackRow[];
      for (const t of trackRows) {
        files[`gpx/${t.activity_id}.gpx`] = strToU8(toGpx(t.activity_id, t.points));
      }
      const zipped = zipSync(files, { level: 6 });
      const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hybrid-athlete-export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success("Export heruntergeladen"),
    onError: (e) => toast.error(humanError(e)),
  });

  const doDelete = useMutation({
    mutationFn: async () => await runDelete({ data: { confirm } }),
    onSuccess: async () => {
      await supabase.auth.signOut();
      toast.success("Konto gelöscht");
      nav({ to: "/auth", replace: true });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <h1 className="font-display text-3xl font-bold">Datenschutz</h1>

      <section className="card-elevated space-y-3 p-5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="h-5 w-5 text-neon" />
          <h2 className="font-display text-lg font-semibold">Welche Daten wir speichern</h2>
        </div>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Aus deinem Garmin-Export:</strong> Aktivitäten, Runden, GPS-Verlauf (ausgedünnt), Schlaf,
            HRV, Ruhepuls, Body Battery. Quelle sind ausschließlich die Dateien, die du selbst hochlädst.
          </li>
          <li>
            <strong>Von dir eingetragen:</strong> Check-ins, Gym- und Sport-Einheiten, Mahlzeiten, Tagebuch,
            Rennen und Ausrüstung.
          </li>
          <li>
            <strong>Berechnet:</strong> Recovery-Score, Belastung (CTL/ATL/Form), Zonen, Bestleistungen,
            Ernährungsziele.
          </li>
        </ul>
        <p>
          Gesundheitsdaten wie Schlaf und HRV werden nur für deine eigene Auswertung genutzt. Trainer sehen
          Training und Belastung ihrer Athleten, aber niemals Tagebuch, Mahlzeiten oder Food-Scans. In der
          Bestenliste erscheinst du nur nach ausdrücklicher Zustimmung – Gesundheitskategorien brauchen eine
          zweite, getrennte Einwilligung.
        </p>
        <p>
          Deine Daten bleiben gespeichert, bis du sie löschst. Rohdateien aus dem Import liegen in einem
          privaten Speicher, auf den nur dein Konto Zugriff hat. Einstellbar unter{" "}
          <Link to="/settings" className="text-neon underline">
            Einstellungen
          </Link>
          .
        </p>
      </section>

      <section className="card-elevated space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Datenexport</h2>
        <p className="text-sm text-muted-foreground">
          Alles als ZIP: eine JSON-Datei mit sämtlichen Tabellen und je Aktivität eine GPX-Datei.
        </p>
        <Button className="w-full" onClick={() => doExport.mutate()} disabled={doExport.isPending}>
          {doExport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export erstellen
        </Button>
      </section>

      <section className="card-elevated space-y-3 border-danger/30 p-5">
        <h2 className="font-display text-lg font-semibold text-danger">Konto löschen</h2>
        <p className="text-sm text-muted-foreground">
          Löscht dein Konto mit allen Aktivitäten, Gesundheitsdaten, Bestenlisten-Einträgen und den
          hochgeladenen Rohdateien. Das lässt sich nicht rückgängig machen.
        </p>
        <div>
          <Label>Zum Bestätigen „LÖSCHEN" eintippen</Label>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="LÖSCHEN" />
        </div>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => doDelete.mutate()}
          disabled={doDelete.isPending || confirm !== "LÖSCHEN"}
        >
          {doDelete.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Konto endgültig löschen
        </Button>
      </section>
    </div>
  );
}
