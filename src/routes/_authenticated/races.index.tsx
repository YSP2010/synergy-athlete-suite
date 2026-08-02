import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RACE_PRESETS, type RaceType } from "@/lib/triathlon/pacing";
import { humanError } from "@/lib/errors";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/races/")({
  head: () => ({
    meta: [
      { title: "Rennen – Hybrid Athlete" },
      { name: "description", content: "Wettkämpfe planen, Zielzeiten setzen und Ergebnisse verknüpfen." },
      { property: "og:title", content: "Rennen – Hybrid Athlete" },
      { property: "og:description", content: "Wettkämpfe planen und Zielzeiten setzen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RacesPage,
});

const TYPE_KEYS = Object.keys(RACE_PRESETS) as (keyof typeof RACE_PRESETS)[];

function RacesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", race_type: "olympic" as RaceType, race_date: "", priority: "B" });

  const { data: races, isLoading } = useQuery({
    queryKey: ["races"],
    queryFn: async () => {
      const { data, error } = await supabase.from("races").select("*").order("race_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      if (!f.name.trim() || !f.race_date) throw new Error("Name und Datum fehlen");
      const preset = f.race_type !== "custom" ? RACE_PRESETS[f.race_type] : null;
      const { error } = await supabase.from("races").insert({
        user_id: u.user.id,
        name: f.name.trim(),
        race_type: f.race_type,
        race_date: f.race_date,
        priority: f.priority,
        swim_distance_m: preset?.swimM ?? null,
        bike_distance_m: preset?.bikeM ?? null,
        run_distance_m: preset?.runM ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rennen angelegt");
      setOpen(false);
      setF({ name: "", race_type: "olympic", race_date: "", priority: "B" });
      qc.invalidateQueries({ queryKey: ["races"] });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Rennen</h1>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> Neu
        </Button>
      </div>

      {open && (
        <div className="card-elevated space-y-3 p-5">
          <div>
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="z. B. Stadttriathlon" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Distanz</Label>
              <Select value={f.race_type} onValueChange={(v) => setF({ ...f, race_type: v as RaceType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {RACE_PRESETS[k].label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Eigene Distanz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum</Label>
              <Input type="date" value={f.race_date} onChange={(e) => setF({ ...f, race_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Priorität</Label>
            <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A – Saisonhöhepunkt</SelectItem>
                <SelectItem value="B">B – wichtig</SelectItem>
                <SelectItem value="C">C – Trainingswettkampf</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
            Rennen speichern
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !races?.length ? (
        <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
          Noch keine Rennen geplant. Leg deinen nächsten Wettkampf an, dann bekommst du Zielzeiten,
          Pacing-Plan und einen Taper-Vorschlag.
        </div>
      ) : (
        <div className="space-y-2">
          {races.map((r) => {
            const days = Math.ceil((Date.parse(`${r.race_date}T00:00:00Z`) - Date.now()) / 86_400_000);
            return (
              <Link
                key={r.id}
                to="/races/$id"
                params={{ id: r.id }}
                className="card-elevated flex items-center gap-3 p-4 hover:bg-elevated"
              >
                <CalendarDays className="h-5 w-5 text-neon" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(`${r.race_date}T00:00:00Z`).toLocaleDateString("de-DE")} ·{" "}
                    {r.race_type !== "custom"
                      ? RACE_PRESETS[r.race_type as keyof typeof RACE_PRESETS]?.label ?? r.race_type
                      : "Eigene Distanz"}
                  </div>
                </div>
                <Badge variant={r.priority === "A" ? "default" : "outline"}>{r.priority}</Badge>
                {days >= 0 && <span className="text-xs text-muted-foreground">in {days} T</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
