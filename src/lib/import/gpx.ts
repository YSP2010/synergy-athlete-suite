import { XMLParser } from "fast-xml-parser";
import { ParseError, type ParsedActivity, type ParsedSample } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  parseAttributeValue: true,
  removeNSPrefix: true,
});

type Node = Record<string, unknown>;

/** Normalisiert XML-Knoten zu einer Liste (fast-xml-parser liefert Einzelobjekte). */
function arr(v: unknown): Node[] {
  if (v === undefined || v === null) return [];
  const list = Array.isArray(v) ? v : [v];
  return list.filter((x): x is Node => typeof x === "object" && x !== null);
}

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const R_EARTH_M = 6_371_000;

/** Haversine-Distanz in Metern. */
export function haversineM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

function finalize(
  sport: string,
  name: string | null,
  samples: ParsedSample[],
  startMs: number | null,
  hasTimes: boolean,
): ParsedActivity {
  let distance = 0;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
      distance += haversineM(a.lat, a.lng, b.lat, b.lng);
    }
    if (a.altitudeM != null && b.altitudeM != null) {
      const d = b.altitudeM - a.altitudeM;
      if (d > 0) gain += d;
      else loss -= d;
    }
  }
  const hrs = samples.map((s) => s.hr).filter((h): h is number => h != null);
  const cads = samples.map((s) => s.cadence).filter((c): c is number => c != null);
  const pows = samples.map((s) => s.powerW).filter((p): p is number => p != null);
  const durationS = hasTimes && samples.length ? samples[samples.length - 1].tOffsetS : null;

  const avg = (arr: number[]) =>
    arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

  return {
    routeOnly: !hasTimes,
    sport,
    name,
    startedAt: startMs != null ? new Date(startMs).toISOString() : null,
    durationS,
    movingDurationS: null,
    distanceM: distance > 0 ? Number(distance.toFixed(1)) : null,
    elevationGainM: gain > 0 ? Number(gain.toFixed(1)) : null,
    elevationLossM: loss > 0 ? Number(loss.toFixed(1)) : null,
    avgSpeedMps:
      durationS && durationS > 0 && distance > 0
        ? Number((distance / durationS).toFixed(3))
        : null,
    avgHr: avg(hrs) != null ? Math.round(avg(hrs)!) : null,
    maxHr: hrs.length ? Math.max(...hrs) : null,
    avgCadence: avg(cads),
    maxCadence: cads.length ? Math.max(...cads) : null,
    avgPowerW: avg(pows) != null ? Math.round(avg(pows)!) : null,
    maxPowerW: pows.length ? Math.max(...pows) : null,
    // Ohne Gerätesignatur bleibt alles Weitere unbekannt – nicht schätzen.
    verified: false,
    samples,
    laps: [],
  };
}

/** Parst eine GPX-Datei. Ohne <time>-Elemente gilt sie als reine Route. */
export function parseGpx(xml: string): ParsedActivity {
  const doc = parser.parse(xml) as Node;
  const gpx = doc["gpx"] as Node | undefined;
  if (!gpx) throw new ParseError("Kein <gpx>-Element gefunden");

  const tracks = arr(gpx["trk"]);
  const routes = arr(gpx["rte"]);
  const name =
    (tracks[0]?.["name"] as string | undefined) ??
    (routes[0]?.["name"] as string | undefined) ??
    (gpx["metadata"] as Node | undefined)?.["name"] ??
    null;

  const points: Node[] = [];
  for (const trk of tracks) {
    for (const seg of arr(trk["trkseg"])) {
      points.push(...arr(seg["trkpt"]));
    }
  }
  for (const rte of routes) {
    points.push(...arr(rte["rtept"]));
  }
  if (!points.length) throw new ParseError("GPX enthält keine Punkte");

  let startMs: number | null = null;
  let hasTimes = false;
  const samples: ParsedSample[] = [];

  for (const p of points) {
    const lat = num(p["@lat"]);
    const lng = num(p["@lon"]);
    const timeRaw = p["time"];
    let t = 0;
    if (timeRaw != null) {
      const ms = Date.parse(String(timeRaw));
      if (Number.isFinite(ms)) {
        hasTimes = true;
        if (startMs == null) startMs = ms;
        t = Math.round((ms - startMs) / 1000);
      }
    }
    const ext = p["extensions"] as Node | undefined;
    const tpe = ext?.["TrackPointExtension"] as Node | undefined;
    samples.push({
      tOffsetS: t,
      lat,
      lng,
      altitudeM: num(p["ele"]),
      hr: num(tpe?.["hr"]) ?? num(ext?.["hr"]),
      cadence: num(tpe?.["cad"]) ?? num(ext?.["cad"]),
      temperatureC: num(tpe?.["atemp"]),
      powerW: num(ext?.["power"]),
    });
  }

  return finalize("other", typeof name === "string" ? name : null, samples, startMs, hasTimes);
}

/** Parst eine TCX-Datei (Garmin Training Center). */
export function parseTcx(xml: string): ParsedActivity {
  const doc = parser.parse(xml) as Node;
  const db = doc["TrainingCenterDatabase"] as Node | undefined;
  if (!db) throw new ParseError("Kein <TrainingCenterDatabase>-Element gefunden");
  const activities = db["Activities"] as Node | undefined;
  const activity = arr(activities?.["Activity"])[0] as Node | undefined;
  if (!activity) throw new ParseError("TCX enthält keine Aktivität");

  const sportRaw = String(activity["@Sport"] ?? "other").toLowerCase();
  const sport = sportRaw === "biking" ? "bike" : sportRaw === "running" ? "run" : "other";

  let startMs: number | null = null;
  let hasTimes = false;
  const samples: ParsedSample[] = [];
  let totalDistance = 0;
  let calories = 0;

  for (const lap of arr(activity["Lap"])) {
    totalDistance += num(lap["DistanceMeters"]) ?? 0;
    calories += num(lap["Calories"]) ?? 0;
    for (const track of arr(lap["Track"])) {
      for (const tp of arr(track["Trackpoint"])) {
        const ms = Date.parse(String(tp["Time"] ?? ""));
        let t = 0;
        if (Number.isFinite(ms)) {
          hasTimes = true;
          if (startMs == null) startMs = ms;
          t = Math.round((ms - startMs) / 1000);
        }
        const pos = tp["Position"] as Node | undefined;
        const hrNode = tp["HeartRateBpm"] as Node | undefined;
        const ext = tp["Extensions"] as Node | undefined;
        const tpx = ext?.["TPX"] as Node | undefined;
        samples.push({
          tOffsetS: t,
          lat: num(pos?.["LatitudeDegrees"]),
          lng: num(pos?.["LongitudeDegrees"]),
          altitudeM: num(tp["AltitudeMeters"]),
          hr: num(hrNode?.["Value"]),
          cadence: num(tp["Cadence"]) ?? num(tpx?.["RunCadence"]),
          speedMps: num(tpx?.["Speed"]),
          powerW: num(tpx?.["Watts"]),
        });
      }
    }
  }
  if (!samples.length) throw new ParseError("TCX enthält keine Messpunkte");

  const result = finalize(sport, null, samples, startMs, hasTimes);
  if (totalDistance > 0) result.distanceM = Number(totalDistance.toFixed(1));
  if (calories > 0) result.calories = Math.round(calories);
  return result;
}
