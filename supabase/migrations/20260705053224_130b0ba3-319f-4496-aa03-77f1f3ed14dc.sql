
-- Delete all user accounts and associated data
DELETE FROM public.user_roles;
DELETE FROM public.parent_students;
DELETE FROM public.students;
DELETE FROM public.parents;
DELETE FROM public.teachers;
DELETE FROM public.join_requests;
UPDATE public.schools SET admin_profile_id = NULL;
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- Update handle_new_user trigger so that when a user signs in via Gmail,
-- if their email is the platform admin OR is assigned as a school admin,
-- they are auto-granted the correct role and linked.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email);

  -- Platform super admin (hard-coded)
  IF lower(NEW.email) = 'princelaw4u.pl@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Auto-link any school where this email was pre-assigned as school admin
  IF EXISTS (SELECT 1 FROM public.schools WHERE lower(admin_email) = lower(NEW.email)) THEN
    UPDATE public.schools
    SET admin_profile_id = NEW.id
    WHERE lower(admin_email) = lower(NEW.email)
      AND admin_profile_id IS NULL;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
