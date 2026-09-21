// XP-Formeln – SPIEGEL der SQL-Funktion public.compute_and_store_xp
// (supabase/migrations/20260921140000_gamification_core.sql).
// Diese TS-Funktionen dienen Tests & optionaler Client-Schaetzung; die DB ist
// die maßgebliche Quelle. Beide MUESSEN synchron bleiben.

export const XP = {
  GYM_BASE: 25,
  GYM_VOLUME_DIVISOR: 500, // 1 XP je 500 kg Gesamtvolumen
  GYM_VOLUME_CAP: 50,
  GYM_RPE_BONUS: 10,
  GYM_RPE_THRESHOLD: 8,

  SPORT_BASE: 25,
  SPORT_MIN_PER_XP: 3, // 1 XP je 3 Minuten
  SPORT_DURATION_CAP: 40,
  SPORT_INTENSITY_BONUS: { low: 0, mid: 10, high: 20 },

  ACTIVITY_BASE: 20,
  ACTIVITY_DISTANCE_DIVISOR: 500, // 2 XP je km
  ACTIVITY_DISTANCE_CAP: 150,
  ACTIVITY_DURATION_DIVISOR: 300, // 1 XP je 5 min
  ACTIVITY_DURATION_CAP: 60,
} as const;

export type Intensity = "low" | "mid" | "high";

export function gymSessionXp(input: { volumeKg: number; avgRpe?: number | null }): number {
  const vol = Math.max(0, input.volumeKg || 0);
  const volumeBonus = Math.min(XP.GYM_VOLUME_CAP, Math.floor(vol / XP.GYM_VOLUME_DIVISOR));
  const rpeBonus = (input.avgRpe ?? 0) >= XP.GYM_RPE_THRESHOLD ? XP.GYM_RPE_BONUS : 0;
  return XP.GYM_BASE + volumeBonus + rpeBonus;
}

export function sportSessionXp(input: { durationMin: number; intensity: Intensity }): number {
  const dur = Math.max(0, input.durationMin || 0);
  const durationBonus = Math.min(XP.SPORT_DURATION_CAP, Math.floor(dur / XP.SPORT_MIN_PER_XP));
  const intensityBonus = XP.SPORT_INTENSITY_BONUS[input.intensity] ?? 0;
  return XP.SPORT_BASE + durationBonus + intensityBonus;
}

export function activityXp(input: { distanceM: number; durationS: number }): number {
  const dist = Math.max(0, input.distanceM || 0);
  const dur = Math.max(0, input.durationS || 0);
  const distanceBonus = Math.min(
    XP.ACTIVITY_DISTANCE_CAP,
    Math.floor(dist / XP.ACTIVITY_DISTANCE_DIVISOR),
  );
  const durationBonus = Math.min(
    XP.ACTIVITY_DURATION_CAP,
    Math.floor(dur / XP.ACTIVITY_DURATION_DIVISOR),
  );
  return XP.ACTIVITY_BASE + distanceBonus + durationBonus;
}
