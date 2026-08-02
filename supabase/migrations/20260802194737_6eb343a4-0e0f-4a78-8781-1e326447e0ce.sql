REVOKE EXECUTE ON FUNCTION public.create_team_with_chat(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_team_invite(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_team_readiness(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, leaderboard_period, date, leaderboard_scope, uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.course_leaderboard(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.create_team_with_chat(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_team_invite(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_team_readiness(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, leaderboard_period, date, leaderboard_scope, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.course_leaderboard(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.lb_cleanup_on_optout() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.tm_lock_user_self_update() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;