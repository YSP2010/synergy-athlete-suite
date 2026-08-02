import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toISODate } from "@/lib/dates";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckinTrend } from "@/components/checkin/CheckinTrend";
import { humanError } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/checkin")({
  head: () => ({
    meta: [
      { title: "Daily Check-in – Hybrid Athlete" },
      { name: "description", content: "Schlaf, Muskelkater, Stress und Energie erfassen – Basis für deinen Recovery-Score." },
      { property: "og:title", content: "Daily Check-in – Hybrid Athlete" },
      { property: "og:description", content: "Schlaf, Stress und Energie erfassen für deinen Recovery-Score." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/checkin" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Daily Check-in – Hybrid Athlete" },
      { name: "twitter:description", content: "Schlaf, Stress und Energie erfassen für deinen Recovery-Score." },
    ],
  }),
  head: () => ({ meta: [{ title: "Daily Check-in – Hybrid Athlete" }] }),
  component: CheckinPage,
});

const SCALE_LABELS = {
  sleep_quality: ["Miserabel", "Schlecht", "Okay", "Gut", "Top"],
  soreness: ["Keiner", "Leicht", "Deutlich", "Stark", "Extrem"],
  stress: ["Entspannt", "Leicht", "Mittel", "Hoch", "Extrem"],
  mood: ["Schlecht", "Meh", "Okay", "Gut", "Top"],
};

const EMPTY_FORM = {
  weight_kg: "",
  sleep_hours: "8",
  sleep_quality: 3,
  soreness: 2,
  stress: 2,
  mood: 3,
  notes: "",
};

function CheckinPage() {
  const nav = useNavigate();
  const todayIso = toISODate(new Date());
  // Datum des Check-ins – erlaubt das Nachtragen vergangener Tage.
  const [date, setDate] = useState(todayIso);
  const [f, setF] = useState(EMPTY_FORM);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["checkin", date],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("daily_stats")
        .select("*")
        .eq("user_id", u.user.id)
        .eq("date", date)
        .maybeSingle();
      return data;
    },
  });

  // Beim Datumswechsel Formular auf die vorhandenen Werte (oder leer) setzen.
  useEffect(() => {
    if (existing) {
      setF({
        weight_kg: existing.weight_kg?.toString() ?? "",
        sleep_hours: existing.sleep_hours?.toString() ?? "8",
        sleep_quality: existing.sleep_quality ?? 3,
        soreness: existing.soreness ?? 2,
        stress: existing.stress ?? 2,
        mood: existing.mood ?? 3,
        notes: existing.notes ?? "",
      });
    } else {
      setF(EMPTY_FORM);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Nicht angemeldet");
      const payload = {
        user_id: u.user.id,
        date,
        weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
        sleep_hours: Number(f.sleep_hours),
        sleep_quality: f.sleep_quality,
        soreness: f.soreness,
        stress: f.stress,
        mood: f.mood,
        notes: f.notes || null,
      };
      const { error } = await supabase
        .from("daily_stats")
        .upsert(payload, { onConflict: "user_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in gespeichert");
      nav({ to: "/dashboard" });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Daily Check-in</h1>
        <p className="text-sm text-muted-foreground">
          {date === todayIso ? "Wie fühlst du dich heute?" : "Vergangenen Tag nachtragen."}
        </p>
      </div>

      <div className="card-elevated p-4">
        <Label htmlFor="checkin-date">Datum</Label>
        <Input
          id="checkin-date"
          type="date"
          max={todayIso}
          value={date}
          onChange={(e) => setDate(e.target.value || todayIso)}
          className="mt-1"
        />
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Lade…</div>
      ) : (
        <div className="card-elevated space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gewicht (kg)</Label>
              <Input
                type="number"
                step="0.1"
                value={f.weight_kg}
                onChange={(e) => setF({ ...f, weight_kg: e.target.value })}
              />
            </div>
            <div>
              <Label>Schlaf (Stunden)</Label>
              <Input
                type="number"
                step="0.25"
                value={f.sleep_hours}
                onChange={(e) => setF({ ...f, sleep_hours: e.target.value })}
              />
            </div>
          </div>

          <ScaleRow
            label="Schlafqualität"
            value={f.sleep_quality}
            onChange={(v) => setF({ ...f, sleep_quality: v })}
            labels={SCALE_LABELS.sleep_quality}
            goodHigh
          />
          <ScaleRow
            label="Muskelkater"
            value={f.soreness}
            onChange={(v) => setF({ ...f, soreness: v })}
            labels={SCALE_LABELS.soreness}
          />
          <ScaleRow
            label="Stress"
            value={f.stress}
            onChange={(v) => setF({ ...f, stress: v })}
            labels={SCALE_LABELS.stress}
          />
          <ScaleRow
            label="Stimmung"
            value={f.mood}
            onChange={(v) => setF({ ...f, mood: v })}
            labels={SCALE_LABELS.mood}
            goodHigh
          />

          <div>
            <Label>Notiz</Label>
            <Textarea
              value={f.notes}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
              placeholder="Wie war der Tag?"
            />
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </div>
      )}

      <CheckinTrend />
    </div>
  );
}

function ScaleRow({
  label,
  value,
  onChange,
  labels,
  goodHigh,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels: string[];
  goodHigh?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{labels[value - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n === value;
          const isGood = goodHigh ? n >= 4 : n <= 2;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "h-11 flex-1 rounded-lg border text-sm font-semibold transition",
                active
                  ? isGood
                    ? "border-success bg-success/20 text-success"
                    : n === 3
                      ? "border-warn bg-warn/15 text-warn"
                      : "border-danger bg-danger/20 text-danger"
                  : "border-border bg-elevated text-muted-foreground",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
