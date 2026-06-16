CREATE OR REPLACE FUNCTION app_private.is_parent_of(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE p.profile_id = _user_id AND ps.student_id = _student_id
  )
$function$;

CREATE OR REPLACE FUNCTION app_private.is_student_self(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.students WHERE id = _student_id AND profile_id = _user_id)
$function$;

CREATE OR REPLACE FUNCTION app_private.teacher_can_see_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.teachers t ON t.profile_id = _user_id
    WHERE s.id = _student_id AND (
      t.class_id = s.class_id
      OR EXISTS (SELECT 1 FROM public.teacher_subjects ts WHERE ts.teacher_id = t.id AND ts.class_id = s.class_id)
    )
  )
$function$;

GRANT EXECUTE ON FUNCTION app_private.is_parent_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_student_self(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.teacher_can_see_student(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Parent reads child attendance" ON public.attendance;
CREATE POLICY "Parent reads child attendance" ON public.attendance FOR SELECT TO authenticated USING (app_private.is_parent_of(auth.uid(), student_id));
DROP POLICY IF EXISTS "Self reads attendance" ON public.attendance;
CREATE POLICY "Self reads attendance" ON public.attendance FOR SELECT TO authenticated USING (app_private.is_student_self(auth.uid(), student_id));
DROP POLICY IF EXISTS "Teacher manages class attendance" ON public.attendance;
CREATE POLICY "Teacher manages class attendance" ON public.attendance FOR ALL TO authenticated USING (app_private.teacher_can_see_student(auth.uid(), student_id)) WITH CHECK (app_private.teacher_can_see_student(auth.uid(), student_id));

DROP POLICY IF EXISTS "Parent reads child results" ON public.results;
CREATE POLICY "Parent reads child results" ON public.results FOR SELECT TO authenticated USING (app_private.is_parent_of(auth.uid(), student_id));
DROP POLICY IF EXISTS "Self reads results" ON public.results;
CREATE POLICY "Self reads results" ON public.results FOR SELECT TO authenticated USING (app_private.is_student_self(auth.uid(), student_id));
DROP POLICY IF EXISTS "Teacher manages results" ON public.results;
CREATE POLICY "Teacher manages results" ON public.results FOR ALL TO authenticated USING (app_private.teacher_can_see_student(auth.uid(), student_id)) WITH CHECK (app_private.teacher_can_see_student(auth.uid(), student_id));

DROP POLICY IF EXISTS "Parent reads child" ON public.students;
CREATE POLICY "Parent reads child" ON public.students FOR SELECT TO authenticated USING (app_private.is_parent_of(auth.uid(), id));
DROP POLICY IF EXISTS "Teacher reads class students" ON public.students;
CREATE POLICY "Teacher reads class students" ON public.students FOR SELECT TO authenticated USING (app_private.teacher_can_see_student(auth.uid(), id));

REVOKE EXECUTE ON FUNCTION public.is_parent_of(uuid, uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_student_self(uuid, uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.teacher_can_see_student(uuid, uuid) FROM authenticated, anon, PUBLIC;