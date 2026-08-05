/**
 * Wellness aus dem Samsung-Health-Export (CSV-Dateien in der ZIP).
 *
 * Samsung legt je Datentyp eine CSV an. Üblich: erste Zeile Titel/Version,
 * zweite Zeile Kopf, danach Daten. Der Typ steckt im Dateinamen
 * (…pedometer_day_summary…, …sleep…, …heart_rate…). Reine Inhaltszuordnung,
 * fehlende/unbekannte Spalten werden weggelassen (nie null geschrieben).
 */
import {
  emptyBundle,
  type WellnessBundle,
  type WellnessDailyRow,
  type SleepRow,
} from "./wellness";

export function parseSamsungCsv(text: string, filename: string): WellnessBundle {
  const name = filename.toLowerCase();
  const rows = parseCsv(text);
  if (!rows.length) return emptyBundle();
  const header = findHeader(rows);
  if (!header) return emptyBundle();
  const { cols, dataStart } = header;
  const data = rows.slice(dataStart);

  if (name.includes("pedometer") || name.includes("step")) return steps(cols, data);
  if (name.includes("sleep")) return sleep(cols, data);
  if (name.includes("heart_rate") || name.includes("heartrate")) return heart(cols, data);
  if (name.includes("stress")) return stress(cols, data);
  // Fallback: generische Tages-CSV mit Datums- und Schrittspalte.
  return steps(cols, data);
}

/** Sehr einfacher CSV-Splitter mit Anführungszeichen-Handling. */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    out.push(cells.map((s) => s.trim()));
  }
  return out;
}

/**
 * Findet die Kopfzeile: unter den ersten Zeilen die mit einer Datums-Spalte
 * UND den meisten Spalten. So verliert Samsungs 2-spaltige Titelzeile gegen
 * die eigentliche, breite Kopfzeile.
 */
function findHeader(rows: string[][]): { cols: Record<string, number>; dataStart: number } | null {
  let best: { cols: Record<string, number>; dataStart: number; width: number } | null = null;
  for (let i = 0; i < Math.min(rows.length, 4); i++) {
    const cells = rows[i];
    if (cells.length < 2) continue;
    const cols: Record<string, number> = {};
    cells.forEach((h, idx) => (cols[h.toLowerCase()] = idx));
    const hasDate = Object.keys(cols).some((k) => /(^|_)(time|date|day)/.test(k));
    if (!hasDate) continue;
    if (!best || cells.length > best.width) best = { cols, dataStart: i + 1, width: cells.length };
  }
  return best ? { cols: best.cols, dataStart: best.dataStart } : null;
}

function col(cols: Record<string, number>, ...names: string[]): number | null {
  for (const n of names) {
    for (const key of Object.keys(cols)) {
      if (key === n || key.includes(n)) return cols[key];
    }
  }
  return null;
}

function isoDay(raw: string | undefined): string | null {
  if (!raw) return null;
  const num = Number(raw);
  if (Number.isFinite(num) && num > 1_000_000_000) {
    return new Date(num > 1e12 ? num : num * 1000).toISOString().slice(0, 10);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

function num(cell: string | undefined): number | null {
  if (cell == null || cell === "") return null;
  const n = Number(cell);
  return Number.isFinite(n) ? n : null;
}

function steps(cols: Record<string, number>, data: string[][]): WellnessBundle {
  const out = emptyBundle();
  const cDate = col(cols, "day_time", "start_time", "date", "create_time");
  const cSteps = col(cols, "step_count", "count", "step");
  const cDist = col(cols, "distance");
  const cCal = col(cols, "calorie");
  if (cDate == null) return out;
  const perDay = new Map<string, WellnessDailyRow>();
  for (const r of data) {
    const day = isoDay(r[cDate]);
    if (!day) continue;
    const row = perDay.get(day) ?? { date: day };
    if (cSteps != null) {
      const v = num(r[cSteps]);
      if (v != null) row.steps = (row.steps ?? 0) + v;
    }
    if (cDist != null) {
      const v = num(r[cDist]);
      if (v != null) row.distance_m = (row.distance_m ?? 0) + v;
    }
    if (cCal != null) {
      const v = num(r[cCal]);
      if (v != null) row.active_kcal = (row.active_kcal ?? 0) + v;
    }
    perDay.set(day, row);
  }
  for (const row of perDay.values()) {
    if (Object.keys(row).length > 1) out.wellness.push(row);
  }
  return out;
}

function sleep(cols: Record<string, number>, data: string[][]): WellnessBundle {
  const out = emptyBundle();
  const cStart = col(cols, "start_time", "sleep_start", "bedtime");
  const cEnd = col(cols, "end_time", "sleep_end", "wakeup");
  if (cStart == null || cEnd == null) return out;
  for (const r of data) {
    const start = r[cStart];
    const end = r[cEnd];
    const day = isoDay(end) ?? isoDay(start);
    if (!day) continue;
    const ms = Date.parse((end ?? "").replace(" ", "T")) - Date.parse((start ?? "").replace(" ", "T"));
    const row: SleepRow = { date: day };
    if (start) row.sleep_start = start;
    if (end) row.sleep_end = end;
    if (Number.isFinite(ms) && ms > 0) row.duration_s = Math.round(ms / 1000);
    if (Object.keys(row).length > 1) out.sleep.push(row);
  }
  return out;
}

function heart(cols: Record<string, number>, data: string[][]): WellnessBundle {
  const out = emptyBundle();
  const cDate = col(cols, "start_time", "date", "create_time");
  const cHr = col(cols, "heart_rate", "heart_beat", "min");
  if (cDate == null || cHr == null) return out;
  const perDay = new Map<string, number[]>();
  for (const r of data) {
    const day = isoDay(r[cDate]);
    const hr = num(r[cHr]);
    if (!day || hr == null) continue;
    const list = perDay.get(day) ?? [];
    list.push(hr);
    perDay.set(day, list);
  }
  for (const [date, list] of perDay) {
    if (!list.length) continue;
    out.wellness.push({
      date,
      min_hr: Math.round(Math.min(...list)),
      max_hr: Math.round(Math.max(...list)),
      resting_hr: Math.round(Math.min(...list)),
    });
  }
  return out;
}

function stress(cols: Record<string, number>, data: string[][]): WellnessBundle {
  const out = emptyBundle();
  const cDate = col(cols, "start_time", "date", "create_time");
  const cVal = col(cols, "score", "stress");
  if (cDate == null || cVal == null) return out;
  const perDay = new Map<string, number[]>();
  for (const r of data) {
    const day = isoDay(r[cDate]);
    const v = num(r[cVal]);
    if (!day || v == null) continue;
    const list = perDay.get(day) ?? [];
    list.push(v);
    perDay.set(day, list);
  }
  for (const [date, list] of perDay) {
    if (!list.length) continue;
    out.wellness.push({
      date,
      avg_stress: Math.round(list.reduce((a, b) => a + b, 0) / list.length),
      max_stress: Math.round(Math.max(...list)),
    });
  }
  return out;
}
