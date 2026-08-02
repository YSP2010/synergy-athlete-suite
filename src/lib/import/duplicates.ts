import type { ParsedActivity } from "./types";

export interface ActivityFingerprint {
  deviceActivityKey?: string | null;
  startedAt?: string | null;
  durationS?: number | null;
  distanceM?: number | null;
}

export type DuplicateReason = "device_key" | "heuristic" | null;

/**
 * Erkennt Duplikate. Priorität hat die Geräte-Signatur aus dem FIT-Header;
 * fällt sie weg (GPX/TCX), greift eine Heuristik: Start ±120 s, Dauer ±2 %,
 * Distanz ±1 %.
 */
export function findDuplicate(
  candidate: ActivityFingerprint,
  existing: ActivityFingerprint[],
): { match: ActivityFingerprint; reason: Exclude<DuplicateReason, null> } | null {
  if (candidate.deviceActivityKey) {
    const hit = existing.find((e) => e.deviceActivityKey === candidate.deviceActivityKey);
    if (hit) return { match: hit, reason: "device_key" };
  }
  if (!candidate.startedAt) return null;
  const startMs = Date.parse(candidate.startedAt);
  if (!Number.isFinite(startMs)) return null;

  for (const e of existing) {
    if (!e.startedAt) continue;
    const eStart = Date.parse(e.startedAt);
    if (!Number.isFinite(eStart)) continue;
    if (Math.abs(eStart - startMs) > 120_000) continue;
    if (!withinPct(candidate.durationS, e.durationS, 0.02)) continue;
    if (!withinPct(candidate.distanceM, e.distanceM, 0.01)) continue;
    return { match: e, reason: "heuristic" };
  }
  return null;
}

function withinPct(a: number | null | undefined, b: number | null | undefined, pct: number) {
  if (a == null || b == null) return true; // fehlender Wert schließt nicht aus
  if (a === 0 && b === 0) return true;
  const base = Math.max(Math.abs(a), Math.abs(b));
  return Math.abs(a - b) / base <= pct;
}

export function fingerprintOf(a: ParsedActivity): ActivityFingerprint {
  return {
    deviceActivityKey: a.deviceActivityKey ?? null,
    startedAt: a.startedAt ?? null,
    durationS: a.durationS ?? null,
    distanceM: a.distanceM ?? null,
  };
}
