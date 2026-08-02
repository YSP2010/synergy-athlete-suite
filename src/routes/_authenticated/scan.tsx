import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFoodScan } from "@/lib/scan.functions";
import { Button } from "@/components/ui/button";
import { toISODate } from "@/lib/dates";
import { sportName, type Goal } from "@/lib/planner";
import { toast } from "sonner";
import { humanError } from "@/lib/errors";
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  Trash2,
  Check,
  Flame,
  Trophy,
  History as HistoryIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Food-Scanner – Hybrid Athlete" },
      { name: "description", content: "Mahlzeit fotografieren und Kalorien sowie Makros per KI schätzen lassen." },
      { property: "og:title", content: "Food-Scanner – Hybrid Athlete" },
      { property: "og:description", content: "Mahlzeit fotografieren, Makros per KI schätzen." },
      { property: "og:url", content: "https://synergy-athlete-suite.lovable.app/scan" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Food-Scanner – Hybrid Athlete" },
      { name: "twitter:description", content: "Mahlzeit fotografieren, Makros per KI schätzen." },
    ],
  }),
  component: ScanPage,
});

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Frühstück",
  lunch: "Mittagessen",
  dinner: "Abendessen",
  snack: "Snack",
};

/** Sinnvoller Default nach Tageszeit – vom Nutzer im Select überschreibbar. */
function defaultMeal(): MealType {
  const hour = new Date().getHours();
  return hour < 10 ? "breakfast" : hour < 14 ? "lunch" : hour < 18 ? "snack" : "dinner";
}

const GOAL_LABELS: Record<Goal, string> = {
  muscle_gain: "Muskelaufbau",
  maintain: "Erhalten",
  recomp: "Recomp",
  performance: "Leistung",
};

/** Kurzer Kontext-String (Ziel + Sportart) fuers Scanner-Prompt. Max 500 Zeichen. */
function buildGoalContext(
  profile: { goal?: Goal | null; sport?: string | null } | null | undefined,
): string | undefined {
  if (!profile) return undefined;
  const parts: string[] = [];
  if (profile.goal && GOAL_LABELS[profile.goal]) parts.push(`Ziel: ${GOAL_LABELS[profile.goal]}.`);
  if (profile.sport) parts.push(`Sportart: ${sportName(profile.sport)}.`);
  if (!parts.length) return undefined;
  return parts.join(" ").slice(0, 500);
}

interface Extracted {
  name: string;
  portion_desc: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  health_score: number;
  plan_fit_score: number;
  reasoning: string;
  tags: string[];
}

interface ScanRow {
  id: string;
  image_path: string | null;
  product_name: string | null;
  health_score: number | null;
  plan_fit_score: number | null;
  reasoning: string | null;
  extracted: Extracted | null;
  created_at: string;
}

