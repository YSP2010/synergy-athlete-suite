/**
 * Multisport-Zerlegung (Etappe 5): aus den Runden einer Garmin-Multisport-Aktivität
 * die Segmente Schwimmen / Wechsel 1 / Rad / Wechsel 2 / Laufen ableiten.
 */

export interface SegmentLap {
  lapIndex: number;
  sport?: string | null;
  durationS?: number | null;
  distanceM?: number | null;
  avgHr?: number | null;
  avgSpeedMps?: number | null;
  avgPowerW?: number | null;
  avgCadence?: number | null;
}

export type SegmentType = "swim" | "t1" | "bike" | "t2" | "run" | "other";

export interface SegmentDraft {
  segment_index: number;
  segment_type: SegmentType;
  sport: string | null;
  started_at: string | null;
  duration_s: number;
  distance_m: number | null;
  avg_hr: number | null;
  avg_speed_mps: number | null;
  avg_power_w: number | null;
  avg_cadence: number | null;
}

const SWIM = ["swimming", "lap_swimming", "open_water_swimming"];
const BIKE = ["cycling", "biking", "road_biking", "mountain_biking", "indoor_cycling"];
const RUN = ["running", "trail_running", "treadmill_running"];

/** Ordnet eine Runde einem Segmenttyp zu. Wechsel erkennen wir an kurzer Dauer ohne Sportart. */
function classify(lap: SegmentLap): SegmentType {
  const sport = (lap.sport ?? "").toLowerCase();
  if (SWIM.includes(sport)) return "swim";
  if (BIKE.includes(sport)) return "bike";
  if (RUN.includes(sport)) return "run";
  if (sport === "transition" || sport === "multisport") return "t1"; // Reihenfolge korrigiert später
  const d = lap.durationS ?? 0;
  const dist = lap.distanceM ?? 0;
  if (d > 0 && d <= 600 && dist <= 500) return "t1";
  return "other";
}

/**
 * Baut die Segmentliste. Wechsel werden nach Position durchnummeriert (t1 vor dem
 * Rad, t2 danach), Runden derselben Disziplin werden zusammengefasst.
 */
export function segmentsFromLaps(laps: SegmentLap[], startedAt: string | null): SegmentDraft[] {
  const ordered = [...laps].sort((a, b) => a.lapIndex - b.lapIndex);
  const raw = ordered.map((l) => ({ lap: l, type: classify(l) }));

  // Wechsel benennen: der erste Wechsel nach dem Schwimmen ist T1, der nächste T2.
  let transitions = 0;
  for (const r of raw) {
    if (r.type === "t1") {
      transitions += 1;
      r.type = transitions === 1 ? "t1" : "t2";
    }
  }

  const merged: { type: SegmentType; laps: SegmentLap[] }[] = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === r.type && r.type !== "t1" && r.type !== "t2") last.laps.push(r.lap);
    else merged.push({ type: r.type, laps: [r.lap] });
  }

  let cursorMs = startedAt ? Date.parse(startedAt) : NaN;
  return merged.map((group, i) => {
    const duration = group.laps.reduce((s, l) => s + (l.durationS ?? 0), 0);
    const distance = group.laps.reduce((s, l) => s + (l.distanceM ?? 0), 0);
    const weighted = (pick: (l: SegmentLap) => number | null | undefined) => {
      let num = 0;
      let den = 0;
      for (const l of group.laps) {
        const v = pick(l);
        const w = l.durationS ?? 0;
        if (v != null && w > 0) {
          num += v * w;
          den += w;
        }
      }
      return den > 0 ? Math.round((num / den) * 100) / 100 : null;
    };
    const started = Number.isFinite(cursorMs) ? new Date(cursorMs).toISOString() : null;
    if (Number.isFinite(cursorMs)) cursorMs += duration * 1000;
    const hr = weighted((l) => l.avgHr);
    const power = weighted((l) => l.avgPowerW);
    return {
      segment_index: i,
      segment_type: group.type,
      sport: group.laps[0]?.sport ?? null,
      started_at: started,
      duration_s: Math.round(duration),
      distance_m: distance > 0 ? Math.round(distance * 10) / 10 : null,
      avg_hr: hr != null ? Math.round(hr) : null,
      avg_speed_mps: duration > 0 && distance > 0 ? Math.round((distance / duration) * 1000) / 1000 : null,
      avg_power_w: power != null ? Math.round(power) : null,
      avg_cadence: weighted((l) => l.avgCadence),
    };
  });
}

/** True, wenn die Runden mindestens zwei verschiedene Ausdauer-Disziplinen enthalten. */
export function looksMultisport(laps: SegmentLap[]): boolean {
  const fams = new Set(
    laps
      .map((l) => (l.sport ?? "").toLowerCase())
      .map((s) => (SWIM.includes(s) ? "swim" : BIKE.includes(s) ? "bike" : RUN.includes(s) ? "run" : null))
      .filter(Boolean),
  );
  return fams.size >= 2;
}

/** SWOLF: Bahnzeit plus Züge je Bahn. */
export function swolf(lapTimeS: number, strokes: number): number {
  return Math.round((lapTimeS + strokes) * 10) / 10;
}

/**
 * Critical Swim Speed aus 400-m- und 200-m-Zeitfahren.
 * Ergebnis: Sekunden pro 100 m.
 */
export function cssPaceS100(t400S: number, t200S: number): number | null {
  const dt = t400S - t200S;
  if (dt <= 0) return null;
  return Math.round((dt / 2) * 10) / 10;
}
