import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { safeRelativePath, sha256Hex, sniffFileType } from "./detect";
import { unzipRecursive } from "./zip";
import { parseGpx, parseTcx, haversineM } from "./gpx";
import { mapFitSport, parseFitMessages } from "./fit";
import { findDuplicate } from "./duplicates";

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="Garmin"><trk><name>Morgenlauf</name><trkseg>
<trkpt lat="52.5200" lon="13.4050"><ele>34</ele><time>2026-01-05T06:00:00Z</time>
<extensions><TrackPointExtension><hr>120</hr><cad>82</cad></TrackPointExtension></extensions></trkpt>
<trkpt lat="52.5300" lon="13.4050"><ele>44</ele><time>2026-01-05T06:10:00Z</time>
<extensions><TrackPointExtension><hr>150</hr><cad>86</cad></TrackPointExtension></extensions></trkpt>
</trkseg></trk></gpx>`;

const ROUTE_GPX = `<?xml version="1.0"?>
<gpx version="1.1"><rte><name>Planstrecke</name>
<rtept lat="48.1" lon="11.5"><ele>500</ele></rtept>
<rtept lat="48.2" lon="11.5"><ele>520</ele></rtept>
</rte></gpx>`;

const TCX = `<?xml version="1.0"?>
<TrainingCenterDatabase><Activities><Activity Sport="Running"><Lap>
<DistanceMeters>1000</DistanceMeters><Calories>90</Calories><Track>
<Trackpoint><Time>2026-01-05T06:00:00Z</Time><Position><LatitudeDegrees>52.52</LatitudeDegrees><LongitudeDegrees>13.405</LongitudeDegrees></Position><AltitudeMeters>34</AltitudeMeters><HeartRateBpm><Value>130</Value></HeartRateBpm></Trackpoint>
<Trackpoint><Time>2026-01-05T06:05:00Z</Time><Position><LatitudeDegrees>52.53</LatitudeDegrees><LongitudeDegrees>13.405</LongitudeDegrees></Position><AltitudeMeters>40</AltitudeMeters><HeartRateBpm><Value>150</Value></HeartRateBpm></Trackpoint>
</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;

describe("sniffFileType", () => {
  it("erkennt FIT am .FIT-Header", () => {
    const bytes = new Uint8Array(16);
    bytes.set([0x2e, 0x46, 0x49, 0x54], 8);
    expect(sniffFileType(bytes)).toBe("fit");
  });
  it("erkennt ZIP, GPX, TCX und JSON", () => {
    expect(sniffFileType(zipSync({ "a.txt": strToU8("hi") }))).toBe("zip");
    expect(sniffFileType(strToU8(GPX))).toBe("gpx");
    expect(sniffFileType(strToU8(TCX))).toBe("tcx");
    expect(sniffFileType(strToU8('{"a":1}'))).toBe("json");
    expect(sniffFileType(strToU8("hallo welt"))).toBe("unknown");
  });
});

describe("safeRelativePath", () => {
  it("weist Traversal und absolute Pfade ab", () => {
    expect(safeRelativePath("../../etc/passwd")).toBeNull();
    expect(safeRelativePath("/etc/passwd")).toBeNull();
    expect(safeRelativePath("C:\\win\\x.fit")).toBeNull();
    expect(safeRelativePath("DI_CONNECT/a.fit")).toBe("DI_CONNECT/a.fit");
  });
});

describe("sha256Hex", () => {
  it("liefert stabile Hashes", async () => {
    const a = await sha256Hex(strToU8("abc"));
    expect(a).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await sha256Hex(strToU8("abd"))).not.toBe(a);
  });
});

describe("unzipRecursive", () => {
  it("entpackt verschachtelte Archive", () => {
    const inner = zipSync({ "run.gpx": strToU8(GPX) });
    const outer = zipSync({ "DI_CONNECT/inner.zip": inner, "note.txt": strToU8("x") });
    const res = unzipRecursive(outer, undefined, "export.zip");
    const paths = res.entries.map((e) => e.relativePath).sort();
    expect(paths).toContain("export.zip/DI_CONNECT/inner.zip/run.gpx");
    expect(paths).toContain("export.zip/note.txt");
  });

  it("stoppt bei Überschreiten der Limits", () => {
    const outer = zipSync({ "a.gpx": strToU8(GPX), "b.gpx": strToU8(GPX) });
    const res = unzipRecursive(outer, {
      maxDepth: 2,
      maxTotalBytes: 10,
      maxEntries: 10,
    });
    expect(res.truncated).toBe(true);
    expect(res.entries.length).toBeLessThan(2);
  });
});

