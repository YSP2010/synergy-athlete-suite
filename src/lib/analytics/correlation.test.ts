import { describe, it, expect } from "vitest";
import { pearson, recoveryDrivers, type DailyFactorRow } from "./correlation";

describe("pearson", () => {
  it("returns 1 for a perfect positive linear relation", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5);
  });
  it("returns -1 for a perfect negative linear relation", () => {
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 5);
  });
  it("returns null on zero variance", () => {
    expect(pearson([3, 3, 3], [1, 2, 3])).toBeNull();
  });
  it("returns null on too few points", () => {
    expect(pearson([1], [2])).toBeNull();
  });
});

describe("recoveryDrivers", () => {
  function rows(pairs: Array<[number, number]>): DailyFactorRow[] {
    // sleepHours drives recovery; other factors constant/absent.
    return pairs.map(([sleep, rec], i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      sleepHours: sleep,
      sleepQuality: null,
      soreness: null,
      stress: null,
      mood: null,
      recovery: rec,
    }));
  }

  it("detects a strong positive driver and drops factors without data", () => {
    const data = rows([
      [6, 40],
      [7, 55],
      [8, 70],
      [6.5, 48],
      [7.5, 62],
      [9, 82],
      [5.5, 35],
      [8.5, 76],
    ]);
    const drivers = recoveryDrivers(data);
    expect(drivers.length).toBe(1);
    expect(drivers[0]!.factor).toBe("sleepHours");
    expect(drivers[0]!.direction).toBe("positive");
    expect(drivers[0]!.strength).toBe("strong");
    expect(drivers[0]!.n).toBe(8);
  });

  it("ignores factors below the minimum sample size", () => {
    const data = rows([
      [6, 40],
      [8, 70],
      [7, 55],
    ]);
    expect(recoveryDrivers(data)).toEqual([]);
  });
});
