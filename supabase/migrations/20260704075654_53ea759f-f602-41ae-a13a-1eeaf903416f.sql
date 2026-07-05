-- ============================================
-- Etappe 6: Roles, Teams, Chat
-- ============================================

CREATE TYPE public.user_role AS ENUM ('athlete', 'coach');
CREATE TYPE public.team_member_status AS ENUM ('pending', 'active', 'declined');
CREATE TYPE public.chat_type AS ENUM ('direct', 'team');

-- Profile: role
ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'athlete';

-- Allow profile lookup by email via SECURITY DEFINER (never expose auth.users directly)
CREATE OR REPLACE FUNCTION public.find_profile_by_email(_email TEXT)
RETURNS TABLE(id UUID, name TEXT, role public.user_role)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.name, p.role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(_email)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_profile_by_email(TEXT) TO authenticated;

-- ============================================
-- TEAMS
-- ============================================
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_chat_id UUID,
  coach_only_chat BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.team_member_status NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_team_members_user ON public.team_members(user_id, status);
CREATE INDEX idx_team_members_team ON public.team_members(team_id, status);

-- Helper: is the current user coach of a team?
CREATE OR REPLACE FUNCTION public.is_coach_of_team(_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.teams WHERE id = _team_id AND coach_id = auth.uid());
$$;

-- Helper: is _user an active member of a team coached by auth.uid()?
CREATE OR REPLACE FUNCTION public.coach_can_view_athlete(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = _user_id
      AND tm.status = 'active'
      AND t.coach_id = auth.uid()
  );
$$;

-- Helper: is user a member (any status) of a team?
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.team_members WHERE team_id = _team_id AND user_id = _user_id AND status = 'active');
$$;

-- TEAMS policies
CREATE POLICY "coach manages own teams" ON public.teams FOR ALL
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());
CREATE POLICY "members can view their team" ON public.teams FOR SELECT
  USING (EXISTS(SELECT 1 FROM public.team_members tm WHERE tm.team_id = id AND tm.user_id = auth.uid()));

-- TEAM_MEMBERS policies
CREATE POLICY "coach manages team members" ON public.team_members FOR ALL
  USING (public.is_coach_of_team(team_id))
  WITH CHECK (public.is_coach_of_team(team_id));
CREATE POLICY "user sees own memberships" ON public.team_members FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "user responds to own invite" ON public.team_members FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- COACH VIEW POLICIES on existing tables
-- (add SELECT for coaches, do NOT touch scanner/nutrition/journal)
-- ============================================

-- Profiles: coach can see basic profile of active athletes
CREATE POLICY "coach views athlete profiles" ON public.profiles FOR SELECT
  USING (public.coach_can_view_athlete(id));

-- Daily stats
CREATE POLICY "coach views athlete stats" ON public.daily_stats FOR SELECT
  USING (public.coach_can_view_athlete(user_id));

-- Gym workouts + exercises
CREATE POLICY "coach views athlete gym" ON public.workouts_gym FOR SELECT
  USING (public.coach_can_view_athlete(user_id));
CREATE POLICY "coach views athlete exercises" ON public.gym_exercises FOR SELECT
  USING (public.coach_can_view_athlete(user_id));

-- Sport workouts
CREATE POLICY "coach views athlete sport" ON public.workouts_sport FOR SELECT
  USING (public.coach_can_view_athlete(user_id));

-- Weekly planner
CREATE POLICY "coach views athlete planner" ON public.weekly_planner FOR SELECT
  USING (public.coach_can_view_athlete(user_id));

-- NOTE: food_scans, nutrition_logs, journal_entries intentionally NOT extended.

-- ============================================
-- CHATS
-- ============================================
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.chat_type NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT ALL ON public.chats TO service_role;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_participants TO authenticated;
GRANT ALL ON public.chat_participants TO service_role;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_chat ON public.chat_participants(chat_id);

-- Helper: is auth.uid() participant of chat?
CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.chat_participants WHERE chat_id = _chat_id AND user_id = auth.uid());
$$;

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_chat_messages_chat ON public.chat_messages(chat_id, created_at);

-- CHAT policies
CREATE POLICY "participant sees chat" ON public.chats FOR SELECT
  USING (public.is_chat_participant(id));
CREATE POLICY "authenticated can create chat" ON public.chats FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "creator or team coach updates chat" ON public.chats FOR UPDATE
  USING (created_by = auth.uid() OR (team_id IS NOT NULL AND public.is_coach_of_team(team_id)));

-- CHAT PARTICIPANTS
CREATE POLICY "user sees own participation" ON public.chat_participants FOR SELECT
  USING (user_id = auth.uid() OR public.is_chat_participant(chat_id));
CREATE POLICY "add self or by team coach" ON public.chat_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS(SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.created_by = auth.uid())
    OR EXISTS(SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.team_id IS NOT NULL AND public.is_coach_of_team(c.team_id))
  );
CREATE POLICY "remove own or by team coach" ON public.chat_participants FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS(SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.team_id IS NOT NULL AND public.is_coach_of_team(c.team_id))
  );

-- CHAT MESSAGES
CREATE POLICY "participant reads messages" ON public.chat_messages FOR SELECT
  USING (public.is_chat_participant(chat_id));

CREATE POLICY "participant sends message respecting team lock" ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_chat_participant(chat_id)
    AND (
      -- direct chat: always allowed
      NOT EXISTS(SELECT 1 FROM public.chats c WHERE c.id = chat_id AND c.type = 'team')
      OR
      -- team chat: allowed if not coach-only, OR sender is coach
      EXISTS(
        SELECT 1 FROM public.chats c
        JOIN public.teams t ON t.id = c.team_id
        WHERE c.id = chat_id
          AND c.type = 'team'
          AND (t.coach_only_chat = false OR t.coach_id = auth.uid())
      )
    )
  );

CREATE POLICY "sender deletes own message" ON public.chat_messages FOR DELETE
  USING (sender_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
