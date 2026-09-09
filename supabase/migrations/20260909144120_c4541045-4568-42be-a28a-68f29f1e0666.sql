CREATE OR REPLACE FUNCTION public.can_access_school(_user_id uuid, _school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND _school_id IS NOT NULL AND (
    public.is_platform_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = _school_id AND s.admin_profile_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.profile_id = _user_id AND t.school_org_id = _school_id)
    OR EXISTS (SELECT 1 FROM public.parents p WHERE p.profile_id = _user_id AND p.school_org_id = _school_id)
    OR EXISTS (SELECT 1 FROM public.students st WHERE st.profile_id = _user_id AND st.school_org_id = _school_id)
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.profile_id = _user_id AND d.school_id = _school_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND lower(email) = 'princelaw4u.pl@gmail.com'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid, _school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.schools WHERE id = _school_id AND admin_profile_id = _user_id)
    OR public.is_platform_admin(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.parent_students ps
    JOIN public.parents p ON p.id = ps.parent_id
    WHERE p.profile_id = _user_id AND ps.student_id = _student_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_student_self(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.students WHERE id=_student_id AND profile_id=_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_see_student(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.teachers t ON t.profile_id = _user_id
    WHERE s.id = _student_id AND (
      t.class_id = s.class_id
      OR EXISTS (SELECT 1 FROM public.teacher_subjects ts WHERE ts.teacher_id=t.id AND ts.class_id=s.class_id)
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_user(_admin uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _admin = auth.uid() AND _admin IS NOT NULL AND _target IS NOT NULL AND (
    public.is_platform_admin(_admin)
    OR _admin = _target
    OR EXISTS (
      SELECT 1 FROM public.schools s
      WHERE s.admin_profile_id = _admin AND (
        EXISTS (SELECT 1 FROM public.teachers t WHERE t.profile_id = _target AND t.school_org_id = s.id)
        OR EXISTS (SELECT 1 FROM public.parents p WHERE p.profile_id = _target AND p.school_org_id = s.id)
        OR EXISTS (SELECT 1 FROM public.students st WHERE st.profile_id = _target AND st.school_org_id = s.id)
        OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.profile_id = _target AND d.school_id = s.id)
        OR EXISTS (SELECT 1 FROM public.join_requests j WHERE j.user_id = _target AND j.school_id = s.id)
      )
    )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.student_school(uuid) FROM PUBLIC, anon;