# Hybrid Athlete Performance Planner

Dark-Mode Dashboard (Anthrazit + Neon-Grün `#39FF14`) für Sportler mit Fußball + 3x Gym. Alles tiefgründig ausgearbeitet, aber in klar abgegrenzten Etappen gebaut. Backend via Lovable Cloud, KI via Lovable AI Gateway (Gemini für Foto-Scan).

## Design-System

- Farben: `background #0a0a0b`, `card #141518`, `elevated #1f2024`, `border rgba(255,255,255,0.08)`, `accent #39FF14`, `accent-glow`, Ampel `red/amber/green`.
- Typo: Inter (Body) + Space Grotesk (Headlines/Zahlen), Tabular Nums für Metriken.
- Komponenten: shadcn/ui, Lucide Icons, Recharts (Trends), Sonner (Toasts).
- Layout: Sidebar-Nav (Desktop) + Bottom-Tab-Bar (Mobile, 390px optimiert), zentrale Design-Tokens in `src/styles.css`.

## Datenmodell (Supabase)

- `profiles`: id (auth.users FK), name, geburtsdatum, geschlecht, groesse_cm, gewicht_kg, sportart, position, ernaehrungsstil, allergien[], ziel (`muscle_gain|maintain|recomp|performance`), gym_tage[], sport_tage[], spieltage[], created_at.
- `workouts_gym`: id, user_id, datum, typ (`push|pull|legs|upper|lower|full|light`), dauer_min, notiz, status.
- `gym_exercises`: id, workout_id, name, saetze, wdh, gewicht_kg, rpe.
- `workouts_sport`: id, user_id, datum, art (`training|spiel`), intensitaet (`low|mid|high`), dauer_min, spiel_haerte (`easy|normal|hard`), notiz.
- `daily_stats`: id, user_id, datum (unique/user), gewicht_kg, schlaf_h, schlaf_qualitaet (1-5), stimmung (1-5), muskelkater (1-5), stress (1-5).
- `nutrition_logs`: id, user_id, datum, mahlzeit (`breakfast|lunch|dinner|snack`), name, kcal, protein_g, carbs_g, fett_g, quelle (`manual|scan`).
- `food_scans`: id, user_id, foto_url, extracted_json, health_score (0-10), plan_fit_score (0-10), begruendung, created_at.
- `journal_entries`: id, user_id, datum, titel, inhalt, tags[], mood (1-5).
- `weekly_planner`: id, user_id, woche_start, plan_json (generiert), locked bool.
- `recovery_scores` (view/materialized): user_id, datum, score 0-100, ampel.
- Storage-Bucket `food-scans` (privat, RLS auf `auth.uid()`).
- RLS überall: `auth.uid() = user_id`, plus `GRANT`s an authenticated/service_role.

## Kern-Logik (Server Functions)

