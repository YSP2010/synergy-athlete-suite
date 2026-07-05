import { describe, it, expect } from "vitest";
import {
  calcRecovery,
  calcDailyMacros,
  generateWeekPlan,
  HARD_GYM_TYPES,
  type AthleteProfile,
  type DailyStat,
} from "./planner";
import { startOfWeek } from "./dates";

// ---------- calcRecovery ----------

describe("calcRecovery", () => {
  const goodStat: DailyStat = {
    date: "2026-07-05",
    weight_kg: 75,
    sleep_hours: 8,
    sleep_quality: 5,
    soreness: 1,
    stress: 1,
    mood: 4,
  };

  it("gibt bei optimalen Werten ohne Last einen sehr hohen (grünen) Score", () => {
    const r = calcRecovery(goodStat, [], []);
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.level).toBe("green");
  });

  it("senkt den Score bei hoher Trainingslast der letzten 72h", () => {
    const loaded = calcRecovery(goodStat, [{ date: "2026-07-04", kind: "match", intensity: "high", match_hardness: "hard" }], [
      { date: "2026-07-04", session_type: "legs" },
    ]);
    const rested = calcRecovery(goodStat, [], []);
    expect(loaded.score).toBeLessThan(rested.score);
  });

  it("liefert bei schlechten Werten einen roten Score", () => {
    const badStat: DailyStat = {
      date: "2026-07-05",
      weight_kg: 75,
      sleep_hours: 4,
      sleep_quality: 1,
      soreness: 5,
      stress: 5,
      mood: 2,
    };
    const r = calcRecovery(badStat, [], []);
    expect(r.level).toBe("red");
    expect(r.score).toBeLessThan(50);
  });

  it("verwendet neutrale Defaults, wenn kein Stat vorhanden ist", () => {
    const r = calcRecovery(null, [], []);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

// ---------- calcDailyMacros ----------

const baseProfile: AthleteProfile = {
  sex: "male",
  height_cm: 180,
  weight_kg: 80,
  birth_date: "2000-01-01",
  goal: "performance",
  gym_days: [],
  sport_days: [],
  match_days: [],
  sport: "football",
};

describe("calcDailyMacros", () => {
  it("berechnet Protein mit rund 2 g pro kg Körpergewicht", () => {
    const m = calcDailyMacros(baseProfile, 25, undefined, undefined, false);
    expect(m.protein_g).toBe(Math.round(2.0 * 80));
  });

  it("aktiviert Carbo-Loading am Match-Tag", () => {
    const m = calcDailyMacros(
      baseProfile,
      25,
      { date: "2026-07-05", kind: "match", intensity: "high" },
      undefined,
      false,
    );
    expect(m.carbLoading).toBe(true);
  });

  it("aktiviert Carbo-Loading vor einem harten Match am Folgetag", () => {
    const m = calcDailyMacros(baseProfile, 25, undefined, undefined, true);
    expect(m.carbLoading).toBe(true);
    // Ziel: 7,5 g Carbs pro kg
    expect(m.carbs_g).toBe(Math.round(7.5 * 80));
  });

  it("nutzt an normalen Tagen kein Carbo-Loading und weniger Carbs", () => {
    const normal = calcDailyMacros(baseProfile, 25, undefined, undefined, false);
    const loading = calcDailyMacros(baseProfile, 25, undefined, undefined, true);
    expect(normal.carbLoading).toBe(false);
    expect(loading.carbs_g).toBeGreaterThan(normal.carbs_g);
  });
});

// ---------- generateWeekPlan / 48h-Regel ----------

describe("generateWeekPlan", () => {
  // Woche mit Sonntagsspiel (ISO dow 6) und Gym an Fr (dow 4) & Mi (dow 2) & Mo (dow 0)
  const profile: AthleteProfile = {
    ...baseProfile,
    gym_days: [0, 2, 4],
    sport_days: [],
    match_days: [6],
  };
  const weekStart = startOfWeek(new Date("2026-07-06")); // ein Montag

  it("erzeugt genau 7 Slots", () => {
    const plan = generateWeekPlan(profile, weekStart, { 6: "hard" }, null);
    expect(plan).toHaveLength(7);
  });

  it("legt kein Beintraining in die 48h vor ein hartes Spiel (Freitag-Slot ersetzt)", () => {
    const plan = generateWeekPlan(profile, weekStart, { 6: "hard" }, null);
    const friday = plan.find((s) => s.dow === 4);
    expect(friday?.sessionType).not.toBe("legs");
    expect(friday?.sessionType).not.toBe("lower");
  });

  it("ersetzt bei niedrigem Recovery-Score die erste harte Gym-Einheit durch Active Recovery", () => {
    const plan = generateWeekPlan(profile, weekStart, {}, 40);
    const recovery = plan.find((s) => s.kind === "recovery");
    expect(recovery).toBeDefined();
    expect(recovery?.label).toBe("Active Recovery");
    // Der ersetzte Slot war eine harte Gym-Einheit
    expect(recovery?.warning).toContain("Recovery-Score");
  });

  it("lässt harte Einheiten bei hohem Recovery-Score unangetastet", () => {
    const plan = generateWeekPlan(profile, weekStart, {}, 90);
    expect(plan.some((s) => s.kind === "recovery")).toBe(false);
  });

  it("HARD_GYM_TYPES enthält die belastenden Split-Typen", () => {
    expect(HARD_GYM_TYPES).toContain("legs");
    expect(HARD_GYM_TYPES).toContain("push");
    expect(HARD_GYM_TYPES).not.toContain("mobility");
  });
});
