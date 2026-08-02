# Hybrid Athlete: Garmin, Strecken, Bestenliste, Triathlon

Gesamtfahrplan über 6 Etappen. Umgesetzt wird nacheinander — nach jeder Etappe kannst du testen, bevor die nächste startet.

Abweichung vom Dokument (bewusst): Serverlogik läuft nicht über Supabase Edge Functions, sondern über TanStack-Serverfunktionen (`src/lib/*.functions.ts`) bzw. öffentliche API-Routen unter `src/routes/api/public/*` für Cron. Das entspricht dem bestehenden Muster (`scan.functions.ts`, `insights.functions.ts`).

---

## Etappe 1 — Import-Pipeline (FIT / GPX / TCX / Garmin-ZIP)

**Datenbank**
- Enum `import_status`; Tabellen `import_jobs`, `import_files` (inkl. `content_hash` mit `UNIQUE(user_id, content_hash)`), RLS `auth.uid() = user_id`, GRANTs, `updated_at`-Trigger.
- Privater Storage-Bucket `imports`, Policies analog `food-scans` (Ordner = `auth.uid()`).

**Server**
- `import.functions.ts`: Job anlegen + signierte Upload-URLs; Verarbeitung in Blöcken (ca. 25 Dateien pro Aufruf, selbst-fortsetzend, idempotent, pro Datei try/catch); Retry fehlgeschlagener Dateien; Job löschen (Rohdateien, optional Aktivitäten).
- Parser als reine Funktionen in `src/lib/import/` (FIT via `@garmin/fitsdk`, GPX/TCX via `fast-xml-parser`), Erkennung nach Dateiinhalt statt Pfad, rekursives Entpacken max. 3 Ebenen mit Zip-Bomben- und Path-Traversal-Schutz.
- Duplikaterkennung dreistufig: content_hash → FIT `file_id`-Schlüssel → Heuristik (Start ±120 s, Distanz ±1 %). Reichhaltigere Datei ergänzt vorhandene Aktivität, überschreibt aber nie nutzerbearbeitete Felder.

**Frontend**
- Neue Route `/import` (Drag & Drop, Ordner-Upload, Fortschritt live über Realtime, Import-Historie bis auf Dateiebene, Retry/Undo, Garmin-Export-Anleitung).
- Link aus `settings.tsx`, Eintrag in `AppShell.tsx` (Sidebar + Bottom-Tabs).
- Vitest-Tests für Parser und Duplikatlogik.

---

## Etappe 2 — Aktivitäten & Strecken

- Enums `activity_sport`, `activity_source`; Tabellen `activities`, `activity_samples`, `activity_laps`, `courses`, `course_points`, `course_efforts` samt RLS (eigene Daten, `is_public` bei Strecken, `coach_can_view_athlete`).
- Parser schreibt jetzt echte Aktivitäten; reine Routen-GPX (ohne `<time>`) erzeugen nur eine Strecke.
- Strecken-Matching als reine Funktion in `src/lib/geo.ts` (Startpunkt-Umkreis + Distanzfilter, dann Punktfolgen-Vergleich) mit Tests.
- Routen `/activities`, `/activities/$id`, `/courses`, `/courses/$id`: Karten (MapLibre GL, keyfreie Tiles), Höhenprofil und Charts mit Recharts, Export GPX/TCX.
- Nullable `activity_id` in `workouts_sport` / `workouts_gym`, damit echte Garmin-Werte optional die manuellen Schätzungen ersetzen — ohne Verknüpfung bleibt alles wie bisher.

---

## Etappe 3 — Auswertung