function ScanPage() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const analyze = useServerFn(analyzeFoodScan);

  const { data: history } = useQuery({
    queryKey: ["scans"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { data, error } = await supabase
        .from("food_scans")
        .select(
          "id,image_path,product_name,health_score,plan_fit_score,reasoning,extracted,created_at",
        )
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ScanRow[];
    },
  });

  // Profil (Ziel + Sportart) fuer den goalContext im Scanner-Prompt.
  const { data: profile } = useQuery({
    queryKey: ["scan-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("goal, sport")
        .eq("id", u.user.id)
        .maybeSingle();
      return data as { goal: Goal | null; sport: string | null } | null;
    },
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; extracted: Extracted } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  // Mahlzeit vorbelegen nach Tageszeit, aber vom Nutzer überschreibbar.
  const [meal, setMeal] = useState<MealType>(defaultMeal());

  // Object-URL der Bildvorschau beim Wechsel/Unmount wieder freigeben,
  // um Speicherlecks im Browser zu vermeiden.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function onFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte ein Bild wählen.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Max 8 MB.");
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("food-scans").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (up.error) throw up.error;
      setUploadedPath(path);
      setPreviewUrl(URL.createObjectURL(file));
      toast.success("Bild hochgeladen. Jetzt analysieren.");
    } catch (e) {
      toast.error(humanError(e));
    } finally {
      setUploading(false);
    }
  }

  async function runAnalyze() {
    if (!uploadedPath) return;
    setAnalyzing(true);
    try {
      const goalContext = buildGoalContext(profile);
      const res = await analyze({ data: { imagePath: uploadedPath, goalContext } });
      setResult(res);
      qc.invalidateQueries({ queryKey: ["scans"] });
      toast.success("Analyse fertig");
    } catch (e) {
      toast.error(humanError(e));
    } finally {
      setAnalyzing(false);
    }
  }

  const addToLog = useMutation({
    mutationFn: async () => {
      if (!result) return;
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const today = toISODate(new Date());
      const { error } = await supabase.from("nutrition_logs").insert({
        user_id: u.user.id,
        date: today,
        meal,
        name: result.extracted.name,
        kcal: result.extracted.kcal,
        protein_g: result.extracted.protein_g,
        carbs_g: result.extracted.carbs_g,
        fat_g: result.extracted.fat_g,
        source: "scan",
        scan_id: result.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nutrition"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Zur heutigen Ernährung hinzugefügt");
      nav({ to: "/nutrition" });
    },
    onError: (e: Error) => toast.error(humanError(e)),
  });

  const reset = () => {
    setPreviewUrl(null);
    setUploadedPath(null);
    setResult(null);
  };

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Food-Scanner</h1>
        <p className="text-sm text-muted-foreground">
          Foto machen → KI schätzt Makros, Health-Score & Passung zum Tagesziel.
        </p>
      </div>

      {!previewUrl && (
        <div className="grid gap-3 sm:grid-cols-2">
          <UploadCard
            label="Foto aufnehmen"
            icon={Camera}
            capture
            onFile={onFile}
            disabled={uploading}
          />
          <UploadCard label="Bild hochladen" icon={Upload} onFile={onFile} disabled={uploading} />
        </div>
      )}

      {previewUrl && (
        <div className="card-elevated space-y-3 p-3">
          <div className="relative overflow-hidden rounded-lg bg-elevated">
            <img
              src={previewUrl}
              alt="Scan Vorschau"
              className="mx-auto max-h-72 w-full object-contain"
            />
          </div>

          {!result ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={runAnalyze}
                disabled={analyzing}
                className="flex-1 bg-neon text-neon-foreground hover:bg-neon/90 glow"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Analysiere…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1 h-4 w-4" /> Mit KI analysieren
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={reset}
                disabled={analyzing}
                aria-label="Bild verwerfen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <ResultCard
              ex={result.extracted}
              meal={meal}
              onMealChange={setMeal}
              onAdd={() => addToLog.mutate()}
              onReset={reset}
              adding={addToLog.isPending}
            />
          )}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <HistoryIcon className="h-3.5 w-3.5" /> Letzte Scans
        </div>
        {!history?.length ? (
          <div className="card-elevated p-6 text-center text-sm text-muted-foreground">
            Noch keine Scans.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((s) => (
              <div key={s.id} className="card-elevated flex items-start gap-3 p-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-neon-soft text-neon">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-semibold">{s.product_name}</div>
                  {s.extracted && (
                    <div className="text-[11px] text-muted-foreground tabular">
                      {s.extracted.kcal} kcal · P {s.extracted.protein_g}g · C {s.extracted.carbs_g}
                      g · F {s.extracted.fat_g}g
                    </div>
                  )}
                  {s.reasoning && (
                    <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {s.reasoning}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-[10px]">
                  <ScoreBadge label="Health" v={s.health_score} icon={Trophy} />
                  <ScoreBadge label="Plan" v={s.plan_fit_score} icon={Flame} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadCard({
  label,
  icon: Icon,
  onFile,
  capture,
  disabled,
}: {
  label: string;
  icon: typeof Camera;
  onFile: (f: File) => void;
  capture?: boolean;
  disabled?: boolean;
}) {
  return (
    <label
      className={
        "card-elevated flex cursor-pointer flex-col items-center justify-center gap-2 p-8 text-center transition hover:border-neon/40 " +
        (disabled ? "pointer-events-none opacity-60" : "")
      }
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-neon-soft text-neon">
        <Icon className="h-6 w-6" />
      </div>
      <div className="font-display text-sm font-semibold">{label}</div>
      <div className="text-[11px] text-muted-foreground">JPG/PNG, max 8 MB</div>
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: "environment" as const } : {})}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function ResultCard({
  ex,
  meal,
  onMealChange,
  onAdd,
  onReset,
  adding,
}: {
  ex: Extracted;
  meal: MealType;
  onMealChange: (m: MealType) => void;
  onAdd: () => void;
  onReset: () => void;
  adding: boolean;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="font-display text-lg font-semibold">{ex.name}</div>
        {ex.portion_desc && <div className="text-xs text-muted-foreground">{ex.portion_desc}</div>}
      </div>

      <div>
        <label
          htmlFor="meal-select"
          className="mb-1 block text-[10px] uppercase tracking-widest text-muted-foreground"
        >
          Mahlzeit
        </label>
        <select
          id="meal-select"
          value={meal}
          onChange={(e) => onMealChange(e.target.value as MealType)}
          className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
            <option key={m} value={m}>
              {MEAL_LABELS[m]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Kcal" value={String(ex.kcal)} />
        <Stat label="P" value={`${ex.protein_g}g`} />
        <Stat label="C" value={`${ex.carbs_g}g`} />
        <Stat label="F" value={`${ex.fat_g}g`} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ScoreBar label="Health-Score" v={ex.health_score} />
        <ScoreBar label="Plan-Fit" v={ex.plan_fit_score} />
      </div>

      {ex.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ex.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {ex.reasoning && (
        <div className="rounded-lg bg-elevated p-2.5 text-xs text-muted-foreground">
          {ex.reasoning}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onAdd}
          disabled={adding}
          className="flex-1 bg-neon text-neon-foreground hover:bg-neon/90 glow"
        >
          <Check className="mr-1 h-4 w-4" /> In Ernährung übernehmen
        </Button>
        <Button variant="secondary" onClick={onReset}>
          Neu
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-elevated p-2 text-center">
      <div className="font-display text-sm font-semibold tabular">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ScoreBar({ label, v }: { label: string; v: number }) {
  const pct = Math.round((v / 10) * 100);
  const color = v >= 7 ? "bg-neon" : v >= 4 ? "bg-warn" : "bg-danger";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase text-muted-foreground">
        <span>{label}</span>
        <span className="tabular text-foreground">{v.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
        <div className={"h-full " + color} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ScoreBadge({
  label,
  v,
  icon: Icon,
}: {
  label: string;
  v: number | null;
  icon: typeof Trophy;
}) {
  if (v === null) return null;
  const color = v >= 7 ? "text-neon" : v >= 4 ? "text-warn" : "text-danger";
  return (
    <span className={"flex items-center gap-1 tabular " + color}>
      <Icon className="h-3 w-3" />
      {label} {Number(v).toFixed(1)}
    </span>
  );
}
