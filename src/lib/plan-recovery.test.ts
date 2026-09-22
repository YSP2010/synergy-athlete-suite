import { describe, it, expect } from "vitest";
import { recoveryState, computePlanRecovery, UNKNOWN_RECOVERY } from "./plan-recovery";
import type { Thresholds } from "./analytics/aggregate";

const T: Thresholds = {
  maxHr: null,
  restHr: null,
  lthr: null,
  thresholdSpeedMps: null,
  ftpW: null,
  cssMps: null,
  sex: null,
};

describe("recoveryState", () => {
  it("returns unknown without any signal", () => {
    expect(recoveryState(null, null, null)).toBe("unknown");
  });
  it("flags overreached on high ACWR", () => {
    expect(recoveryState(0, 1.6, null)).toBe("overreached");
  });
  it("flags overreached on very low readiness", () => {
    expect(recoveryState(null, null, 20)).toBe("overreached");
  });
  it("flags fatigued on negative TSB", () => {
    expect(recoveryState(-15, 1.1, null)).toBe("fatigued");
  });
  it("flags fresh on positive TSB with low ACWR", () => {
    expect(recoveryState(12, 0.9, null)).toBe("fresh");
  });
  it("flags fresh on high readiness", () => {
    expect(recoveryState(null, null, 82)).toBe("fresh");
  });
  it("returns balanced in the normal range", () => {
    expect(recoveryState(0, 1.1, 60)).toBe("balanced");
  });
});

describe("computePlanRecovery", () => {
  it("is unknown without data", () => {
    expect(computePlanRecovery([], [], T, null)).toEqual(UNKNOWN_RECOVERY);
  });
  it("derives fresh from high readiness even without load history", () => {
    const r = computePlanRecovery([], [], T, 80);
    expect(r.state).toBe("fresh");
    expect(r.trainingReadiness).toBe(80);
  });
});
