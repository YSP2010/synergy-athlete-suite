import { describe, it, expect } from "vitest";
import { rankFromXp, rankProgress, DIVISIONS, MAX_STEP } from "./rank";

describe("rankFromXp", () => {
  it("startet bei 0 XP als Rekrut I", () => {
    const r = rankFromXp(0);
    expect(r.division.key).toBe("recruit");
    expect(r.tier).toBe(1);
    expect(r.roman).toBe("I");
    expect(r.stepIndex).toBe(0);
    expect(r.isMax).toBe(false);
  });

  it("behandelt negative/ungueltige XP als 0", () => {
    expect(rankFromXp(-50).stepIndex).toBe(0);
    expect(rankFromXp(Number.NaN).stepIndex).toBe(0);
  });

  it("steigt exakt an der Schwelle auf", () => {
    expect(rankFromXp(99).tier).toBe(1);
    expect(rankFromXp(100).tier).toBe(2);
    const soldat = rankFromXp(1000);
    expect(soldat.division.key).toBe("soldier");
    expect(soldat.tier).toBe(1);
  });

  it("erreicht das Maximum (General V)", () => {
    const r = rankFromXp(999999);
    expect(r.division.key).toBe("general");
    expect(r.tier).toBe(5);
    expect(r.stepIndex).toBe(MAX_STEP);
    expect(r.isMax).toBe(true);
    expect(r.nextMinXp).toBeNull();
  });

  it("deckt 5 Divisionen und 25 Stufen ab", () => {
    expect(DIVISIONS).toHaveLength(5);
    expect(MAX_STEP).toBe(24);
  });
});

describe("rankProgress", () => {
  it("liegt in der Mitte einer Stufe bei ~50%", () => {
    const p = rankProgress(175); // Rekrut II: 100..250
    expect(p.rank.tier).toBe(2);
    expect(p.pct).toBeGreaterThan(0.45);
    expect(p.pct).toBeLessThan(0.55);
    expect(p.toNext).toBe(75);
  });

  it("ist am Maximum voll", () => {
    const p = rankProgress(50000);
    expect(p.pct).toBe(1);
    expect(p.toNext).toBe(0);
  });
});
