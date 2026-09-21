import { describe, it, expect } from "vitest";
import { gymSessionXp, sportSessionXp, activityXp, XP } from "./xp";

describe("gymSessionXp", () => {
  it("gibt die Basis bei leerem Training", () => {
    expect(gymSessionXp({ volumeKg: 0 })).toBe(XP.GYM_BASE);
  });
  it("addiert Volumen-Bonus (1 XP je 500 kg)", () => {
    expect(gymSessionXp({ volumeKg: 5000 })).toBe(25 + 10);
  });
  it("deckelt den Volumen-Bonus", () => {
    expect(gymSessionXp({ volumeKg: 999999 })).toBe(25 + 50);
  });
  it("gibt RPE-Bonus ab Schwelle 8", () => {
    expect(gymSessionXp({ volumeKg: 0, avgRpe: 8 })).toBe(25 + 10);
    expect(gymSessionXp({ volumeKg: 0, avgRpe: 7.5 })).toBe(25);
  });
});

describe("sportSessionXp", () => {
  it("Basis + Dauer + Intensitaet", () => {
    expect(sportSessionXp({ durationMin: 0, intensity: "low" })).toBe(25);
    expect(sportSessionXp({ durationMin: 30, intensity: "mid" })).toBe(25 + 10 + 10);
    expect(sportSessionXp({ durationMin: 90, intensity: "high" })).toBe(25 + 30 + 20);
  });
  it("deckelt die Dauer", () => {
    expect(sportSessionXp({ durationMin: 1000, intensity: "low" })).toBe(25 + 40);
  });
});

describe("activityXp", () => {
  it("Basis bei nichts", () => {
    expect(activityXp({ distanceM: 0, durationS: 0 })).toBe(20);
  });
  it("2 XP je km + 1 XP je 5 min", () => {
    expect(activityXp({ distanceM: 10000, durationS: 3600 })).toBe(20 + 20 + 12);
  });
  it("deckelt Distanz und Dauer", () => {
    expect(activityXp({ distanceM: 10000000, durationS: 10000000 })).toBe(20 + 150 + 60);
  });
});
