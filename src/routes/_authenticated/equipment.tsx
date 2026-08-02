import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, Bike, Footprints, Loader2, Plus, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { humanError } from "@/lib/errors";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipment")({
  head: () => ({
    meta: [
      { title: "Ausrüstung – Hybrid Athlete" },
      { name: "description", content: "Laufschuhe, Räder und Neoprenanzüge mit Kilometerstand und Verschleißwarnung." },
      { property: "og:title", content: "Ausrüstung – Hybrid Athlete" },
      { property: "og:description", content: "Kilometerstand und Verschleiß deiner Ausrüstung im Blick." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EquipmentPage,
});

const TYPES = [
  { key: "shoes", label: "Laufschuhe", icon: Footprints, defaultRetireKm: 700 },
  { key: "bike", label: "Rad", icon: Bike, defaultRetireKm: 20000 },
  { key: "wetsuit", label: "Neoprenanzug", icon: Waves, defaultRetireKm: 0 },
];

function EquipmentPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", type: "shoes", brand: "", retireKm: "700" });

  const { data: items, isLoading } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      if (!f.name.trim()) throw new Error("Name fehlt");
      const km = Number(f.retireKm);
      const { error } = await supabase.from("equipment").insert({
        user_id: u.user.id,
        name: f.name.trim(),
        type: f.type,
        brand: f.brand.trim() || null,
        retire_at_distance_m: Number.isFinite(km) && km > 0 ? km * 1000 : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ausrüstung angelegt");
      setOpen(false);
      setF({ name: "", type: "shoes", brand: "", retireKm: "700" });
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  const retire = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").update({ retired: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ausgemustert");
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (e) => toast.error(humanError(e)),
  });

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Ausrüstung</h1>
        <Button size="sm" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> Neu
        </Button>
      </div>

      {open && (
        <div className="card-elevated space-y-3 p-5">
          <div>
            <Label>Name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="z. B. Pegasus 41" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Typ</Label>
              <Select
                value={f.type}
                onValueChange={(v) => {
                  const t = TYPES.find((x) => x.key === v);
                  setF({ ...f, type: v, retireKm: t?.defaultRetireKm ? String(t.defaultRetireKm) : "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marke</Label>
              <Input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />
            </div>
            <div>
              <Label>Verschleißgrenze (km)</Label>
              <Input
                type="number"
                min={0}
                value={f.retireKm}
                onChange={(e) => setF({ ...f, retireKm: e.target.value })}
              />
            </div>
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>
            Speichern
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !items?.length ? (
        <div className="card-elevated p-8 text-center text-sm text-muted-foreground">
          Noch keine Ausrüstung. Leg deine Laufschuhe an, dann zählen wir die Kilometer mit und melden uns
          rechtzeitig vor dem Verschleiß.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const km = Number(it.total_distance_m ?? 0) / 1000;
            const limit = it.retire_at_distance_m ? Number(it.retire_at_distance_m) / 1000 : null;
            const pct = limit ? Math.min(100, (km / limit) * 100) : null;
            const worn = pct != null && pct >= 90;
            const Icon = TYPES.find((t) => t.key === it.type)?.icon ?? Footprints;
            return (
              <div key={it.id} className="card-elevated space-y-2 p-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-neon" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {it.name} {it.retired && <span className="text-xs text-muted-foreground">(ausgemustert)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {it.brand ? `${it.brand} · ` : ""}
                      {km.toFixed(0)} km{limit ? ` von ${limit.toFixed(0)} km` : ""}
                    </div>
                  </div>
                  {!it.retired && (
                    <Button variant="ghost" size="sm" onClick={() => retire.mutate(it.id)}>
                      Ausmustern
                    </Button>
                  )}
                </div>
                {pct != null && <Progress value={pct} />}
                {worn && !it.retired && (
                  <p className="flex items-center gap-1.5 text-xs text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" /> Verschleißgrenze fast erreicht – Zeit für Ersatz.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