describe("parseGpx", () => {
  it("berechnet Distanz, Höhenmeter und Herzfrequenz", () => {
    const a = parseGpx(GPX);
    expect(a.routeOnly).toBe(false);
    expect(a.name).toBe("Morgenlauf");
    expect(a.durationS).toBe(600);
    expect(a.distanceM).toBeGreaterThan(1000);
    expect(a.elevationGainM).toBeCloseTo(10, 1);
    expect(a.avgHr).toBe(135);
    expect(a.maxHr).toBe(150);
    expect(a.verified).toBe(false);
  });

  it("markiert GPX ohne Zeitstempel als reine Route", () => {
    const a = parseGpx(ROUTE_GPX);
    expect(a.routeOnly).toBe(true);
    expect(a.durationS).toBeNull();
    expect(a.samples).toHaveLength(2);
  });
});

describe("parseTcx", () => {
  it("liest Distanz und Kalorien aus den Laps", () => {
    const a = parseTcx(TCX);
    expect(a.sport).toBe("run");
    expect(a.distanceM).toBe(1000);
    expect(a.calories).toBe(90);
    expect(a.avgHr).toBe(140);
  });
});

describe("haversineM", () => {
  it("rechnet ~111 km pro Breitengrad", () => {
    expect(haversineM(0, 0, 1, 0)).toBeGreaterThan(110_000);
    expect(haversineM(0, 0, 1, 0)).toBeLessThan(112_000);
  });
});

describe("parseFitMessages", () => {
  const messages = {
    fileIdMesgs: [
      {
        manufacturer: "garmin",
        garminProduct: "forerunner965",
        serialNumber: 123456,
        timeCreated: new Date("2026-01-05T06:00:00Z"),
      },
    ],
    sessionMesgs: [
      {
        sport: "running",
        subSport: "generic",
        startTime: new Date("2026-01-05T06:00:00Z"),
        totalElapsedTime: 3600,
        totalTimerTime: 3540,
        totalDistance: 12000,
        avgHeartRate: 145,
        maxHeartRate: 178,
        totalAscent: 120,
      },
    ],
    recordMesgs: [
      {
        timestamp: new Date("2026-01-05T06:00:00Z"),
        positionLat: 626483567,
        positionLong: 159993884,
        heartRate: 130,
      },
      {
        timestamp: new Date("2026-01-05T06:00:10Z"),
        positionLat: 626483600,
        positionLong: 159993900,
        heartRate: 140,
      },
    ],
    lapMesgs: [{ totalTimerTime: 1800, totalDistance: 6000, avgHeartRate: 142 }],
  };

  it("normalisiert Session, Records und Geräte-Signatur", () => {
    const a = parseFitMessages(messages);
    expect(a.sport).toBe("run");
    expect(a.distanceM).toBe(12000);
    expect(a.verified).toBe(true);
    expect(a.deviceActivityKey).toBe(
      "garmin|forerunner965|123456|2026-01-05T06:00:00.000Z",
    );
    expect(a.samples[1].tOffsetS).toBe(10);
    expect(a.samples[0].lat).toBeCloseTo(52.52, 1);
    expect(a.laps).toHaveLength(1);
  });

  it("mappt Sportarten", () => {
    expect(mapFitSport("cycling", "indoor_cycling")).toBe("bike_indoor");
    expect(mapFitSport("swimming", "open_water")).toBe("swim_open");
    expect(mapFitSport("running", "trail")).toBe("trail_run");
  });
});

describe("findDuplicate", () => {
  const existing = [
    {
      deviceActivityKey: "garmin|965|1|2026-01-05T06:00:00.000Z",
      startedAt: "2026-01-05T06:00:00.000Z",
      durationS: 3600,
      distanceM: 12000,
    },
  ];

  it("erkennt identische Geräte-Signatur", () => {
    const hit = findDuplicate({ deviceActivityKey: existing[0].deviceActivityKey }, existing);
    expect(hit?.reason).toBe("device_key");
  });

  it("erkennt GPX-Duplikat per Heuristik", () => {
    const hit = findDuplicate(
      { startedAt: "2026-01-05T06:01:00.000Z", durationS: 3620, distanceM: 12050 },
      existing,
    );
    expect(hit?.reason).toBe("heuristic");
  });

  it("meldet keine Kollision bei anderer Einheit", () => {
    expect(
      findDuplicate(
        { startedAt: "2026-01-05T09:00:00.000Z", durationS: 1800, distanceM: 5000 },
        existing,
      ),
    ).toBeNull();
  });
});
