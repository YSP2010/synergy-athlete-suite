/**
 * Bestleistungen aus importierten Aktivitäten ableiten.
 * Reine Funktionen – die Persistierung liegt in records.server.ts.
 */

export interface RecordActivity {
  id: string;
  sport: string;
  started_at: string | null;
  duration_s: number | null;
  moving_duration_s: number | null;
  distance_m: number | null;
  elevation_gain_m: number | null;
  avg_power_w: number | null;
  normalized_power_w: number | null;
}

export interface RecordCandidate {
  sport: string;
  metric: string;
  label: string;
  value: number;
  unit: string;
  activityId: string;
  achievedAt: string | null;
  /** true = kleinerer Wert ist besser (Zeiten). */
  lowerIsBetter: boolean;
}

/** Distanz-Marken je Sportart mit erlaubter Toleranz nach oben. */
const DISTANCE_MARKS: Record<string, { key: string; label: string; meters: number }[]> = {
  running: [
    { key: "fastest_1k", label: "Schnellster 1 km", meters: 1000 },
    { key: "fastest_5k", label: "Schnellste 5 km", meters: 5000 },
    { key: "fastest_10k", label: "Schnellste 10 km", meters: 10000 },
    { key: "fastest_hm", label: "Schnellster Halbmarathon", meters: 21097.5 },
    { key: "fastest_marathon", label: "Schnellster Marathon", meters: 42195 },
  ],
  swimming: [
    { key: "fastest_100m", label: "Schnellste 100 m", meters: 100 },
    { key: "fastest_400m", label: "Schnellste 400 m", meters: 400 },
  ],
};

/** Bis zu wie viel Prozent länger die Aktivität sein darf, um zu zählen. */
const TOLERANCE = 0.06;

/**
 * Ermittelt Bestleistungen. Zeiten werden auf die Zieldistanz hochgerechnet,
 * wenn die Aktivität etwas länger war (innerhalb der Toleranz).
 */
export function computeRecords(activities: RecordActivity[]): RecordCandidate[] {
  const best = new Map<string, RecordCandidate>();

  const consider = (c: RecordCandidate) => {
    const key = `${c.sport}:${c.metric}`;
    const cur = best.get(key);
    if (!cur) {
      best.set(key, c);
      return;
    }
    const better = c.lowerIsBetter ? c.value < cur.value : c.value > cur.value;
    if (better) best.set(key, c);
  };

  for (const a of activities) {
    const dur = a.moving_duration_s ?? a.duration_s;
    if (!a.sport) continue;

    if (a.distance_m && a.distance_m > 0) {
      consider({
        sport: a.sport,
        metric: "longest_distance",
        label: "Längste Distanz",
        value: Math.round(a.distance_m),
        unit: "m",
        activityId: a.id,
        achievedAt: a.started_at,
        lowerIsBetter: false,
      });
    }
    if (a.elevation_gain_m && a.elevation_gain_m > 0) {
      consider({
        sport: a.sport,
        metric: "most_elevation",
        label: "Meiste Höhenmeter",
        value: Math.round(a.elevation_gain_m),
        unit: "m",
        activityId: a.id,
        achievedAt: a.started_at,
        lowerIsBetter: false,
      });
    }
    const power = a.normalized_power_w ?? a.avg_power_w;
    if (power && dur && dur >= 1200) {
      consider({
        sport: a.sport,
        metric: "best_20min_power",
        label: "Beste 20-Minuten-Leistung",
        value: Math.round(power),
        unit: "W",
        activityId: a.id,
        achievedAt: a.started_at,
        lowerIsBetter: false,
      });
    }

    const marks = DISTANCE_MARKS[a.sport];
    if (!marks || !a.distance_m || !dur || dur <= 0) continue;
    for (const mark of marks) {
      if (a.distance_m < mark.meters) continue;
      if (a.distance_m > mark.meters * (1 + TOLERANCE)) continue;
      const scaled = Math.round((dur * mark.meters) / a.distance_m);
      consider({
        sport: a.sport,
        metric: mark.key,
        label: mark.label,
        value: scaled,
        unit: "s",
        activityId: a.id,
        achievedAt: a.started_at,
        lowerIsBetter: true,
      });
    }
  }

  return [...best.values()];
}

/** Beste Laufleistung für Prognosen (längste sauber gemessene Einheit). */
export function bestRunEffort(
  records: RecordCandidate[],
): { distanceM: number; timeS: number } | null {
  const marks = DISTANCE_MARKS["running"]!;
  let out: { distanceM: number; timeS: number } | null = null;
  for (const m of marks) {
    const rec = records.find((r) => r.sport === "running" && r.metric === m.key);
    if (rec && (!out || m.meters > out.distanceM)) out = { distanceM: m.meters, timeS: rec.value };
  }
  return out;
}
