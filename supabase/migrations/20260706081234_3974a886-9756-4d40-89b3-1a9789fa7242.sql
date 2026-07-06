GRANT EXECUTE ON FUNCTION public.is_coach_of_team(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.coach_can_view_athlete(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_chat_participant(UUID) TO authenticated, service_role;