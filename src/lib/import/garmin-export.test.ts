import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseGarminExportFile, parseGarminSummarizedActivities } from "./garmin-export";

const FIX = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__", "garmin-export");
const load = (name: string) => readFileSync(join(FIX, name), "utf-8");

describe("parseGarminExportFile – UDSFile (Tageswerte)", () => {
  const b = parseGarminExportFile(load("UDSFile_sample.json"), "UDSFile_2026-06-10_2026-09-18.json");

  it("liest zwei Tage, überspringt Junk-Records", () => {
    expect(b.wellness).toHaveLength(2);
  });

  it("mappt Schritte, RHR und Distanz", () => {
    const day = b.wellness.find((w) => w.date === "2026-08-05")!;
    expect(day.steps).toBe(488);
    expect(day.resting_hr).toBe(50);
    expect(day.distance_m).toBe(440);
    expect(day.active_kcal).toBe(17);
  });

  it("holt Stress aus dem TOTAL-Aggregat", () => {
    const day = b.wellness.find((w) => w.date === "2026-08-05")!;
    expect(day.avg_stress).toBe(13);
    expect(day.max_stress).toBe(76);
  });

  it("holt Body Battery start/end/min/max", () => {
    const day = b.wellness.find((w) => w.date === "2026-08-05")!;
    expect(day.body_battery_start).toBe(50);
    expect(day.body_battery_end).toBe(61);
    expect(day.body_battery_min).toBe(50);
    expect(day.body_battery_max).toBe(62);
  });

  it("nähert Stockwerke aus Metern an (6.096 m / 3.048)", () => {
    const day = b.wellness.find((w) => w.date === "2026-08-05")!;
    expect(day.floors_climbed).toBe(2);
  });
});

describe("parseGarminExportFile – sleepData", () => {
  const b = parseGarminExportFile(
    load("sleepData_sample.json"),
    "2026-07-02_2026-09-19_1_sleepData.json",
  );

  it("berechnet duration_s aus deep+light+rem (ohne awake)", () => {
    const s = b.sleep.find((x) => x.date === "2026-08-06")!;
    expect(s.duration_s).toBe(6660 + 7620 + 4020);
    expect(s.deep_s).toBe(6660);
  });

  it("liest sleep_score aus sleepScores.overallScore", () => {
    const s = b.sleep.find((x) => x.date === "2026-08-06")!;
    expect(s.sleep_score).toBe(68);
  });

  it("liest avg_sleep_hr aus spo2SleepSummary.averageHR", () => {
    const s = b.sleep.find((x) => x.date === "2026-08-06")!;
    expect(s.avg_sleep_hr).toBe(50);
    expect(s.avg_spo2).toBeCloseTo(96.48, 2);
  });

  it("setzt Schlaf-Start/Ende als ISO", () => {
    const s = b.sleep.find((x) => x.date === "2026-08-06")!;
    expect(s.sleep_start).toBe("2026-08-05T21:25:10.000Z");
  });
});

describe("parseGarminExportFile – VO2max nach Sportart", () => {
  const b = parseGarminExportFile(
    load("MetricsMaxMetData_sample.json"),
    "MetricsMaxMetData_20260805_20260917_1.json",
  );

  it("routet RUNNING in vo2max_running und CYCLING in vo2max_cycling", () => {
    const run = b.metrics.find((m) => m.date === "2026-08-09")!;
    const bike = b.metrics.find((m) => m.date === "2026-08-10")!;
    expect(run.vo2max_running).toBe(59);
    expect(run.vo2max_cycling ?? null).toBeNull();
    expect(bike.vo2max_cycling).toBe(52);
    expect(bike.vo2max_running ?? null).toBeNull();
  });
});

describe("parseGarminExportFile – AcuteTrainingLoad", () => {
  const b = parseGarminExportFile(
    load("MetricsAcuteTrainingLoad_sample.json"),
    "MetricsAcuteTrainingLoad_20260805_20260917_1.json",
  );

  it("wandelt numerisches calendarDate und berechnet load_ratio", () => {
    const m = b.metrics.find((x) => x.acute_load === 101)!;
    expect(m.date).toBe("2026-08-06");
    expect(m.chronic_load).toBe(178);
    expect(m.load_ratio).toBeCloseTo(101 / 178, 3);
  });
});

describe("parseGarminExportFile – healthStatusData HRV", () => {
  const b = parseGarminExportFile(
    load("healthStatusData_sample.json"),
    "2026-08-06_2026-09-17_1_healthStatusData.json",
  );

  it("liest last_night_avg_ms + status aus dem HRV-Eintrag", () => {
    const h = b.hrv.find((x) => x.date === "2026-08-06")!;
    expect(h.last_night_avg_ms).toBe(68);
    expect(h.status).toBe("ONBOARDING");
  });
});

describe("parseGarminExportFile – Router", () => {
  it("liefert für unbekannte Dateinamen ein leeres Bundle", () => {
    const b = parseGarminExportFile("[]", "irgendwas.json");
    expect(b.wellness).toHaveLength(0);
    expect(b.sleep).toHaveLength(0);
    expect(b.hrv).toHaveLength(0);
    expect(b.metrics).toHaveLength(0);
  });

  it("wirft nie bei kaputtem JSON", () => {
    expect(() => parseGarminExportFile("{kaputt", "UDSFile.json")).not.toThrow();
  });
});

describe("parseGarminSummarizedActivities", () => {
  const acts = parseGarminSummarizedActivities(load("summarizedActivities_sample.json"));

  it("liest alle Aktivitäten", () => {
    expect(acts).toHaveLength(4);
  });

  it("mappt Sportarten dediziert", () => {
    expect(acts.map((a) => a.sport)).toEqual(["run", "bike", "strength", "soccer"]);
  });

  it("wandelt Distanz (cm→m) und Dauer (ms→s) korrekt um", () => {
    const run = acts[0]!;
    expect(run.distanceM).toBeCloseTo(6074.45, 1);
    expect(run.durationS).toBeCloseTo(5565.46, 1);
    expect(run.movingDurationS).toBeCloseTo(3230, 1);
  });

  it("berechnet Durchschnittstempo aus Distanz/Bewegungszeit", () => {
    const run = acts[0]!;
    expect(run.avgSpeedMps).toBeCloseTo(6074.45 / 3230, 2);
  });

  it("skaliert maxSpeed konsistent (Faktor 10)", () => {
    const run = acts[0]!;
    expect(run.maxSpeedMps).toBeCloseTo(7.623, 2);
  });

  it("rechnet Höhenmeter (cm→m) und Schrittlänge (cm→m) um", () => {
    const run = acts[0]!;
    expect(run.elevationGainM).toBeCloseTo(8, 1);
    expect(run.avgStrideLengthM).toBeCloseTo(0.939, 2);
  });

  it("setzt Zeitzonen-Offset aus local/gmt", () => {
    const run = acts[0]!;
    expect(run.timezoneOffsetMin).toBe(120);
  });

  it("erzeugt stabilen Dedupe-Key und markiert unverifiziert", () => {
    const run = acts[0]!;
    expect(run.deviceActivityKey).toBe("garmin-export|111");
    expect(run.verified).toBe(false);
    expect(run.routeOnly).toBe(false);
  });

  it("lässt avgSpeed bei distanzlosen Aktivitäten (Kraft) null", () => {
    const strength = acts[2]!;
    expect(strength.sport).toBe("strength");
    expect(strength.avgSpeedMps ?? null).toBeNull();
  });

  it("liefert bei kaputtem JSON eine leere Liste", () => {
    expect(parseGarminSummarizedActivities("{kaputt")).toEqual([]);
  });
});
