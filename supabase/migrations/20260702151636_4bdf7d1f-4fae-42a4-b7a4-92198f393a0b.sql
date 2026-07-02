
-- 1. Extend schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'Nigeria',
  ADD COLUMN IF NOT EXISTS admin_profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_email text;

-- Make some previously-required fields optional so platform admin can create quickly
ALTER TABLE public.schools ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.schools ALTER COLUMN address DROP NOT NULL;

-- 2. Platform admin helper (hard-coded to a single Gmail owner)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND lower(email) = 'princelaw4u.pl@gmail.com'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = _school_id AND admin_profile_id = _user_id
  ) OR public.is_platform_admin(_user_id)
$$;

-- 3. Broaden schools policies: only platform admin can create / edit
DROP POLICY IF EXISTS "Authenticated can create schools" ON public.schools;
DROP POLICY IF EXISTS "Admin can update own school" ON public.schools;

CREATE POLICY "Platform admin creates schools" ON public.schools
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Platform admin updates schools" ON public.schools
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admin deletes schools" ON public.schools
  FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 4. Join requests
DO $$ BEGIN
  CREATE TYPE public.join_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  requested_role app_role NOT NULL,
  message text,
  status join_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, school_id, status)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_requests TO authenticated;
GRANT ALL ON public.join_requests TO service_role;

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own join requests" ON public.join_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Users read own join requests" ON public.join_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id));

CREATE POLICY "School admin updates requests" ON public.join_requests
  FOR UPDATE TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id));

CREATE POLICY "Users cancel own pending requests" ON public.join_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE TRIGGER join_requests_updated
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Approval RPC
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.join_requests%ROWTYPE;
  _full_name text;
  _email text;
BEGIN
  SELECT * INTO r FROM public.join_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT public.is_school_admin(auth.uid(), r.school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'already reviewed'; END IF;

  SELECT full_name, email INTO _full_name, _email FROM public.profiles WHERE id = r.user_id;

  -- Grant role (idempotent)
  INSERT INTO public.user_roles (user_id, role) VALUES (r.user_id, r.requested_role)
  ON CONFLICT DO NOTHING;

  -- Create entity + attach to school
  IF r.requested_role IN ('class_teacher','subject_teacher') THEN
    INSERT INTO public.teachers (profile_id, employee_id, teacher_type, status, school_org_id, full_name)
    VALUES (r.user_id, 'EMP-' || substr(r.user_id::text, 1, 8), r.requested_role::teacher_type, 'approved', r.school_id, _full_name)
    ON CONFLICT DO NOTHING;
    UPDATE public.teachers SET school_org_id = r.school_id, status = 'approved' WHERE profile_id = r.user_id;
  ELSIF r.requested_role = 'parent' THEN
    INSERT INTO public.parents (profile_id, status, school_org_id, full_name)
    VALUES (r.user_id, 'approved', r.school_id, _full_name)
    ON CONFLICT DO NOTHING;
    UPDATE public.parents SET school_org_id = r.school_id, status = 'approved' WHERE profile_id = r.user_id;
  ELSIF r.requested_role = 'student' THEN
    INSERT INTO public.students (profile_id, full_name, school_id, school_org_id)
    VALUES (r.user_id, COALESCE(_full_name, _email, 'Student'),
            'STU-' || substr(r.user_id::text, 1, 8), r.school_id)
    ON CONFLICT DO NOTHING;
    UPDATE public.students SET school_org_id = r.school_id WHERE profile_id = r.user_id;
  END IF;

  UPDATE public.join_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.join_requests%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.join_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT public.is_school_admin(auth.uid(), r.school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.join_requests
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;
END; $$;

-- 6. Function to assign a school admin by email (platform admin only)
CREATE OR REPLACE FUNCTION public.assign_school_admin(_school_id uuid, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO _uid FROM public.profiles WHERE lower(email) = lower(_email);
  UPDATE public.schools
  SET admin_profile_id = _uid, admin_email = _email
  WHERE id = _school_id;
  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'super_admin')
    ON CONFLICT DO NOTHING;
  END IF;
END; $$;
