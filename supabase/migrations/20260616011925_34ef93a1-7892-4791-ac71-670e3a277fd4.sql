CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION app_private.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT app_private.has_role(_user_id, 'super_admin'::public.app_role)
$function$;

CREATE OR REPLACE FUNCTION app_private.is_any_teacher(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT app_private.has_role(_user_id, 'class_teacher'::public.app_role)
      OR app_private.has_role(_user_id, 'subject_teacher'::public.app_role)
$function$;

GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_any_teacher(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admin manages sessions" ON public.academic_sessions;
CREATE POLICY "Admin manages sessions" ON public.academic_sessions FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manages announcements" ON public.announcements;
CREATE POLICY "Admin manages announcements" ON public.announcements FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Read announcements by audience" ON public.announcements;
CREATE POLICY "Read announcements by audience" ON public.announcements FOR SELECT TO authenticated USING ((audience = 'all'::announcement_audience) OR ((audience = 'teachers'::announcement_audience) AND app_private.is_any_teacher(auth.uid())) OR ((audience = 'parents'::announcement_audience) AND app_private.has_role(auth.uid(), 'parent'::app_role)) OR ((audience = 'students'::announcement_audience) AND app_private.has_role(auth.uid(), 'student'::app_role)) OR app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manages attendance" ON public.attendance;
CREATE POLICY "Admin manages attendance" ON public.attendance FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manages classes" ON public.classes;
CREATE POLICY "Admin manages classes" ON public.classes FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manages parent_students" ON public.parent_students;
CREATE POLICY "Admin manages parent_students" ON public.parent_students FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Teacher reads links" ON public.parent_students;
CREATE POLICY "Teacher reads links" ON public.parent_students FOR SELECT TO authenticated USING (app_private.is_any_teacher(auth.uid()));

DROP POLICY IF EXISTS "Admin manages parents" ON public.parents;
CREATE POLICY "Admin manages parents" ON public.parents FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Teachers read parents" ON public.parents;
CREATE POLICY "Teachers read parents" ON public.parents FOR SELECT TO authenticated USING (app_private.is_any_teacher(auth.uid()));

DROP POLICY IF EXISTS "Admin manages profiles" ON public.profiles;
CREATE POLICY "Admin manages profiles" ON public.profiles FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.profiles;
CREATE POLICY "Users read own profile or admin reads all" ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()) OR app_private.is_admin(auth.uid()) OR app_private.is_any_teacher(auth.uid()));

DROP POLICY IF EXISTS "Admin manages results" ON public.results;
CREATE POLICY "Admin manages results" ON public.results FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manages students" ON public.students;
CREATE POLICY "Admin manages students" ON public.students FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manages subjects" ON public.subjects;
CREATE POLICY "Admin manages subjects" ON public.subjects FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manages teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Admin manages teacher_subjects" ON public.teacher_subjects FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manages teachers" ON public.teachers;
CREATE POLICY "Admin manages teachers" ON public.teachers FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "All teachers visible to teachers" ON public.teachers;
CREATE POLICY "All teachers visible to teachers" ON public.teachers FOR SELECT TO authenticated USING (app_private.is_any_teacher(auth.uid()));

DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;
CREATE POLICY "Admin manages roles" ON public.user_roles FOR ALL TO authenticated USING (app_private.is_admin(auth.uid())) WITH CHECK (app_private.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR app_private.is_admin(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_any_teacher(uuid) FROM authenticated, anon, PUBLIC;