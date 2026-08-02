
# Erweiterung: Einladungslink, Cockpit, PWA, Spieltag-Countdown, Jugendschutz

Umsetzung der fünf Etappen aus dem Dokument, in dieser Reihenfolge. Zentrale Klammer: **eine einzige Quelle für Spieltags-Logik und Tagesmakros**, damit Wochenplan, Dashboard, Ernährung und Countdown niemals auseinanderlaufen.

## A — Einladung per Link & QR

- Neue Tabelle `team_invites` (nur SHA-256-Hash des Tokens, `max_uses`, `expires_at`, `revoked`, Nutzungszähler), RLS nur für den Trainer des Teams, GRANTs wie üblich.
- Zwei Datenbankfunktionen: `peek_team_invite` (auch anonym, gibt nur Teamname, Trainername, Mitgliederzahl zurück) und `redeem_team_invite` (idempotent, `already_member`/`is_coach`/`expired`/`revoked`/`exhausted`).
- Öffentliche Route `/join/:token` (bewusst außerhalb des Auth-Bereichs): Vorschau, Login-/Registrieren-Buttons mit `?redirect=/join/<token>`, Beitritt, Sonderfall „noch nicht onboarded" (erst beitreten, dann Onboarding).
- `auth.tsx` bekommt den Suchparameter `redirect` – inklusive Google-Login –, akzeptiert nur app-interne Pfade (genau ein führendes `/`, kein `//`, kein `/\`), sonst `/dashboard`.
- In `/team`: Bereich „Spieler einladen" mit Link-Erstellung (Bezeichnung, Gültigkeit, max. Nutzungen), einmaliger Klartext-Anzeige, Kopieren, `navigator.share`, clientseitigem QR-Code (`qrcode`-Paket), Liste aktiver Links mit Widerruf. E-Mail-Einladung bleibt bestehen.

## B — Mannschafts-Cockpit

- `/team` wird in Tabs „Cockpit | Mitglieder | Einladen" gegliedert; Athleten sehen weiterhin nur ihre bisherige Ansicht.
- Belastungsberechnung als reine Funktionen: gemessene Belastung aus importierten Aktivitäten zuerst, sonst Dauer × Intensität aus Gym-/Sport-Einheiten (nur `done`), ACWR 7d gegen 28d/4, unter 21 Tagen Historie kein Wert.
- Ampel: grau (zu wenig Daten, nie grün), rot (ACWR > 1,5 oder Recovery < 40 oder Muskelkater ≥ 4), gelb (Grenzbereich), sonst grün – mit Tooltip zum konkreten Auslöser und deutlich sichtbarem Hinweis, dass das keine medizinische Aussage ist.
- Eine Datenbankfunktion `get_team_readiness(_team_id)` liefert alles in einer Abfrage (Trainerprüfung eingebaut).
- Cockpit-UI: Zähler oben, risikosortierte Liste (mobil Karten), Klick führt auf `/athletes/:id`, eigener Block „Kein Check-in seit 3+ Tagen", Leerzustand verweist auf den Einladungslink.
- Datenschutz unverändert: Ernährung, Scans, Tagebuch bleiben gesperrt. In `/settings` neuer Abschnitt „Was mein Trainer sieht" plus „Team verlassen" (neue DELETE-Policy für eigene Mitgliedschaft).

## C — PWA

- `vite-plugin-pwa` mit `registerType: 'prompt'`, Manifest (Start `/dashboard`, standalone, Anthrazit-Theme, deutsche Texte), Icons 192/512 plus maskable.
- Caching nur App-Shell; alle Backend-Anfragen strikt `NetworkOnly`, Cache-Bereinigung beim Abmelden, eigene Offline-Seite.
- Installationshinweis: Android über `beforeinstallprompt`, iOS mit Anleitung „Teilen → Zum Home-Bildschirm", höchstens einmal pro Woche, nicht im Standalone-Modus.
- Push: Tabelle `push_subscriptions` (nur eigene Zeilen), VAPID-Schlüssel als Server-Secret, Versand über Serverfunktion, Berechtigung nur nach bewusstem Schalter in `/settings`, iOS-Sonderfall erklärt, abgelaufene Endpunkte (404/410) werden gelöscht. Benachrichtigungen: Check-in-Erinnerung, Planänderung durch den Trainer, Vorabend-Erinnerung – einzeln abschaltbar.
- Zeitgesteuerte Erinnerungen: ich prüfe die Verfügbarkeit eines Zeitplaners in der Datenbank und melde das Ergebnis, statt still etwas anderes zu bauen.
- **Nicht in diesem Durchgang:** Offline-Schreiben im Gym-Log (C5) – eigene Baustelle, kommt danach.

## D — Spieltag-Countdown

- `workouts_sport` wird erweitert: `kickoff_at`, `opponent`, `venue`, `is_home`, `travel_minutes`, `meetup_at`. Ohne Anstoßzeit funktioniert alles wie bisher, mit Hinweis „Anstoßzeit eintragen".
- Neue Tabelle `match_plan_items` (abhakbar, abwählbar, eigene Punkte möglich), nur für den Nutzer selbst – der Trainer sieht sie nicht.
- Generator als reine Funktion mit dem beschriebenen Zeitplan T-72h bis T+48h, alle Gramm- und Milliliterangaben aus dem Körpergewicht ausgerechnet; ohne Gewicht nur ein Hinweis-Item. Individualisierung nach Härte, Position, Alter, Anreise, Ernährungsstil und Allergien, plus Frühanstoß- und Spätanstoß-Regel.
- Routen `/matchday` und `/matchday/:id`: großer Countdown, Zeitleiste mit echten Uhrzeiten, Kategorie-Filter, aufklappbares „Warum?". Kompakte Karte auf `/dashboard` ab 72 h, Button in `sport.$id.tsx`. Neuberechnung bei Änderung von Zeit, Härte oder Gewicht – abgehakte und eigene Punkte bleiben erhalten.
- Schutzregeln fest verdrahtet: keine Supplemente oder Koffein, kein Defizit an Spieltagen (Ziele als Mindestmengen), sachliche Sprache, sichtbarer Hinweis auf Orientierungswerte.

## Synchronisation (der Punkt, der zuletzt gehakt hat)

- Die Spieltags-Erkennung und die Kohlenhydrat-Erhöhung leben weiterhin **ausschließlich** in `src/lib/planner.ts`. Der Countdown liest daraus, statt eine zweite Rechnung aufzumachen; erweitert wird die vorhandene Funktion um die Anstoßzeit.
- Dashboard, `/nutrition` und Countdown beziehen ihre Zahlen über denselben Aufruf; Tests vergleichen die drei Ergebnisse für Spieltag, Vortag und normalen Tag auf Gleichheit.
- Beim Speichern von Wochenplan, Spiel oder Profilgewicht werden die Abfragen für Dashboard, Ernährung und Spieltag gemeinsam aktualisiert, damit die Anzeige nicht nachhinkt.
- Steht laut Wochenplan 48 h vor einem harten Spiel eine Beineinheit, zeigt der Countdown einen Konflikthinweis mit Verschieben-Button – dieselbe Regel, nicht eine zweite.

## E — Jugendschutz

- `is_minor` (unter 16) aus dem Geburtsdatum, neues Feld `guardian_consent_at` in `profiles`, schlichte Bestätigungsseite für ein Elternteil.
- Einwilligungsbasierte Funktionen (Bestenliste, Gesundheitsdaten) sind unter 16 ohne Elternbestätigung gesperrt; Training, Plan, Check-in und Trainer-Belastungssicht bleiben unberührt.
- Öffentlich erreichbare Datenschutzerklärung in einfacher Sprache; die bestehende Export-/Löschseite bleibt im geschützten Bereich.

## Technische Hinweise

- Neue Pakete: `qrcode`, `vite-plugin-pwa`, `web-push`. Serverlogik als TanStack-Serverfunktionen, kein Edge-Function-Code.
- Jede Migration mit GRANTs, RLS und Policies; neue Datenbankfunktionen als SECURITY DEFINER mit fixem `search_path`.
- Vitest für Token-/Redirect-Validierung, Belastung und ACWR, Countdown-Erzeugung (15:00 / 10:00 / 20:30, Anreise, Härtegrade, Torwart, fehlendes Gewicht, Zeitumstellung, kein Koffein unter 18) sowie die Makro-Gleichheit über die drei Oberflächen.
- Nach jeder Etappe kurzer Test-Leitfaden (u. a. Beitritt mit Zweitkonto, Cockpit mit drei Testathleten, gelieferte Icon-Größen und VAPID-Erzeugung).
