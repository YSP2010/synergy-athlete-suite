-- Bugfix: "permission denied for function coach_can_view_athlete"
--
-- Ursache: 20260704120000_security_hardening.sql entzieht den RLS-Helpern
-- EXECUTE per REVOKE ... FROM PUBLIC, anon. Damit verlor auch die Rolle
-- "authenticated" ihr (nur über PUBLIC geerbtes) EXECUTE-Recht; explizit
-- zurückgegeben wurde es nur für find_profile_by_email.
--
-- RLS-Policies werden mit den Rechten der ANFRAGENDEN Rolle ausgewertet:
-- Jede Abfrage eines eingeloggten Users auf profiles, daily_stats,
-- workouts_gym, workouts_sport, weekly_planner, chats, chat_participants
-- oder chat_messages ruft diese Helper in USING-Klauseln auf und scheiterte
-- daher mit "permission denied" (z. B. direkt nach Login/Onboarding).
--
-- Fix: EXECUTE für authenticated (und service_role) wiederherstellen.
-- anon bleibt bewusst ohne EXECUTE – die Hardening-Absicht bleibt erhalten.

GRANT EXECUTE ON FUNCTION public.is_coach_of_team(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.coach_can_view_athlete(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(UUID) TO authenticated, service_role;
