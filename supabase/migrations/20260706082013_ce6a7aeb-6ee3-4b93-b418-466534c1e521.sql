
-- 1. progress_insights table
CREATE TABLE public.progress_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content TEXT NOT NULL,
  metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_insights TO authenticated;
GRANT ALL ON public.progress_insights TO service_role;

ALTER TABLE public.progress_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own insights"
  ON public.progress_insights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX progress_insights_user_created_idx
  ON public.progress_insights (user_id, created_at DESC);

CREATE TRIGGER update_progress_insights_updated_at
  BEFORE UPDATE ON public.progress_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Foreign keys to profiles (so PostgREST embeds work)
ALTER TABLE public.chat_participants
  ADD CONSTRAINT chat_participants_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_id_profiles_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_coach_id_profiles_fkey
  FOREIGN KEY (coach_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. create_team_with_chat RPC
CREATE OR REPLACE FUNCTION public.create_team_with_chat(_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
  new_chat_id UUID;
  new_team_id UUID;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'team name required';
  END IF;

  -- Only coaches may create teams
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = me AND role = 'coach'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.chats(type, created_by)
  VALUES ('team', me)
  RETURNING id INTO new_chat_id;

  INSERT INTO public.chat_participants(chat_id, user_id)
  VALUES (new_chat_id, me);

  INSERT INTO public.teams(name, coach_id, team_chat_id)
  VALUES (trim(_name), me, new_chat_id)
  RETURNING id INTO new_team_id;

  RETURN new_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team_with_chat(TEXT) TO authenticated, service_role;
