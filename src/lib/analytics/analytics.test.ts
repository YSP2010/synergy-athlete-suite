import { describe, expect, it } from "vitest";
import { hrZones, powerZones, paceZones, zoneOf } from "./zones";
import {
  trimp,
  bikeTss,
  runTss,
  swimTss,
  loadSeries,
  fillDailyGaps,
  acwrZone,
  fosterMonotony,
} from "./load";
import {
  gradeFactor,
  gradeAdjustedSpeed,
  avgGradeAdjustedSpeed,
  efficiencyFactor,
  decoupling,
  runningEconomyScore,
  cadenceConsistency,
} from "./efficiency";
import { riegel, vo2maxFromRace, predictFromVo2max, criticalPower, criticalSwimSpeed } from "./predictions";
import { computeRecords, bestRunEffort } from "./records";
import { parseWellnessJson, mergeBundles } from "../import/wellness";

describe("zones", () => {
  it("nutzt die Schwellen-HR bevorzugt", () => {
    const z = hrZones(190, 170);
    expect(z).toHaveLength(5);
    expect(z[3]!.from).toBe(170); // Zone 4 startet an der Schwelle
  });
  it("fällt auf maxHr zurück", () => {
    expect(hrZones(200)[0]!.from).toBe(100);
  });
  it("liefert keine Zonen ohne Datenbasis", () => {
    expect(hrZones(null)).toEqual([]);
    expect(powerZones(0)).toEqual([]);
    expect(paceZones(null)).toEqual([]);
  });
  it("bildet 7 Power-Zonen aus der FTP", () => {
    const z = powerZones(250);
    expect(z).toHaveLength(7);
    expect(z[3]!.from).toBe(225);
    expect(zoneOf(z, 240)).toBe(4);
  });
  it("gibt Pace-Zonen als Sekunden pro km aus, langsam zuerst", () => {
    const z = paceZones(4); // 4 m/s ≈ 4:10 min/km
    expect(z[0]!.to).toBeGreaterThan(z[4]!.to);
  });
});

describe("load", () => {
  it("berechnet TRIMP geschlechtsabhängig", () => {
    const male = trimp(60, 150, 50, 190, "male");
    const female = trimp(60, 150, 50, 190, "female");
    expect(male).toBeGreaterThan(0);
    expect(female).not.toBe(male);
  });
  it("liefert 100 TSS für eine Stunde an der FTP", () => {
    expect(bikeTss(3600, 250, 250)).toBe(100);
    expect(runTss(3600, 4, 4)).toBe(100);
    expect(swimTss(3600, 1.2, 1.2)).toBe(100);
  });
  it("weist ungültige Eingaben ab", () => {
    expect(bikeTss(0, 250, 250)).toBe(0);
    expect(runTss(3600, 4, 0)).toBe(0);
  });
  it("füllt fehlende Tage mit 0", () => {
    const filled = fillDailyGaps([
      { date: "2026-01-01", tss: 50 },
      { date: "2026-01-04", tss: 80 },
    ]);
    expect(filled.map((f) => f.date)).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
    expect(filled[1]!.tss).toBe(0);
  });
  it("berechnet CTL/ATL/TSB und ACWR", () => {
    const days = Array.from({ length: 40 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
      tss: 60,
    }));
    const series = loadSeries(days);
    const last = series[series.length - 1]!;
    expect(last.ctl).toBeGreaterThan(0);
    expect(last.atl).toBeGreaterThan(last.ctl);
    expect(last.tsb).toBeLessThan(0);
    expect(last.acwr).toBeCloseTo(1, 1);
    expect(series[0]!.acwr).toBeNull();
  });
  it("ordnet ACWR einer Ampelstufe zu", () => {
    expect(acwrZone(0.5)).toBe("low");
    expect(acwrZone(1.1)).toBe("optimal");
    expect(acwrZone(1.4)).toBe("elevated");
    expect(acwrZone(1.8)).toBe("high");
    expect(acwrZone(null)).toBeNull();
  });
  it("berechnet Monotonie und Strain", () => {
    const r = fosterMonotony([50, 0, 80, 20, 60, 0, 100]);
    expect(r.weeklyLoad).toBe(310);
    expect(r.monotony).toBeGreaterThan(0);
    expect(r.strain).toBeGreaterThan(r.weeklyLoad);
    expect(fosterMonotony([50, 50]).monotony).toBeNull();
  });
});

describe("efficiency", () => {
  it("macht Bergauf teurer und Bergab günstiger", () => {
    expect(gradeFactor(0)).toBe(1);
    expect(gradeFactor(0.05)).toBeGreaterThan(1);
    expect(gradeFactor(-0.05)).toBeLessThan(1);
    expect(gradeAdjustedSpeed(3, 0.05)).toBeGreaterThan(3);
  });
  it("mittelt GAP über die Messpunkte", () => {
    const samples = Array.from({ length: 20 }, (_, i) => ({
      tOffsetS: i * 10,
      speedMps: 3,
      altitudeM: 100,
      hr: 150,
    }));
    expect(avgGradeAdjustedSpeed(samples)).toBeCloseTo(3, 1);
    expect(avgGradeAdjustedSpeed([])).toBeNull();
  });
  it("berechnet den Efficiency Factor", () => {
    expect(efficiencyFactor(3, 150)).toBeCloseTo(1.2, 2);
    expect(efficiencyFactor(null, 150)).toBeNull();
  });
  it("erkennt kardiale Drift als positives Decoupling", () => {
    const samples = Array.from({ length: 40 }, (_, i) => ({
      tOffsetS: i * 10,
      speedMps: 3,
      hr: i < 20 ? 140 : 160,
    }));
    expect(decoupling(samples)!).toBeGreaterThan(10);
    expect(decoupling([])).toBeNull();
  });
  it("bewertet Laufökonomie und Trittfrequenz", () => {
    const good = runningEconomyScore({ verticalRatio: 6, groundContactMs: 200, strideLengthM: 1.5 })!;
    const bad = runningEconomyScore({ verticalRatio: 12, groundContactMs: 320, strideLengthM: 0.9 })!;
    expect(good).toBeGreaterThan(bad);
    expect(runningEconomyScore({})).toBeNull();
    const cad = cadenceConsistency(
      Array.from({ length: 10 }, (_, i) => ({ tOffsetS: i, cadence: 90 })),
    );
    expect(cad).toBe(0);
  });
});

