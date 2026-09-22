import { describe, it, expect } from "vitest";
import { gymSessionLoad, sessionRpe, gymDailyLoads } from "./strength";

describe("strength load", () => {
  it("uses session-RPE and duration on the TSS scale", () => {
    // 60 min @ RPE 8 → 60*8/6 = 80
    expect(
      gymSessionLoad({
        date: "2026-01-01",
        session_type: "legs",
        duration_min: 60,
        exercises: [{ sets: 4, reps: 5, weight_kg: 100, rpe: 8 }],
      }),
    ).toBe(80);
  });

  it("weights exercise RPE by set count", () => {
    // (9*4 + 4*1) / 5 = 8
    const rpe = sessionRpe({
      date: "d",
      session_type: "full",
      duration_min: 60,
      exercises: [
        { sets: 4, reps: 5, weight_kg: 0, rpe: 9 },
        { sets: 1, reps: 10, weight_kg: 0, rpe: 4 },
      ],
    });
    expect(rpe).toBe(8);
  });

  it("falls back to type RPE when no exercise RPE is present", () => {
    // mobility → RPE 3, 30 min → 30*3/6 = 15
    expect(
      gymSessionLoad({
        date: "d",
        session_type: "mobility",
        duration_min: 30,
        exercises: [{ sets: 3, reps: 10, weight_kg: null, rpe: null }],
      }),
    ).toBe(15);
  });

  it("estimates duration from set count when duration is missing", () => {
    // 5 sets * 3 min = 15 min, default RPE 6 → 15*6/6 = 15
    expect(
      gymSessionLoad({
        date: "d",
        session_type: "somethingUnknown",
        duration_min: null,
        exercises: [{ sets: 5, reps: 5, weight_kg: 50, rpe: null }],
      }),
    ).toBe(15);
  });

  it("gymDailyLoads maps sessions and drops zero-load days", () => {
    const rows = gymDailyLoads([
      {
        date: "2026-01-01",
        session_type: "legs",
        duration_min: 60,
        exercises: [{ sets: 4, reps: 5, weight_kg: 100, rpe: 8 }],
      },
      { date: "2026-01-02", session_type: "legs", duration_min: 0, exercises: [] },
    ]);
    expect(rows).toEqual([{ date: "2026-01-01", tss: 80 }]);
  });
});
