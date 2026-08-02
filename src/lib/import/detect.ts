import type { ImportFileType } from "./types";

/**
 * Erkennt den Dateityp am Inhalt, nicht am Dateinamen – Garmin ändert
 * Ordner- und Dateinamen im Konto-Export gelegentlich.
 */
export function sniffFileType(bytes: Uint8Array): ImportFileType {
  if (bytes.length >= 12) {
    // FIT: Bytes 8..11 == ".FIT"
    if (
      bytes[8] === 0x2e &&
      bytes[9] === 0x46 &&
      bytes[10] === 0x49 &&
      bytes[11] === 0x54
    ) {
      return "fit";
    }
  }
  // ZIP: PK\x03\x04 (bzw. leere/gespannte Archive)
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const b2 = bytes[2];
    const b3 = bytes[3];
    if ((b2 === 3 && b3 === 4) || (b2 === 5 && b3 === 6) || (b2 === 7 && b3 === 8)) {
      return "zip";
    }
  }

  const head = decodeHead(bytes, 2048).trimStart();
  if (!head) return "unknown";
  if (head.startsWith("{") || head.startsWith("[")) return "json";
  if (/<\s*TrainingCenterDatabase/i.test(head)) return "tcx";
  if (/<\s*gpx[\s>]/i.test(head)) return "gpx";
  if (head.startsWith("<?xml")) {
    if (/TrainingCenterDatabase/i.test(head)) return "tcx";
    if (/<gpx/i.test(head)) return "gpx";
  }
  return "unknown";
}

function decodeHead(bytes: Uint8Array, max: number): string {
  const slice = bytes.subarray(0, Math.min(max, bytes.length));
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch {
    return "";
  }
}

/** SHA-256 als Hex-String (Web Crypto, läuft in der Worker-Laufzeit). */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Weist Pfad-Traversal ("../", absolute Pfade) ab und normalisiert Trenner. */
export function safeRelativePath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return null;
  if (normalized.split("/").some((seg) => seg === "..")) return null;
  return normalized.slice(0, 500);
}