- `calcRecoveryScore(user, datum)`: gewichtet Schlaf (35%), Schlafqualität (10%), Muskelkater (20%, invers), Stress (10%), Trainingsload letzte 72h (25%). Output 0-100 + Ampel (≥75 grün, 50-74 gelb, <50 rot).
- `calcDailyMacros(profile, plan, datum)`: Mifflin-St Jeor BMR → TDEE via Aktivitätsfaktor abhängig von heutiger Trainingsart. Ziel-Modifier: muscle_gain +10%, recomp -5%, maintain 0, performance +5%. Protein 2.0 g/kg, Fett 1.0 g/kg, Rest Carbs. Am Tag vor „hartem Spiel" + Spieltag Carbs auf 7–8 g/kg (Carbo-Loading), Fett reduziert.
- `generateWeekPlan(user, woche)`: legt Gym-/Sport-Slots basierend auf Profil. Regel: kein Beintraining in den 48h vor `spiel_haerte='hard'` → wird auf `light` (Mobility/Oberkörper leicht) gesetzt oder verschoben. Bei Recovery <50 wird nächste geplante harte Einheit auf „Active Recovery" (Mobility, Stretching, Zone-1-Cardio 20 min) getauscht.
- `foodScanAnalyze(fotoUrl, profileCtx)`: ruft `google/gemini-3-flash-preview` mit Bild + JSON-Schema auf → extrahiert Nährwerte + berechnet health_score (Zucker, gesättigte Fette, Ballaststoffe, Protein, Zusatzstoffe) und plan_fit_score (Passung zu Tagesziel/Restmakros/Ziel/Allergien). Speichert in `food_scans`, verlinkt optional in `nutrition_logs`.
- `nutritionRecommendations(user, datum)`: vergleicht Ist vs. Soll → konkrete Vorschläge („Noch 45 g Protein: 200 g Magerquark + 30 g Whey").

## Views / Ansichten

1. **Onboarding-Wizard**: Basics → Sportprofil (Fußball, Position, Gym-Tage, Spieltage) → Ernährung (Stil, Allergien) → Ziel. Speichert `profiles`, generiert erste Woche.
2. **Dashboard** `/`: Recovery-Ring (0-100 + Ampel), Kcal/Makros-Ringe mit Rest, heutige Einheiten, Warnungen („Spiel Sonntag: kein Beintraining Fr/Sa"), Streaks.
3. **Wochenplaner** `/plan`: 7-Tage-Grid (Mobile: horizontal scroll), Chips für Gym/Sport/Spiel/Light/Recovery, Drag zum Verschieben, „Spielhärte" pro Spiel setzbar → triggert Re-Planung + Carbo-Loading-Hinweise.
4. **Gym-Logger** `/gym/[id]`: Übungen mit Sätzen/Wdh/Gewicht/RPE, Vorschläge aus letzter Session, Timer.
5. **Sport-Logger** `/sport/[id]`: Art, Intensität, Dauer, Spielhärte, RPE.
6. **Daily Check-in** `/checkin`: Gewicht, Schlaf h+Q, Muskelkater, Stress, Stimmung → aktualisiert Recovery.
7. **Ernährung** `/nutrition`: Tages-Log (Mahlzeiten), Makro-Balken, KI-Empfehlungen, Verlauf 7/30 Tage.
8. **Food-Scanner** `/scan`: Kamera/Upload → KI-Auswertung → Health-Score + Plan-Fit-Score + Begründung + Button „Zur Mahlzeit hinzufügen".
9. **Tagebuch** `/journal`: Einträge pro Tag, Tags, Mood, Suche, Verknüpfung mit Trainings-/Recovery-Daten des Tages.
10. **Trends** `/trends`: Gewicht, Schlaf, Recovery, Volumen (Gym), Sport-Load – Recharts.
11. **Profil/Settings** `/settings`: Profil bearbeiten, Ziel wechseln (löst Neuberechnung aus), Abmelden.

## Auth

- Lovable Cloud aktivieren, `configure_social_auth` für Google.
- Auth-Seite `/auth` (E-Mail/Passwort + Google), alles andere unter `_authenticated/`.

## Etappen (step by step)

**Etappe 1 – Fundament (dieser Build)**

- Cloud + Google-Auth aktivieren, Design-Tokens, Layout-Shell, Onboarding-Wizard, Profile-Tabelle + RLS.
- Dashboard-Skeleton mit Recovery-Ring & Makro-Ringen (echte Berechnung, Dummy-Check-in seedbar).
- Daily Check-in + `daily_stats` + Recovery-Berechnung.
- Wochenplaner-Ansicht (read-only Generierung) inkl. Beintraining-Sperre & Carbo-Loading-Hinweis.

**Etappe 2 – Tracker**

- Gym-Logger + Sport-Logger, Historie, Vorschlagslogik letzte Session, Trends-Basis.

**Etappe 3 – Ernährung + Empfehlungen**

- Nutrition-Log, Makro-Tracking, KI-Empfehlungen, Trends.

**Etappe 4 – Food-Scanner (KI)**

- Storage-Bucket, Foto-Upload, Gemini-Analyse, Scores, Übernahme in Nutrition-Log.

**Etappe 5 – Tagebuch + Feinschliff**

- Journal-CRUD, Verknüpfungen, Suche, Notifications/Streaks, Export.

## Nach dem Plan

Ich starte mit Etappe 1: Cloud + Google-Auth aktivieren, Design-System setzen, Onboarding + Dashboard + Check-in + Wochenplaner-Logik. Danach fragen wir gemeinsam ab, welche Etappe als nächstes drankommt.