describe("predictions", () => {
  it("skaliert Zeiten nach Riegel", () => {
    const t10k = riegel(20 * 60, 5000, 10000);
    expect(t10k).toBeGreaterThan(40 * 60);
    expect(t10k).toBeLessThan(43 * 60);
  });
  it("schätzt VO2max aus einer Bestzeit", () => {
    const vo2 = vo2maxFromRace(5000, 20 * 60)!;
    expect(vo2).toBeGreaterThan(40);
    expect(vo2).toBeLessThan(60);
  });
  it("prognostiziert längere Distanzen langsamer", () => {
    const t5 = predictFromVo2max(50, 5000)!;
    const t10 = predictFromVo2max(50, 10000)!;
    expect(t10).toBeGreaterThan(t5 * 2);
  });
  it("berechnet Critical Power und CSS", () => {
    const cp = criticalPower({ powerW: 350, durationS: 300 }, { powerW: 280, durationS: 1200 })!;
    expect(cp.cpW).toBeGreaterThan(0);
    expect(cp.wPrimeJ).toBeGreaterThan(0);
    expect(criticalPower({ powerW: 300, durationS: 1200 }, { powerW: 280, durationS: 300 })).toBeNull();
    expect(criticalSwimSpeed(400, 180)).toBeCloseTo(0.909, 2);
  });
});

describe("records", () => {
  const acts = [
    {
      id: "a1",
      sport: "running",
      started_at: "2026-03-01T08:00:00Z",
      duration_s: 1300,
      moving_duration_s: 1280,
      distance_m: 5100,
      elevation_gain_m: 40,
      avg_power_w: null,
      normalized_power_w: null,
    },
    {
      id: "a2",
      sport: "running",
      started_at: "2026-04-01T08:00:00Z",
      duration_s: 1200,
      moving_duration_s: 1200,
      distance_m: 5000,
      elevation_gain_m: 10,
      avg_power_w: null,
      normalized_power_w: null,
    },
  ];
  it("nimmt die schnellste 5-km-Zeit", () => {
    const recs = computeRecords(acts);
    const fastest = recs.find((r) => r.metric === "fastest_5k")!;
    expect(fastest.value).toBe(1200);
    expect(fastest.activityId).toBe("a2");
  });
  it("erkennt längste Distanz und meiste Höhenmeter", () => {
    const recs = computeRecords(acts);
    expect(recs.find((r) => r.metric === "longest_distance")!.value).toBe(5100);
    expect(recs.find((r) => r.metric === "most_elevation")!.value).toBe(40);
  });
  it("liefert die beste Laufleistung für Prognosen", () => {
    expect(bestRunEffort(computeRecords(acts))).toEqual({ distanceM: 5000, timeS: 1200 });
  });
});

describe("wellness parser", () => {
  it("liest Tageswerte aus Garmin-JSON", () => {
    const json = JSON.stringify([
      {
        calendarDate: "2026-05-01",
        totalSteps: 12000,
        restingHeartRate: 48,
        averageStressLevel: 22,
        bodyBatteryHighestValue: 92,
      },
    ]);
    const b = parseWellnessJson(json);
    expect(b.wellness[0]).toMatchObject({ date: "2026-05-01", steps: 12000, resting_hr: 48 });
  });
  it("liest Schlaf- und HRV-Daten aus verschachtelten Strukturen", () => {
    const json = JSON.stringify({
      dailySleepDTO: {
        calendarDate: "2026-05-02",
        sleepTimeSeconds: 27000,
        deepSleepSeconds: 5400,
        sleepScore: 82,
      },
      hrv: { calendarDate: "2026-05-02", lastNightAvg: 62, weeklyAvg: 58, hrvStatus: "balanced" },
    });
    const b = parseWellnessJson(json);
    expect(b.sleep[0]!.sleep_score).toBe(82);
    expect(b.hrv[0]!.last_night_avg_ms).toBe(62);
  });
  it("ignoriert kaputtes JSON und Datensätze ohne Datum", () => {
    expect(parseWellnessJson("{oops")).toEqual({ wellness: [], sleep: [], hrv: [], metrics: [] });
    expect(parseWellnessJson(JSON.stringify([{ steps: 5 }])).wellness).toEqual([]);
  });
  it("führt mehrere Dateien je Datum zusammen", () => {
    const a = parseWellnessJson(JSON.stringify([{ calendarDate: "2026-05-03", totalSteps: 100 }]));
    const b = parseWellnessJson(
      JSON.stringify([{ calendarDate: "2026-05-03", restingHeartRate: 50 }]),
    );
    const merged = mergeBundles([a, b]);
    expect(merged.wellness).toHaveLength(1);
    expect(merged.wellness[0]).toMatchObject({ steps: 100, resting_hr: 50 });
  });
});