- Wellness-Tabellen `wellness_daily`, `sleep_logs`, `hrv_logs`, `user_metrics` (Upsert auf `(user_id, date)`), gespeist aus JSON/HRV-Dateien des Konto-Exports. Fehlende Felder bleiben NULL und werden im UI ausgeblendet.
- `src/lib/analytics/` als reine Funktionen mit Tests: HR-/Pace-/Power-Zonen, TRIMP, TSS/rTSS/sTSS, CTL/ATL/TSB, ACWR-Ampel, Monotonie/Strain, EF, Pa:Hr-Decoupling, GAP, Riegel- und VO2max-Prognosen, Critical Power/CSS.
- `personal_records` automatisch nach jedem Import fortschreiben.
- Routen `/analytics` (Tabs Übersicht/Belastung/Ausdauer/Effizienz/Schlaf, globaler Zeitraum-Umschalter) und `/records`.
- Integration: Recovery-Score in `planner.ts` bevorzugt Gerätedaten mit unveränderter Signatur und Fallback; `/plan` schlägt bei TSB < −30 oder ACWR > 1.5 Entlastung vor; `/athletes/$id` bekommt einen lesenden Analytics-Reiter (Ernährung, Scanner, Tagebuch bleiben gesperrt).

---

## Etappe 4 — Bestenliste (Opt-in)

- `profiles`: `leaderboard_opt_in`, `leaderboard_display_name`, `leaderboard_share_health`. Ohne Opt-in taucht niemand auf; Gesundheitskategorien nur mit zweiter Zustimmung; Ausstieg löscht Einträge sofort.
- Enums `leaderboard_scope`, `leaderboard_period`; Tabellen `leaderboard_categories` (Stammdaten, schreibgeschützt) und `leaderboard_entries`; Lesezugriff über SECURITY-DEFINER-Funktion `get_leaderboard(...)`.
- Fairness: nur `activities.verified = true` (FIT mit Gerätesignatur), Plausibilitätsgrenzen, Bestzeiten aus gleitendem Fenster der Zeitreihe, Rate-Limit auf Neuberechnung.
- Neuberechnung über eine Cron-fähige Route `src/routes/api/public/leaderboard-recompute.ts` mit Secret-Prüfung, inkrementell.
- Route `/leaderboard` (Scope-/Zeitraum-Umschalter, Kategorie-Chips, Podium, eigener Rang angeheftet) plus Abschnitt „Bestenliste & Sichtbarkeit" in `/settings`.

---

## Etappe 5 — Triathlon

- Tabellen `multisport_segments`, `swim_metrics`, `races`, `equipment` (+ `equipment_id` an `activities`, Kilometerstand und Verschleißwarnung).
- Disziplin-Auswertung: SWOLF/CSS, FTP/NP/IF/Power-Duration, GAP/rTSS, T1/T2-Wechselzeiten, Decoupling Rad→Lauf.
- Planer lernt Schwimmen, Rad, Lauf, Brick, Kraft, Regeneration; Wochen-TSS-Ziel; Pacing-Plan und Taper-Vorschlag vor A-Rennen.
- Routen `/triathlon`, `/races`, `/races/$id`, `/equipment`; Segment-Zeitstrahl in `/activities/$id`.

---

## Etappe 6 — Datenschutz, Performance, Qualität

- `/privacy` im angemeldeten Bereich, versionierte `consents`-Tabelle, vollständiger ZIP-Export (JSON + GPX), Kontolöschung inkl. Storage und Bestenlisten-Einträgen.
- Performance: serverseitiges Downsampling der `activity_samples` auf ~500 Punkte pro Chart, Paginierung, Polyline-Previews, Indizes und EXPLAIN für Leaderboard-Abfragen.
- Zuverlässigkeit: Vitest für Analytics, Matching, Parser, Leaderboard-Plausibilität; Import-Diagnose je Job.

---

## Technische Hinweise

- Alle neuen Tabellen: `user_id` → `auth.users` ON DELETE CASCADE, GRANTs an `authenticated`/`service_role`, RLS aktiviert, Coach-Lesezugriff ausschließlich über `coach_can_view_athlete(user_id)`.
- Bestehende SECURITY-DEFINER-Helper werden wiederverwendet, nicht dupliziert.
- Jede `*.functions.ts` bleibt eine dünne Hülle; Helfer liegen in `.server.ts`/`src/lib/`.
- UI deutsch, metrisch, bestehende Tokens aus `src/styles.css`, keine neuen Farben.
- Bekannte Risiken: FIT-SDK und ZIP-Entpacken müssen in der Worker-Laufzeit laufen (reines JS/WASM, kein Node-Binary); sehr große Konto-Exporte werden über Chunking und Streaming verarbeitet.
