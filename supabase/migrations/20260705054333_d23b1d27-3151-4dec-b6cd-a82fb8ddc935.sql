
-- Guard function: block non-super_admin role rows for the platform admin email
CREATE OR REPLACE FUNCTION public.enforce_platform_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _email text;
BEGIN
  SELECT lower(email) INTO _email FROM public.profiles WHERE id = NEW.user_id;
  IF _email = 'princelaw4u.pl@gmail.com' AND NEW.role <> 'super_admin' THEN
    RAISE EXCEPTION 'princelaw4u.pl@gmail.com can only hold the super_admin role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_platform_admin_role ON public.user_roles;
CREATE TRIGGER trg_enforce_platform_admin_role
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_platform_admin_role();

-- Guard function: block teacher/parent/student/join-request rows for the platform admin
CREATE OR REPLACE FUNCTION public.block_platform_admin_entity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _email text; _pid uuid;
BEGIN
  _pid := COALESCE(NEW.profile_id, NEW.user_id);
  IF _pid IS NULL THEN RETURN NEW; END IF;
  SELECT lower(email) INTO _email FROM public.profiles WHERE id = _pid;
  IF _email = 'princelaw4u.pl@gmail.com' THEN
    RAISE EXCEPTION 'princelaw4u.pl@gmail.com is the platform super admin and cannot be a teacher, parent, student, or join a school';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_platform_admin_teachers ON public.teachers;
CREATE TRIGGER trg_block_platform_admin_teachers
BEFORE INSERT OR UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.block_platform_admin_entity();

DROP TRIGGER IF EXISTS trg_block_platform_admin_parents ON public.parents;
CREATE TRIGGER trg_block_platform_admin_parents
BEFORE INSERT OR UPDATE ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.block_platform_admin_entity();

DROP TRIGGER IF EXISTS trg_block_platform_admin_students ON public.students;
CREATE TRIGGER trg_block_platform_admin_students
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.block_platform_admin_entity();

DROP TRIGGER IF EXISTS trg_block_platform_admin_joinreq ON public.join_requests;
CREATE TRIGGER trg_block_platform_admin_joinreq
BEFORE INSERT OR UPDATE ON public.join_requests
FOR EACH ROW EXECUTE FUNCTION public.block_platform_admin_entity();

-- On every sign-in (session refresh updates auth.users.last_sign_in_at),
-- normalize the platform admin: ensure super_admin role, strip anything else.
CREATE OR REPLACE FUNCTION public.normalize_platform_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.email) <> 'princelaw4u.pl@gmail.com' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Remove any non-admin data for this user
  DELETE FROM public.parent_students
    WHERE parent_id IN (SELECT id FROM public.parents WHERE profile_id = NEW.id)
       OR student_id IN (SELECT id FROM public.students WHERE profile_id = NEW.id);
  DELETE FROM public.teacher_subjects
    WHERE teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = NEW.id);
  DELETE FROM public.teachers WHERE profile_id = NEW.id;
  DELETE FROM public.parents  WHERE profile_id = NEW.id;
  DELETE FROM public.students WHERE profile_id = NEW.id;
  DELETE FROM public.join_requests WHERE user_id = NEW.id;
  DELETE FROM public.user_roles WHERE user_id = NEW.id AND role <> 'super_admin';

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'super_admin')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_platform_admin_ins ON auth.users;
CREATE TRIGGER trg_normalize_platform_admin_ins
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.normalize_platform_admin();

DROP TRIGGER IF EXISTS trg_normalize_platform_admin_upd ON auth.users;
CREATE TRIGGER trg_normalize_platform_admin_upd
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.normalize_platform_admin();
