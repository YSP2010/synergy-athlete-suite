import { haversineM } from "./gpx";
import type { TrackPoint } from "./downsample";

export interface CourseGeometry {
  points: [number, number][]; // [lat, lng]
  distanceM: number;
}

export interface MatchResult {
  matched: boolean;
  /** 0..1 – Anteil der Streckenpunkte, die die Aktivität abdeckt. */
  score: number;
  reason?: string;
}

/** Toleranzen der Streckenerkennung. */
export const MATCH_TOLERANCE = {
  /** Max. Abstand eines Streckenpunkts zur Aktivität in Metern. */
  pointRadiusM: 35,
  /** Mindestanteil abgedeckter Streckenpunkte. */
  minCoverage: 0.9,
  /** Max. relative Abweichung der Gesamtdistanz. */
  maxDistanceDeviation: 0.15,
};

function nearestDistanceM(
  lat: number,
  lng: number,
  track: [number, number][],
): number {
  let best = Infinity;
  for (const [tLat, tLng] of track) {
    // Grobfilter: ~0.01° ≈ 1.1 km – spart teure Haversine-Aufrufe.
    if (Math.abs(tLat - lat) > 0.01 || Math.abs(tLng - lng) > 0.02) continue;
    const d = haversineM(lat, lng, tLat, tLng);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Prüft, ob eine Aktivität eine Strecke abgefahren/abgelaufen ist.
 * Bewusst konservativ: lieber kein Treffer als ein falscher Bestenlisten-Eintrag.
 */
export function matchCourse(
  course: CourseGeometry,
  activityPoints: TrackPoint[],
  activityDistanceM: number | null,
): MatchResult {
  if (course.points.length < 2) return { matched: false, score: 0, reason: "course_empty" };
  const track = activityPoints
    .map((p) => [p[1], p[2]] as [number, number])
    .filter(([lat, lng]) => lat !== 0 || lng !== 0);
  if (track.length < 2) return { matched: false, score: 0, reason: "activity_no_gps" };

  if (
    activityDistanceM != null &&
    course.distanceM > 0 &&
    Math.abs(activityDistanceM - course.distanceM) / course.distanceM >
      MATCH_TOLERANCE.maxDistanceDeviation
  ) {
    return { matched: false, score: 0, reason: "distance_mismatch" };
  }

  let covered = 0;
  for (const [lat, lng] of course.points) {
    if (nearestDistanceM(lat, lng, track) <= MATCH_TOLERANCE.pointRadiusM) covered += 1;
  }
  const score = Number((covered / course.points.length).toFixed(3));
  return {
    matched: score >= MATCH_TOLERANCE.minCoverage,
    score,
    reason: score >= MATCH_TOLERANCE.minCoverage ? undefined : "coverage_too_low",
  };
}

/** Reduziert einen Aktivitätsverlauf auf eine Streckengeometrie (max. 300 Punkte). */
export function geometryFromTrack(points: TrackPoint[], maxPoints = 300): CourseGeometry {
  const coords = points
    .map((p) => [p[1], p[2]] as [number, number])
    .filter(([lat, lng]) => lat !== 0 || lng !== 0);
  let picked = coords;
  if (coords.length > maxPoints) {
    const step = (coords.length - 1) / (maxPoints - 1);
    picked = [];
    for (let i = 0; i < maxPoints; i++) picked.push(coords[Math.round(i * step)]);
  }
  let distanceM = 0;
  for (let i = 1; i < coords.length; i++) {
    distanceM += haversineM(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
  }
  return { points: picked, distanceM: Number(distanceM.toFixed(1)) };
}
