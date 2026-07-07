
-- 1) Fix handle_new_user to persist the chosen role from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.user_role;
  _raw_role text;
BEGIN
  _raw_role := NEW.raw_user_meta_data->>'role';
  IF _raw_role IN ('coach', 'athlete') THEN
    _role := _raw_role::public.user_role;
  ELSE
    _role := 'athlete'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    _role
  )
  ON CONFLICT (id) DO UPDATE
    SET role = EXCLUDED.role
    WHERE public.profiles.role IS DISTINCT FROM EXCLUDED.role;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill: promote users whose signup metadata said 'coach'
UPDATE public.profiles p
SET role = 'coach'::public.user_role
FROM auth.users u
WHERE u.id = p.id
  AND (u.raw_user_meta_data->>'role') = 'coach'
  AND p.role <> 'coach';
