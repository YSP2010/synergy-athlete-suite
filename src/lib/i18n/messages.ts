export type Locale = "de" | "en" | "uk";

/**
 * Nachrichten-Katalog. Flache, punktierte Schlüssel. Fehlt ein Schlüssel in
 * einer Sprache, fällt t() automatisch auf Deutsch und dann auf den Schlüssel
 * selbst zurück. Neue Screens ergänzen hier einfach ihre Schlüssel.
 */
export const messages: Record<Locale, Record<string, string>> = {
  de: {
    "plan.section.title": "Deine Trainingspläne",
    "plan.card.title": "Trainingsplan",
    "plan.card.subtitle":
      "Lass dir einen persönlichen Plan erstellen – abgestimmt auf Profil, Ziel und Erfahrung. Ein neuer Plan ist je Typ alle 4 Wochen möglich.",
    "plan.gym.title": "Gym-Trainingsplan",
    "plan.gym.desc": "Kraft & Aufbau passend zu Zielsetzung und Trainingstagen.",
    "plan.sport.title": "Sport-Verbesserungsplan",
    "plan.sport.desc": "Sportartspezifisches Training für deine Disziplin.",
    "plan.action.create": "Erstellen",
    "plan.action.recreate": "Neu erstellen",
    "plan.next": "Nächster Plan ab {date}",
    "plan.toast.created": "Trainingsplan erstellt",
    "plan.badge.weeks": "{weeks} Wochen",
    "plan.badge.ai": "KI-optimiert",
    "plan.badge.rules": "Regelbasiert",
    "plan.badge.created": "erstellt {date}",
    "plan.progression": "Wochen-Progression",
    "plan.week": "Woche",
    "plan.macro.protein": "Protein",
    "plan.macro.carbs": "Kohlenhydrate",
    "plan.macro.fat": "Fett",
    "language.title": "Sprache",
    "language.desc": "Sprache der App wählen. Wird auf diesem Gerät gespeichert.",

    "nav.dashboard": "Dashboard",
    "nav.plan": "Wochenplan",
    "nav.checkin": "Check-in",
    "nav.matchday": "Spieltag",
    "nav.gym": "Gym-Log",
    "nav.sport": "Sport-Log",
    "nav.nutrition": "Ernährung",
    "nav.scan": "Scanner",
    "nav.journal": "Tagebuch",
    "nav.insights": "Fortschritt",
    "nav.activities": "Aktivitäten",
    "nav.courses": "Strecken",
    "nav.analytics": "Analyse",
    "nav.records": "Bestleistungen",
    "nav.leaderboard": "Bestenliste",
    "nav.triathlon": "Triathlon",
    "nav.races": "Rennen",
    "nav.equipment": "Ausrüstung",
    "nav.import": "Import",
    "nav.invites": "Einladungen",
    "nav.chat": "Chat",
    "nav.privacy": "Datenschutz",
    "nav.teams": "Teams",

    "nav.short.home": "Home",
    "nav.short.plan": "Plan",
    "nav.short.gym": "Gym",
    "nav.short.food": "Food",

    "nav.settings": "Einstellungen",
    "nav.signout": "Abmelden",
    "nav.signedOut": "Abgemeldet",
    "nav.more": "Mehr",
    "nav.moreAria": "Weitere Bereiche anzeigen",
    "nav.skip": "Zum Inhalt",
    "nav.roleCoach": "Coach",
    "nav.roleAthlete": "Athlete",

    "analytics.title": "Analyse",
    "analytics.subtitle":
      "Deine Trainingsdaten – jede Kennzahl mit Erklärung, was sie für dich bedeutet.",
    "analytics.explainAria": "Erklärung",
    "analytics.noData": "Keine Daten",

    "analytics.range.d30": "30 Tage",
    "analytics.range.d90": "90 Tage",
    "analytics.range.y1": "1 Jahr",
    "analytics.range.all": "Alles",

    "analytics.healthUntil": "Gesundheitsdaten bis {date}",
    "analytics.noHealthShort": "Noch keine Gesundheitsdaten",
    "analytics.refresh": "Aktualisieren",

    "analytics.tab.overview": "Übersicht",
    "analytics.tab.load": "Belastung",
    "analytics.tab.endurance": "Ausdauer",
    "analytics.tab.efficiency": "Effizienz",
    "analytics.tab.sleep": "Schlaf & Erholung",

    "analytics.zone.low": "Unterbelastung",
    "analytics.zone.optimal": "Optimal",
    "analytics.zone.elevated": "Erhöht",
    "analytics.zone.high": "Verletzungsrisiko",

    "analytics.series.ctl": "Fitness (CTL)",
    "analytics.series.atl": "Ermüdung (ATL)",
    "analytics.series.tsb": "Form (TSB)",

    "analytics.vol.run": "Laufen",
    "analytics.vol.bike": "Rad",
    "analytics.vol.swim": "Schwimmen",
    "analytics.vol.other": "Sonstiges",

    "analytics.sleepPhase.deep": "Tiefschlaf",
    "analytics.sleepPhase.light": "Leichtschlaf",
    "analytics.sleepPhase.rem": "REM",
    "analytics.sleepPhase.awake": "Wach",

    "analytics.metric.acwr.label": "ACWR",
    "analytics.metric.sleepScore.label": "Sleep Score",
    "analytics.metric.ctl.hint":
      "Gleitender 42-Tage-Schnitt deiner Trainingsbelastung. Steigt langsam – höher heißt belastbarer.",
    "analytics.metric.tsb.hint":
      "Fitness minus Ermüdung. −10 bis +5 ist gutes Training, unter −30 droht Übertraining, über +15 bist du frisch.",
    "analytics.metric.acwr.hint":
      "Verhältnis der letzten 7 zu den letzten 28 Tagen. 0,8–1,3 ist optimal, über 1,5 steigt das Verletzungsrisiko.",
    "analytics.metric.sleepScore.hint":
      "Garmin-Bewertung der letzten Nacht (0–100). Ab 80 gilt der Schlaf als erholsam.",
    "analytics.empty.overview":
      "Noch keine Aktivitäten im gewählten Zeitraum. Importiere deinen Garmin-Export, um Auswertungen zu sehen.",

    "analytics.load.title": "Fitness, Ermüdung, Form",
    "analytics.load.explain":
      "CTL = Fitness (42 Tage), ATL = Ermüdung (7 Tage), TSB = Form. Ein Formtief nach harten Wochen ist normal, dauerhaft unter −30 nicht.",
    "analytics.load.desc": "Belastungsverlauf im gewählten Zeitraum",
    "analytics.empty.load": "Keine Belastungsdaten im Zeitraum.",

    "analytics.volume.title": "Wochenvolumen",
    "analytics.volume.explain":
      "Trainingsminuten je Sportart pro Woche. Sprünge über 10 % pro Woche gelten als riskant.",
    "analytics.empty.weekly": "Keine Einheiten im Zeitraum.",

    "analytics.monotony.title": "Monotonie & Strain",
    "analytics.monotony.explain":
      "Foster: Monotonie über 2,0 bedeutet zu gleichförmiges Training, hoher Strain erhöht das Infekt- und Verletzungsrisiko.",
    "analytics.last7": "Letzte 7 Tage",
    "analytics.stat.weeklyLoad": "Wochenlast",
    "analytics.stat.monotony": "Monotonie",
    "analytics.stat.strain": "Strain",

    "analytics.vo2.title": "VO2max-Verlauf",
    "analytics.vo2.explain":
      "Maximale Sauerstoffaufnahme laut Uhr. Für ambitionierte Amateure sind 50–60 ml/kg/min ein guter Bereich.",

    "analytics.thresholds.title": "Schwellenwerte & Zonen",
    "analytics.thresholds.explain":
      "Die Laktatschwelle ist das Tempo, das du rund eine Stunde halten kannst. Zonen darüber trainieren VO2max, darunter die Grundlage.",
    "analytics.threshold.lthr": "Schwellenpuls",
    "analytics.threshold.speed": "Schwellentempo",
    "analytics.threshold.ftp": "FTP",

    "analytics.pred.title": "Wettkampfprognosen",
    "analytics.pred.explain":
      "Riegel rechnet eine Bestzeit auf andere Distanzen hoch, die VO2max-Prognose nach Daniels/Gilbert nutzt deine Uhr-Werte.",
    "analytics.pred.distance": "Distanz",
    "analytics.pred.riegel": "Riegel",
    "analytics.pred.vo2": "VO2max",

    "analytics.ef.title": "Efficiency Factor",
    "analytics.ef.explain":
      "Tempo pro Herzschlag. Steigt der Wert über Wochen bei gleichem Puls, wird deine Aerobik besser.",
    "analytics.ef.label": "EF",
    "analytics.empty.ef": "Für den EF-Trend braucht es Einheiten mit Puls- und Tempodaten.",

    "analytics.dyn.title": "Laufdynamik",
    "analytics.dyn.explain":
      "Vertical Ratio unter 7 %, Bodenkontakt unter 240 ms und eine gleichmäßige Schrittlänge sprechen für ökonomisches Laufen.",
    "analytics.dyn.vr": "Vertical Ratio (%)",
    "analytics.dyn.gct": "Bodenkontakt (ms)",

    "analytics.sleepPhases.title": "Schlafphasen",
    "analytics.sleepPhases.explain":
      "Rund 15–25 % Tiefschlaf und 20–25 % REM gelten als gut. Wichtig ist vor allem eine konstante Gesamtdauer.",
    "analytics.hrv.title": "HRV mit Baseline",
    "analytics.hrv.explain":
      "Herzratenvariabilität der Nacht. Innerhalb des Baseline-Bands bist du ausbalanciert, dauerhaft darunter bedeutet Stress oder Überlastung.",
    "analytics.hrv.label": "HRV (ms)",
    "analytics.rhr.title": "Ruhepuls & Body Battery",
    "analytics.rhr.explain":
      "Ein steigender Ruhepuls oder eine Body Battery, die nachts nicht mehr auflädt, sind frühe Warnzeichen für Überlastung.",
    "analytics.rhr.label": "Ruhepuls",
    "analytics.bb.label": "Body Battery max",
    "analytics.empty.sleep":
      "Noch keine Gesundheitsdaten. Der Garmin-Konto-Export enthält Schlaf, HRV und Body Battery – lade ihn unter Import hoch.",

    "aitip.title": "KI-Trainingstipp",
    "aitip.subtitle": "Ein kurzer, umsetzbarer Tipp – abgestimmt auf Sportart und Fokus.",
    "aitip.sportLabel": "Sportart",
    "aitip.focusLabel": "Fokus",
    "aitip.button": "Tipp holen",
    "aitip.loading": "Erstelle Tipp…",
    "aitip.empty": "Wähle Sportart und Fokus und hol dir einen Tipp.",
    "aitip.sport.football": "Fußball",
    "aitip.sport.tennis": "Tennis",
    "aitip.sport.running": "Laufen",
    "aitip.sport.triathlon": "Triathlon",
    "aitip.focus.endurance": "Ausdauer",
    "aitip.focus.strength": "Kraft",
    "aitip.focus.speed": "Schnelligkeit",
    "aitip.focus.recovery": "Erholung",

    "import.skipped.title": "Übersprungene Dateien",
    "import.skipped.count": "{count} übersprungen",
    "import.skipped.hint":
      "Diese Dateien enthielten keine erkannten Daten und wurden nicht importiert.",
    "import.skipped.reason.no_wellness_data": "Keine erkannten Gesundheitsdaten",
    "import.skipped.reason.no_activities": "Keine Aktivitäten erkannt",
    "import.skipped.reason.route_only": "Nur Route (ohne Zeitstempel)",
    "import.skipped.reason.empty": "Leere Datei",
    "import.skipped.reason.other": "Sonstiges",
  },
  en: {
    "plan.section.title": "Your training plans",
    "plan.card.title": "Training plan",
    "plan.card.subtitle":
      "Get a personal plan tailored to your profile, goal and experience. A new plan is available every 4 weeks per type.",
    "plan.gym.title": "Gym training plan",
    "plan.gym.desc": "Strength & hypertrophy matched to your goal and training days.",
    "plan.sport.title": "Sport improvement plan",
    "plan.sport.desc": "Sport-specific training for your discipline.",
    "plan.action.create": "Create",
    "plan.action.recreate": "Recreate",
    "plan.next": "Next plan from {date}",
    "plan.toast.created": "Training plan created",
    "plan.badge.weeks": "{weeks} weeks",
    "plan.badge.ai": "AI-optimised",
    "plan.badge.rules": "Rule-based",
    "plan.badge.created": "created {date}",
    "plan.progression": "Weekly progression",
    "plan.week": "Week",
    "plan.macro.protein": "Protein",
    "plan.macro.carbs": "Carbs",
    "plan.macro.fat": "Fat",
    "language.title": "Language",
    "language.desc": "Choose the app language. Saved on this device.",

    "nav.dashboard": "Dashboard",
    "nav.plan": "Weekly plan",
    "nav.checkin": "Check-in",
    "nav.matchday": "Matchday",
    "nav.gym": "Gym log",
    "nav.sport": "Sport log",
    "nav.nutrition": "Nutrition",
    "nav.scan": "Scanner",
    "nav.journal": "Journal",
    "nav.insights": "Progress",
    "nav.activities": "Activities",
    "nav.courses": "Routes",
    "nav.analytics": "Analytics",
    "nav.records": "Records",
    "nav.leaderboard": "Leaderboard",
    "nav.triathlon": "Triathlon",
    "nav.races": "Races",
    "nav.equipment": "Equipment",
    "nav.import": "Import",
    "nav.invites": "Invites",
    "nav.chat": "Chat",
    "nav.privacy": "Privacy",
    "nav.teams": "Teams",

    "nav.short.home": "Home",
    "nav.short.plan": "Plan",
    "nav.short.gym": "Gym",
    "nav.short.food": "Food",

    "nav.settings": "Settings",
    "nav.signout": "Sign out",
    "nav.signedOut": "Signed out",
    "nav.more": "More",
    "nav.moreAria": "Show more sections",
    "nav.skip": "Skip to content",
    "nav.roleCoach": "Coach",
    "nav.roleAthlete": "Athlete",

    "analytics.title": "Analytics",
    "analytics.subtitle":
      "Your training data — every metric explained so you know what it means for you.",
    "analytics.explainAria": "Explanation",
    "analytics.noData": "No data",

    "analytics.range.d30": "30 days",
    "analytics.range.d90": "90 days",
    "analytics.range.y1": "1 year",
    "analytics.range.all": "All",

    "analytics.healthUntil": "Health data through {date}",
    "analytics.noHealthShort": "No health data yet",
    "analytics.refresh": "Refresh",

    "analytics.tab.overview": "Overview",
    "analytics.tab.load": "Load",
    "analytics.tab.endurance": "Endurance",
    "analytics.tab.efficiency": "Efficiency",
    "analytics.tab.sleep": "Sleep & recovery",

    "analytics.zone.low": "Undertraining",
    "analytics.zone.optimal": "Optimal",
    "analytics.zone.elevated": "Elevated",
    "analytics.zone.high": "Injury risk",

    "analytics.series.ctl": "Fitness (CTL)",
    "analytics.series.atl": "Fatigue (ATL)",
    "analytics.series.tsb": "Form (TSB)",

    "analytics.vol.run": "Running",
    "analytics.vol.bike": "Cycling",
    "analytics.vol.swim": "Swimming",
    "analytics.vol.other": "Other",

    "analytics.sleepPhase.deep": "Deep sleep",
    "analytics.sleepPhase.light": "Light sleep",
    "analytics.sleepPhase.rem": "REM",
    "analytics.sleepPhase.awake": "Awake",

    "analytics.metric.acwr.label": "ACWR",
    "analytics.metric.sleepScore.label": "Sleep score",
    "analytics.metric.ctl.hint":
      "Rolling 42-day average of your training load. Rises slowly — higher means more resilient.",
    "analytics.metric.tsb.hint":
      "Fitness minus fatigue. −10 to +5 is solid training, below −30 risks overtraining, above +15 you're fresh.",
    "analytics.metric.acwr.hint":
      "Ratio of the last 7 to the last 28 days. 0.8–1.3 is optimal, above 1.5 injury risk rises.",
    "analytics.metric.sleepScore.hint":
      "Garmin's rating of last night (0–100). From 80 up, sleep counts as restorative.",
    "analytics.empty.overview":
      "No activities in the selected period yet. Import your Garmin export to see analytics.",

    "analytics.load.title": "Fitness, fatigue, form",
    "analytics.load.explain":
      "CTL = fitness (42 days), ATL = fatigue (7 days), TSB = form. A dip after hard weeks is normal, staying below −30 is not.",
    "analytics.load.desc": "Load over the selected period",
    "analytics.empty.load": "No load data in this period.",

    "analytics.volume.title": "Weekly volume",
    "analytics.volume.explain":
      "Training minutes per sport per week. Jumps over 10% per week are considered risky.",
    "analytics.empty.weekly": "No sessions in this period.",

    "analytics.monotony.title": "Monotony & strain",
    "analytics.monotony.explain":
      "Foster: monotony above 2.0 means training is too uniform; high strain raises the risk of illness and injury.",
    "analytics.last7": "Last 7 days",
    "analytics.stat.weeklyLoad": "Weekly load",
    "analytics.stat.monotony": "Monotony",
    "analytics.stat.strain": "Strain",

    "analytics.vo2.title": "VO2max trend",
    "analytics.vo2.explain":
      "Maximum oxygen uptake per your watch. For ambitious amateurs, 50–60 ml/kg/min is a good range.",

    "analytics.thresholds.title": "Thresholds & zones",
    "analytics.thresholds.explain":
      "The lactate threshold is the pace you can hold for about an hour. Zones above it train VO2max, below it your aerobic base.",
    "analytics.threshold.lthr": "Threshold HR",
    "analytics.threshold.speed": "Threshold pace",
    "analytics.threshold.ftp": "FTP",

    "analytics.pred.title": "Race predictions",
    "analytics.pred.explain":
      "Riegel extrapolates a best time to other distances; the VO2max prediction (Daniels/Gilbert) uses your watch values.",
    "analytics.pred.distance": "Distance",
    "analytics.pred.riegel": "Riegel",
    "analytics.pred.vo2": "VO2max",

    "analytics.ef.title": "Efficiency factor",
    "analytics.ef.explain":
      "Pace per heartbeat. If it rises over weeks at the same HR, your aerobic fitness is improving.",
    "analytics.ef.label": "EF",
    "analytics.empty.ef": "The EF trend needs sessions with HR and pace data.",

    "analytics.dyn.title": "Running dynamics",
    "analytics.dyn.explain":
      "Vertical ratio under 7%, ground contact under 240 ms and a steady stride length indicate economical running.",
    "analytics.dyn.vr": "Vertical ratio (%)",
    "analytics.dyn.gct": "Ground contact (ms)",

    "analytics.sleepPhases.title": "Sleep stages",
    "analytics.sleepPhases.explain":
      "Around 15–25% deep sleep and 20–25% REM is considered good. Above all, a consistent total duration matters.",
    "analytics.hrv.title": "HRV with baseline",
    "analytics.hrv.explain":
      "Overnight heart rate variability. Within the baseline band you're balanced; consistently below it means stress or overload.",
    "analytics.hrv.label": "HRV (ms)",
    "analytics.rhr.title": "Resting HR & Body Battery",
    "analytics.rhr.explain":
      "A rising resting HR or a Body Battery that no longer recharges at night are early warning signs of overload.",
    "analytics.rhr.label": "Resting HR",
    "analytics.bb.label": "Body Battery max",
    "analytics.empty.sleep":
      "No health data yet. The Garmin account export includes sleep, HRV and Body Battery — upload it under Import.",

    "aitip.title": "AI training tip",
    "aitip.subtitle": "A short, actionable tip tailored to your sport and focus.",
    "aitip.sportLabel": "Sport",
    "aitip.focusLabel": "Focus",
    "aitip.button": "Get tip",
    "aitip.loading": "Generating…",
    "aitip.empty": "Pick a sport and focus, then get a tip.",
    "aitip.sport.football": "Football",
    "aitip.sport.tennis": "Tennis",
    "aitip.sport.running": "Running",
    "aitip.sport.triathlon": "Triathlon",
    "aitip.focus.endurance": "Endurance",
    "aitip.focus.strength": "Strength",
    "aitip.focus.speed": "Speed",
    "aitip.focus.recovery": "Recovery",

    "import.skipped.title": "Skipped files",
    "import.skipped.count": "{count} skipped",
    "import.skipped.hint": "These files contained no recognized data and were not imported.",
    "import.skipped.reason.no_wellness_data": "No recognized health data",
    "import.skipped.reason.no_activities": "No activities recognized",
    "import.skipped.reason.route_only": "Route only (no timestamps)",
    "import.skipped.reason.empty": "Empty file",
    "import.skipped.reason.other": "Other",
  },
  uk: {
    "plan.section.title": "Твої плани тренувань",
    "plan.card.title": "План тренувань",
    "plan.card.subtitle":
      "Отримай персональний план — з урахуванням профілю, мети та досвіду. Новий план доступний раз на 4 тижні для кожного типу.",
    "plan.gym.title": "План тренувань у залі",
    "plan.gym.desc": "Сила та набір м’язів відповідно до мети й днів тренувань.",
    "plan.sport.title": "План покращення у спорті",
    "plan.sport.desc": "Специфічні тренування для твоєї дисципліни.",
    "plan.action.create": "Створити",
    "plan.action.recreate": "Створити новий",
    "plan.next": "Наступний план з {date}",
    "plan.toast.created": "План тренувань створено",
    "plan.badge.weeks": "{weeks} тиж.",
    "plan.badge.ai": "Оптимізовано ШІ",
    "plan.badge.rules": "За правилами",
    "plan.badge.created": "створено {date}",
    "plan.progression": "Прогресія по тижнях",
    "plan.week": "Тиждень",
    "plan.macro.protein": "Білок",
    "plan.macro.carbs": "Вуглеводи",
    "plan.macro.fat": "Жири",
    "language.title": "Мова",
    "language.desc": "Оберіть мову застосунку. Зберігається на цьому пристрої.",

    "nav.dashboard": "Панель",
    "nav.plan": "Тижневий план",
    "nav.checkin": "Чек-ін",
    "nav.matchday": "День матчу",
    "nav.gym": "Журнал залу",
    "nav.sport": "Журнал спорту",
    "nav.nutrition": "Харчування",
    "nav.scan": "Сканер",
    "nav.journal": "Щоденник",
    "nav.insights": "Прогрес",
    "nav.activities": "Активності",
    "nav.courses": "Маршрути",
    "nav.analytics": "Аналітика",
    "nav.records": "Рекорди",
    "nav.leaderboard": "Рейтинг",
    "nav.triathlon": "Тріатлон",
    "nav.races": "Перегони",
    "nav.equipment": "Спорядження",
    "nav.import": "Імпорт",
    "nav.invites": "Запрошення",
    "nav.chat": "Чат",
    "nav.privacy": "Приватність",
    "nav.teams": "Команди",

    "nav.short.home": "Головна",
    "nav.short.plan": "План",
    "nav.short.gym": "Зал",
    "nav.short.food": "Їжа",

    "nav.settings": "Налаштування",
    "nav.signout": "Вийти",
    "nav.signedOut": "Ви вийшли",
    "nav.more": "Ще",
    "nav.moreAria": "Показати більше розділів",
    "nav.skip": "До вмісту",
    "nav.roleCoach": "Тренер",
    "nav.roleAthlete": "Атлет",

    "analytics.title": "Аналітика",
    "analytics.subtitle":
      "Твої тренувальні дані — кожен показник із поясненням, що він означає для тебе.",
    "analytics.explainAria": "Пояснення",
    "analytics.noData": "Немає даних",

    "analytics.range.d30": "30 днів",
    "analytics.range.d90": "90 днів",
    "analytics.range.y1": "1 рік",
    "analytics.range.all": "Все",

    "analytics.healthUntil": "Дані здоров'я до {date}",
    "analytics.noHealthShort": "Ще немає даних здоров'я",
    "analytics.refresh": "Оновити",

    "analytics.tab.overview": "Огляд",
    "analytics.tab.load": "Навантаження",
    "analytics.tab.endurance": "Витривалість",
    "analytics.tab.efficiency": "Ефективність",
    "analytics.tab.sleep": "Сон і відновлення",

    "analytics.zone.low": "Недовантаження",
    "analytics.zone.optimal": "Оптимально",
    "analytics.zone.elevated": "Підвищено",
    "analytics.zone.high": "Ризик травми",

    "analytics.series.ctl": "Форма (CTL)",
    "analytics.series.atl": "Втома (ATL)",
    "analytics.series.tsb": "Свіжість (TSB)",

    "analytics.vol.run": "Біг",
    "analytics.vol.bike": "Велосипед",
    "analytics.vol.swim": "Плавання",
    "analytics.vol.other": "Інше",

    "analytics.sleepPhase.deep": "Глибокий сон",
    "analytics.sleepPhase.light": "Легкий сон",
    "analytics.sleepPhase.rem": "REM",
    "analytics.sleepPhase.awake": "Неспання",

    "analytics.metric.acwr.label": "ACWR",
    "analytics.metric.sleepScore.label": "Оцінка сну",
    "analytics.metric.ctl.hint":
      "Ковзне середнє тренувального навантаження за 42 дні. Зростає повільно — вище означає більшу витривалість.",
    "analytics.metric.tsb.hint":
      "Форма мінус втома. Від −10 до +5 — хороший стан, нижче −30 — ризик перетренування, вище +15 — ти свіжий.",
    "analytics.metric.acwr.hint":
      "Співвідношення останніх 7 до останніх 28 днів. 0,8–1,3 — оптимально, понад 1,5 зростає ризик травми.",
    "analytics.metric.sleepScore.hint":
      "Оцінка Garmin за минулу ніч (0–100). Від 80 сон вважається відновлювальним.",
    "analytics.empty.overview":
      "У вибраному періоді ще немає активностей. Імпортуй свій експорт Garmin, щоб побачити аналітику.",

    "analytics.load.title": "Форма, втома, свіжість",
    "analytics.load.explain":
      "CTL = форма (42 дні), ATL = втома (7 днів), TSB = свіжість. Спад після важких тижнів — нормально, постійно нижче −30 — ні.",
    "analytics.load.desc": "Динаміка навантаження за вибраний період",
    "analytics.empty.load": "Немає даних навантаження за цей період.",

    "analytics.volume.title": "Тижневий обсяг",
    "analytics.volume.explain":
      "Хвилини тренувань за видом спорту на тиждень. Стрибки понад 10 % на тиждень вважаються ризикованими.",
    "analytics.empty.weekly": "Немає занять за цей період.",

    "analytics.monotony.title": "Монотонність і strain",
    "analytics.monotony.explain":
      "Фостер: монотонність понад 2,0 означає надто одноманітні тренування; високий strain підвищує ризик хвороб і травм.",
    "analytics.last7": "Останні 7 днів",
    "analytics.stat.weeklyLoad": "Тижневе навантаження",
    "analytics.stat.monotony": "Монотонність",
    "analytics.stat.strain": "Strain",

    "analytics.vo2.title": "Динаміка VO2max",
    "analytics.vo2.explain":
      "Максимальне споживання кисню за даними годинника. Для амбітних аматорів 50–60 мл/кг/хв — хороший діапазон.",

    "analytics.thresholds.title": "Порогові значення та зони",
    "analytics.thresholds.explain":
      "Лактатний поріг — це темп, який ти можеш утримувати близько години. Зони вище тренують VO2max, нижче — аеробну базу.",
    "analytics.threshold.lthr": "Пороговий пульс",
    "analytics.threshold.speed": "Пороговий темп",
    "analytics.threshold.ftp": "FTP",

    "analytics.pred.title": "Прогнози змагань",
    "analytics.pred.explain":
      "Формула Рігеля екстраполює найкращий час на інші дистанції; прогноз за VO2max (Деніелс/Гілберт) використовує дані годинника.",
    "analytics.pred.distance": "Дистанція",
    "analytics.pred.riegel": "Рігель",
    "analytics.pred.vo2": "VO2max",

    "analytics.ef.title": "Фактор ефективності",
    "analytics.ef.explain":
      "Темп на удар серця. Якщо показник зростає тижнями за того самого пульсу — твоя аеробіка покращується.",
    "analytics.ef.label": "EF",
    "analytics.empty.ef": "Для тренду EF потрібні заняття з даними пульсу й темпу.",

    "analytics.dyn.title": "Бігова динаміка",
    "analytics.dyn.explain":
      "Вертикальне співвідношення менше 7 %, час контакту з землею менше 240 мс і рівномірна довжина кроку свідчать про економічний біг.",
    "analytics.dyn.vr": "Вертикальне співвідношення (%)",
    "analytics.dyn.gct": "Контакт із землею (мс)",

    "analytics.sleepPhases.title": "Фази сну",
    "analytics.sleepPhases.explain":
      "Приблизно 15–25 % глибокого сну та 20–25 % REM вважаються хорошими. Найважливіше — стабільна загальна тривалість.",
    "analytics.hrv.title": "ВСР із базовою лінією",
    "analytics.hrv.explain":
      "Нічна варіабельність серцевого ритму. У межах базового діапазону ти збалансований; постійно нижче — стрес або перевантаження.",
    "analytics.hrv.label": "ВСР (мс)",
    "analytics.rhr.title": "Пульс спокою та Body Battery",
    "analytics.rhr.explain":
      "Зростання пульсу спокою або Body Battery, що більше не заряджається вночі, — ранні ознаки перевантаження.",
    "analytics.rhr.label": "Пульс спокою",
    "analytics.bb.label": "Body Battery макс.",
    "analytics.empty.sleep":
      "Ще немає даних здоров'я. Експорт акаунта Garmin містить сон, ВСР і Body Battery — завантаж його в розділі «Імпорт».",

    "aitip.title": "Порада від ШІ",
    "aitip.subtitle": "Коротка практична порада відповідно до виду спорту та фокуса.",
    "aitip.sportLabel": "Вид спорту",
    "aitip.focusLabel": "Фокус",
    "aitip.button": "Отримати пораду",
    "aitip.loading": "Генерую…",
    "aitip.empty": "Обери вид спорту й фокус і отримай пораду.",
    "aitip.sport.football": "Футбол",
    "aitip.sport.tennis": "Теніс",
    "aitip.sport.running": "Біг",
    "aitip.sport.triathlon": "Тріатлон",
    "aitip.focus.endurance": "Витривалість",
    "aitip.focus.strength": "Сила",
    "aitip.focus.speed": "Швидкість",
    "aitip.focus.recovery": "Відновлення",

    "import.skipped.title": "Пропущені файли",
    "import.skipped.count": "{count} пропущено",
    "import.skipped.hint": "Ці файли не містили розпізнаних даних і не були імпортовані.",
    "import.skipped.reason.no_wellness_data": "Немає розпізнаних даних здоров'я",
    "import.skipped.reason.no_activities": "Активності не розпізнано",
    "import.skipped.reason.route_only": "Лише маршрут (без часових міток)",
    "import.skipped.reason.empty": "Порожній файл",
    "import.skipped.reason.other": "Інше",
  },
};
