/**
 * Zentrale Weiche für Wellness-Dateien aller Hersteller. Der Garmin-Parser
 * bleibt unverändert die erste Wahl für JSON; erkennt er nichts, greift der
 * Google/Fitbit-Fallback. Neue Hersteller kommen nur hier und als eigene
 * Parser-Datei hinzu – import.server.ts muss dafür nicht mehr angefasst werden.
 */
import { parseWellnessJson, bundleSize, emptyBundle, type WellnessBundle } from "./wellness";
import { parseGoogleFitbit } from "./google-fitbit";
import { parseSamsungCsv } from "./samsung-health";
import { parseAppleHealth } from "./apple-health";
import type { ImportFileType } from "./types";

export async function parseWellnessFile(
  fileType: ImportFileType,
  bytes: Uint8Array,
  filename?: string,
): Promise<WellnessBundle> {
  try {
    if (fileType === "apple_health") return parseAppleHealth(bytes);

    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

    if (fileType === "csv") return parseSamsungCsv(text, filename ?? "");

    if (fileType === "json") {
      // Garmin zuerst – bewährt und mit Tests abgesichert.
      const garmin = parseWellnessJson(text);
      if (bundleSize(garmin) > 0) return garmin;
      // Sonst Google Takeout / Fitbit versuchen.
      return parseGoogleFitbit(text, filename ?? "");
    }

    return emptyBundle();
  } catch {
    // Nie werfen: eine unlesbare Datei wird still übersprungen.
    return emptyBundle();
  }
}
