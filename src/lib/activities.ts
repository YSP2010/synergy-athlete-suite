import type { TrackPoint } from "./import/downsample";

export const SPORT_LABEL: Record<string, string> = {
  running: "Laufen",
  trail_running: "Trailrunning",
  cycling: "Radfahren",
  swimming: "Schwimmen",
  walking: "Gehen",
  hiking: "Wandern",
  football: "Fußball",
  tennis: "Tennis",
  strength: "Kraft",
  triathlon: "Triathlon",
  other: "Sonstiges",
};

export function sportLabel(sport: string): string {
  return SPORT_LABEL[sport] ?? sport;
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "–";
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export function fmtDistance(meters: number | null | undefined): string {
  if (meters == null) return "–";
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

/** Pace in min/km, aus Distanz und Dauer. */
export function fmtPace(meters: number | null | undefined, seconds: number | null | undefined): string {
  if (!meters || !seconds || meters < 50) return "–";
  const secPerKm = seconds / (meters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function fmtSpeed(mps: number | null | undefined): string {
  if (mps == null) return "–";
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export interface ChartSample {
  km: number;
  min: number;
  hr: number | null;
  alt: number | null;
  speed: number | null;
  power: number | null;
}

/** Wandelt Trackpunkte in Diagrammdaten (max. 400 Punkte). */
export function toChartData(points: TrackPoint[], distanceM: number | null): ChartSample[] {
  if (!points.length) return [];
  const max = 400;
  const step = points.length > max ? (points.length - 1) / (max - 1) : 1;
  const out: ChartSample[] = [];
  const total = points[points.length - 1][0] || 1;
  const count = points.length > max ? max : points.length;
  for (let i = 0; i < count; i++) {
    const p = points[points.length > max ? Math.round(i * step) : i];
    out.push({
      km: distanceM ? Number(((distanceM / 1000) * (p[0] / total)).toFixed(2)) : Number((p[0] / 60).toFixed(1)),
      min: Number((p[0] / 60).toFixed(1)),
      hr: p[4],
      alt: p[3],
      speed: p[6] != null ? Number((p[6] * 3.6).toFixed(1)) : null,
      power: p[7],
    });
  }
  return out;
}
