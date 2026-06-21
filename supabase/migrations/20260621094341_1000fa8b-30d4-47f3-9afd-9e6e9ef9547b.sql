
-- 1. Schools table
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  state text NOT NULL,
  lga text NOT NULL,
  code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  phone text,
  email text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.schools TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Public can search schools (anyone can find their school during signup)
CREATE POLICY "Anyone can view schools" ON public.schools FOR SELECT USING (true);
-- Authenticated users can create a school (they become its admin via trigger below)
CREATE POLICY "Authenticated can create schools" ON public.schools FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
-- Only super_admin who created it can update
CREATE POLICY "Admin can update own school" ON public.schools FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

CREATE TRIGGER schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. When a school is created, the creator becomes super_admin
CREATE OR REPLACE FUNCTION public.handle_new_school()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.created_by, 'super_admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_school_created AFTER INSERT ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_school();

-- 3. Approval status enum
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Link existing entities to a school + add status
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS school_org_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status public.approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS full_name text;

ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS school_org_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status public.approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS school_org_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS school_org_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE public.academic_sessions
  ADD COLUMN IF NOT EXISTS school_org_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- 5. Allow self-registration inserts for teachers/parents (status will be pending)
DROP POLICY IF EXISTS "Self register teacher" ON public.teachers;
CREATE POLICY "Self register teacher" ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Teacher view self" ON public.teachers;
CREATE POLICY "Teacher view self" ON public.teachers FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Self register parent" ON public.parents;
CREATE POLICY "Self register parent" ON public.parents FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Parent view self" ON public.parents;
CREATE POLICY "Parent view self" ON public.parents FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_admin(auth.uid()));

-- Admin can approve (update status)
DROP POLICY IF EXISTS "Admin manage teachers" ON public.teachers;
CREATE POLICY "Admin manage teachers" ON public.teachers FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manage parents" ON public.parents;
CREATE POLICY "Admin manage parents" ON public.parents FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin delete teachers" ON public.teachers;
CREATE POLICY "Admin delete teachers" ON public.teachers FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin delete parents" ON public.parents;
CREATE POLICY "Admin delete parents" ON public.parents FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Self-assign role helper: when admin approves, function below grants role.
CREATE OR REPLACE FUNCTION public.approve_teacher(_teacher_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _profile uuid; _type teacher_type;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.teachers SET status='approved' WHERE id=_teacher_id
    RETURNING profile_id, teacher_type INTO _profile, _type;
  IF _profile IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_profile, _type::app_role)
    ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_parent(_parent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _profile uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.parents SET status='approved' WHERE id=_parent_id
    RETURNING profile_id INTO _profile;
  IF _profile IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_profile, 'parent')
    ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_teacher(_teacher_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.teachers SET status='rejected' WHERE id=_teacher_id;
END; $$;

CREATE OR REPLACE FUNCTION public.reject_parent(_parent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.parents SET status='rejected' WHERE id=_parent_id;
END; $$;
