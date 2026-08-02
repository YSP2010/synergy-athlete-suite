import { describe, expect, it } from "vitest";
import { downsampleTrack, MAX_TRACK_POINTS } from "./downsample";
import { geometryFromTrack, matchCourse } from "./match";
import type { ParsedSample } from "./types";

function sample(i: number, lat: number, lng: number): ParsedSample {
  return { tOffsetS: i, lat, lng, altitudeM: 100 + i, hr: 140, cadence: 80, speedMps: 3, powerW: null };
}

/** Gerade Linie nach Norden, ~1.1 m pro Schritt. */
function line(n: number, offsetLng = 0): ParsedSample[] {
  return Array.from({ length: n }, (_, i) => sample(i, 48.0 + i * 0.00001, 11.0 + offsetLng));
}

describe("downsampleTrack", () => {
  it("behält kurze Tracks unverändert", () => {
    const { points, bounds } = downsampleTrack(line(50));
    expect(points).toHaveLength(50);
    expect(bounds?.minLat).toBeCloseTo(48.0, 5);
  });

  it("dünnt lange Tracks auf das Maximum aus und behält Start und Ende", () => {
    const src = line(9000);
    const { points } = downsampleTrack(src);
    expect(points).toHaveLength(MAX_TRACK_POINTS);
    expect(points[0][0]).toBe(0);
    expect(points[points.length - 1][0]).toBe(8999);
  });

  it("liefert leeres Ergebnis ohne Punkte", () => {
    expect(downsampleTrack([]).points).toEqual([]);
  });
});

describe("matchCourse", () => {
  const course = geometryFromTrack(downsampleTrack(line(2000)).points);

  it("erkennt dieselbe Strecke", () => {
    const activity = downsampleTrack(line(2000)).points;
    const res = matchCourse(course, activity, course.distanceM);
    expect(res.matched).toBe(true);
    expect(res.score).toBeGreaterThan(0.95);
  });

  it("lehnt eine parallele Strecke in 500 m Abstand ab", () => {
    const activity = downsampleTrack(line(2000, 0.0067)).points;
    const res = matchCourse(course, activity, course.distanceM);
    expect(res.matched).toBe(false);
  });

  it("lehnt bei stark abweichender Distanz ab", () => {
    const activity = downsampleTrack(line(400)).points;
    const res = matchCourse(course, activity, course.distanceM * 0.2);
    expect(res.matched).toBe(false);
    expect(res.reason).toBe("distance_mismatch");
  });

  it("lehnt Aktivitäten ohne GPS ab", () => {
    expect(matchCourse(course, [], 100).matched).toBe(false);
  });
});
