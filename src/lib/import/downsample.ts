import type { ParsedSample } from "./types";

/** Kompakter Punkt für die DB: [t, lat, lng, alt, hr, cad, speed, power]. */
export type TrackPoint = [
  number,
  number,
  number,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
];

export interface TrackBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** Zielgröße für gespeicherte Verläufe – hält JSONB-Zeilen klein. */
export const MAX_TRACK_POINTS = 1500;

function round(v: number | null | undefined, digits: number): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return Number(v.toFixed(digits));
}

/**
 * Dünnt Messpunkte gleichmäßig aus (Start und Ende bleiben erhalten) und
 * bringt sie in die kompakte Speicherform.
 */
export function downsampleTrack(
  samples: ParsedSample[],
  max = MAX_TRACK_POINTS,
): { points: TrackPoint[]; bounds: TrackBounds | null } {
  const withPos = samples.filter((s) => s.lat != null && s.lng != null);
  const source = withPos.length ? withPos : samples;
  if (!source.length) return { points: [], bounds: null };

  let picked: ParsedSample[];
  if (source.length <= max) {
    picked = source;
  } else {
    const step = (source.length - 1) / (max - 1);
    picked = [];
    for (let i = 0; i < max; i++) {
      picked.push(source[Math.round(i * step)]);
    }
  }

  const points: TrackPoint[] = picked.map((s) => [
    Math.round(s.tOffsetS),
    round(s.lat, 6) ?? 0,
    round(s.lng, 6) ?? 0,
    round(s.altitudeM, 1),
    s.hr ?? null,
    round(s.cadence, 1),
    round(s.speedMps, 3),
    s.powerW ?? null,
  ]);

  let bounds: TrackBounds | null = null;
  for (const s of withPos) {
    const lat = s.lat!;
    const lng = s.lng!;
    bounds = bounds
      ? {
          minLat: Math.min(bounds.minLat, lat),
          minLng: Math.min(bounds.minLng, lng),
          maxLat: Math.max(bounds.maxLat, lat),
          maxLng: Math.max(bounds.maxLng, lng),
        }
      : { minLat: lat, minLng: lng, maxLat: lat, maxLng: lng };
  }
  return { points, bounds };
}
