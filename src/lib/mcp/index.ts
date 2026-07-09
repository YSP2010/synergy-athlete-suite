import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listGymSessions from "./tools/list-gym-sessions";
import listSportSessions from "./tools/list-sport-sessions";
import getTodayStatus from "./tools/get-today-status";
import listJournalEntries from "./tools/list-journal-entries";
import createJournalEntry from "./tools/create-journal-entry";

// Direct Supabase issuer (never the .lovable.cloud proxy). VITE_SUPABASE_PROJECT_ID is
// inlined at build time; the fallback keeps the string well-formed during the
// throwaway manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hybrid-athlete-mcp",
  title: "Hybrid Athlete",
  version: "0.1.0",
  instructions:
    "Tools rund um Training, Recovery und Ernährung im Hybrid Athlete Performance Planner. `whoami` liefert Profil, `get_today_status` zeigt heutige Regeneration & Makros, `list_gym_sessions`/`list_sport_sessions` liefern Trainings-Historie, `list_journal_entries` und `create_journal_entry` verwalten das Tagebuch.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoami,
    getTodayStatus,
    listGymSessions,
    listSportSessions,
    listJournalEntries,
    createJournalEntry,
  ],
});
