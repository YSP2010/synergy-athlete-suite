import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generatePlan } from "./plan-generator.server";
import type { PlanProfileInput } from "./plan-generator.server";
import type { Experience, PlanContent, PlanStatus, PlanType } from "./plan-types";
import { PLAN_COOLDOWN_DAYS, planTypeStatus } from "./plan-types";

const GeneratePlanInput = z.object({
  type: z.enum(["gym", "sport"]),
  locale: z.enum(["de", "en", "uk"]).optional(),
});

// training_plans ist noch nicht in den generierten Supabase-Typen enthalten
// (Migration training_plans). Bis zur Neugenerierung: gezielt getypter Cast
// (analog ai_tip_log in ai.functions.ts) statt `any`.
interface PlanRow {
  id: string;
  user_id: string;
  type: PlanType;
  goal: string | null;
  weeks: number;
  plan: PlanContent;
  active: boolean;
  created_at: string;
}

interface PlanInsert {
  user_id: string;
  type: PlanType;
  goal: string | null;
  weeks: number;
  plan: PlanContent;
  active: boolean;
}

type PlanQueryResult<T> = Promise<{ data: T; error: { message: string } | null }>;

interface PlanQuery<T> extends PlanQueryResult<T> {
  select: (columns?: string) => PlanQuery<T>;
  eq: (column: string, value: string | boolean) => PlanQuery<T>;
  order: (column: string, options: { ascending: boolean }) => PlanQuery<T>;
  limit: (count: number) => PlanQuery<T>;
  maybeSingle: () => PlanQueryResult<PlanRow | null>;
  single: () => PlanQueryResult<PlanRow>;
}

interface PlanTable {
  select: (columns?: string) => PlanQuery<PlanRow[]>;
  insert: (row: PlanInsert) => PlanQuery<PlanRow[]>;
  update: (row: Partial<PlanRow>) => PlanQuery<PlanRow[]>;
}

interface PlanDb {
  from: (table: "training_plans") => PlanTable;
}

/** profiles-Zeile inkl. experience_level (noch nicht in den generierten Typen). */
type ProfileRow = PlanProfileInput & { id: string };

async function latestPlanAt(db: PlanDb, userId: string, type: PlanType): Promise<string | null> {
  const { data, error } = await db
    .from("training_plans")
    .select("created_at")
    .eq("user_id", userId)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { created_at: string }[];
  return rows.length ? rows[0].created_at : null;
}

/** Cooldown-Status je Plantyp – für die Einstellungen-UI. */
export const getTrainingPlanStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanStatus> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as PlanDb;
    const [gymAt, sportAt] = await Promise.all([
      latestPlanAt(db, userId, "gym"),
      latestPlanAt(db, userId, "sport"),
    ]);
    return {
      gym: planTypeStatus(gymAt),
      sport: planTypeStatus(sportAt),
    };
  });

/** Aktive Pläne des Nutzers (beide Typen) – für Anzeige auf der Plan-Seite. */
export const listTrainingPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const db = supabase as unknown as PlanDb;
    const { data, error } = await db
      .from("training_plans")
      .select("id, type, goal, weeks, plan, created_at")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { plans: (data ?? []) as PlanRow[] };
  });

/**
 * Generiert einen neuen Trainingsplan (Gym oder Sport). Erzwingt die
 * 4-Wochen-Sperre je Typ serverseitig, deaktiviert den bisherigen aktiven Plan
 * desselben Typs und speichert den neuen Plan.
 */
export const generateTrainingPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GeneratePlanInput.parse(input))
  .handler(async ({ data, context }): Promise<{ plan: PlanContent }> => {
    const { supabase, userId } = context;
    const db = supabase as unknown as PlanDb;
    const type = data.type as PlanType;

    // 1) Cooldown prüfen (alle 4 Wochen je Typ)
    const lastAt = await latestPlanAt(db, userId, type);
    const status = planTypeStatus(lastAt);
    if (!status.canGenerate && status.nextAvailableAt) {
      const next = new Date(status.nextAvailableAt).toLocaleDateString("de-DE");
      throw new Error(
        `Neuer ${type === "gym" ? "Gym" : "Sport"}-Plan erst ab ${next} möglich (alle ${PLAN_COOLDOWN_DAYS} Tage).`,
      );
    }

    // 2) Profil laden (inkl. experience_level via Cast)
    const { data: profRaw, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!profRaw)
      throw new Error("Profil nicht gefunden – bitte zuerst das Onboarding abschließen.");
    const prof = profRaw as unknown as ProfileRow;

    const input: PlanProfileInput = {
      sex: prof.sex ?? null,
      height_cm: prof.height_cm ?? null,
      weight_kg: prof.weight_kg ?? null,
      birth_date: prof.birth_date ?? null,
      goal: prof.goal ?? null,
      sport: prof.sport ?? null,
      position: prof.position ?? null,
      gym_days: prof.gym_days ?? [],
      sport_days: prof.sport_days ?? [],
      match_days: prof.match_days ?? [],
      experience_level: (prof.experience_level as Experience | null) ?? "intermediate",
    };

    // 3) Plan generieren (Hybrid: Regel-Gerüst + KI-Feinschliff)
    const plan = await generatePlan(input, type, data.locale ?? "de");

    // 4) Bisherigen aktiven Plan desselben Typs deaktivieren
    const { error: deactErr } = await db
      .from("training_plans")
      .update({ active: false })
      .eq("user_id", userId)
      .eq("type", type)
      .eq("active", true);
    if (deactErr) throw new Error(deactErr.message);

    // 5) Neuen Plan speichern
    const { error: insErr } = await db.from("training_plans").insert({
      user_id: userId,
      type,
      goal: plan.goal,
      weeks: plan.weeks,
      plan,
      active: true,
    });
    if (insErr) throw new Error(insErr.message);

    return { plan };
  });
