
-- helper: is _admin the admin of the school _target user belongs to?
CREATE OR REPLACE FUNCTION public.is_admin_of_user(_admin uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _admin IS NOT NULL AND _target IS NOT NULL AND (
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
REVOKE EXECUTE ON FUNCTION public.is_admin_of_user(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_of_user(uuid, uuid) TO authenticated;

-- helper: school of a student
CREATE OR REPLACE FUNCTION public.student_school(_student_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT school_org_id FROM public.students WHERE id = _student_id
$$;
REVOKE EXECUTE ON FUNCTION public.student_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_school(uuid) TO authenticated;

-- ============ core tables: scope admin management by school ============
DROP POLICY IF EXISTS "Admin manages sessions" ON public.academic_sessions;
CREATE POLICY "School admin manages sessions" ON public.academic_sessions FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_org_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_org_id));

DROP POLICY IF EXISTS "All auth read sessions" ON public.academic_sessions;
CREATE POLICY "School members read sessions" ON public.academic_sessions FOR SELECT TO authenticated
  USING (public.can_access_school(auth.uid(), school_org_id));

DROP POLICY IF EXISTS "Admin manages classes" ON public.classes;
CREATE POLICY "School admin manages classes" ON public.classes FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_org_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_org_id));

DROP POLICY IF EXISTS "All auth read classes" ON public.classes;
CREATE POLICY "School members read classes" ON public.classes FOR SELECT TO authenticated
  USING (public.can_access_school(auth.uid(), school_org_id));

DROP POLICY IF EXISTS "Admin manages students" ON public.students;
CREATE POLICY "School admin manages students" ON public.students FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_org_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_org_id));

DROP POLICY IF EXISTS "Admin manages teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admin manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admin delete teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teacher view self" ON public.teachers;
DROP POLICY IF EXISTS "All teachers visible to teachers" ON public.teachers;
CREATE POLICY "School admin manages teachers" ON public.teachers FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_org_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_org_id));
CREATE POLICY "School staff read teachers" ON public.teachers FOR SELECT TO authenticated
  USING (public.can_access_school(auth.uid(), school_org_id));

DROP POLICY IF EXISTS "Admin manages parents" ON public.parents;
DROP POLICY IF EXISTS "Admin manage parents" ON public.parents;
DROP POLICY IF EXISTS "Admin delete parents" ON public.parents;
DROP POLICY IF EXISTS "Parent view self" ON public.parents;
DROP POLICY IF EXISTS "Teachers read parents" ON public.parents;
CREATE POLICY "School admin manages parents" ON public.parents FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_org_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_org_id));
CREATE POLICY "School staff read parents" ON public.parents FOR SELECT TO authenticated
  USING (public.is_any_teacher(auth.uid()) AND public.can_access_school(auth.uid(), school_org_id));

DROP POLICY IF EXISTS "Admin manages attendance" ON public.attendance;
CREATE POLICY "School admin manages attendance" ON public.attendance FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), public.student_school(student_id)))
  WITH CHECK (public.is_school_admin(auth.uid(), public.student_school(student_id)));

DROP POLICY IF EXISTS "Admin manages results" ON public.results;
CREATE POLICY "School admin manages results" ON public.results FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), public.student_school(student_id)))
  WITH CHECK (public.is_school_admin(auth.uid(), public.student_school(student_id)));

DROP POLICY IF EXISTS "Admin manages parent_students" ON public.parent_students;
CREATE POLICY "School admin manages parent_students" ON public.parent_students FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), public.student_school(student_id)))
  WITH CHECK (public.is_school_admin(auth.uid(), public.student_school(student_id)));

DROP POLICY IF EXISTS "Admin manages teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "School admin manages teacher_subjects" ON public.teacher_subjects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND public.is_school_admin(auth.uid(), t.school_org_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_id AND public.is_school_admin(auth.uid(), t.school_org_id)));

DROP POLICY IF EXISTS "Admin manages subjects" ON public.subjects;
CREATE POLICY "Platform admin manages subjects" ON public.subjects FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.schools s WHERE s.admin_profile_id = auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.schools s WHERE s.admin_profile_id = auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Admin manages profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.profiles;
CREATE POLICY "School admin manages profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin_of_user(auth.uid(), id))
  WITH CHECK (public.is_admin_of_user(auth.uid(), id));
CREATE POLICY "Users read own or school profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin_of_user(auth.uid(), id));

-- user_roles: no cross-tenant or privileged grants
DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "School admin manages member roles" ON public.user_roles FOR ALL TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (public.is_admin_of_user(auth.uid(), user_id) AND role IN ('class_teacher','subject_teacher','parent','student'))
  )
  WITH CHECK (
    public.is_platform_admin(auth.uid())
    OR (public.is_admin_of_user(auth.uid(), user_id) AND role IN ('class_teacher','subject_teacher','parent','student'))
  );
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_of_user(auth.uid(), user_id));

-- ============ announcements: per school ============
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS school_org_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
DROP POLICY IF EXISTS "Admin manages announcements" ON public.announcements;
DROP POLICY IF EXISTS "Read announcements by audience" ON public.announcements;
CREATE POLICY "School admin manages announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_org_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_org_id));
CREATE POLICY "School members read announcements" ON public.announcements FOR SELECT TO authenticated
  USING (
    public.can_access_school(auth.uid(), school_org_id)
    AND (
      audience = 'all'
      OR (audience = 'teachers' AND public.is_any_teacher(auth.uid()))
      OR (audience = 'parents' AND public.has_role(auth.uid(), 'parent'))
      OR (audience = 'students' AND public.has_role(auth.uid(), 'student'))
      OR public.is_school_admin(auth.uid(), school_org_id)
    )
  );

-- ============ transport: scope manage policies by school ============
DROP POLICY IF EXISTS "buses manage" ON public.buses;
CREATE POLICY "buses manage" ON public.buses FOR ALL TO authenticated
  USING (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')))
  WITH CHECK (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')));

DROP POLICY IF EXISTS "drivers manage" ON public.drivers;
CREATE POLICY "drivers manage" ON public.drivers FOR ALL TO authenticated
  USING (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')))
  WITH CHECK (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')));

DROP POLICY IF EXISTS "routes manage" ON public.bus_routes;
CREATE POLICY "routes manage" ON public.bus_routes FOR ALL TO authenticated
  USING (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')))
  WITH CHECK (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')));

DROP POLICY IF EXISTS "rates manage" ON public.transport_fee_rates;
CREATE POLICY "rates manage" ON public.transport_fee_rates FOR ALL TO authenticated
  USING (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')))
  WITH CHECK (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')));

DROP POLICY IF EXISTS "trips manage" ON public.bus_trips;
CREATE POLICY "trips manage" ON public.bus_trips FOR ALL TO authenticated
  USING (
    (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')))
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = bus_trips.driver_id AND d.profile_id = auth.uid())
  )
  WITH CHECK (
    (public.can_access_school(auth.uid(), school_id) AND (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager')))
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = bus_trips.driver_id AND d.profile_id = auth.uid())
  );

DROP POLICY IF EXISTS "stops manage" ON public.route_stops;
CREATE POLICY "stops manage" ON public.route_stops FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bus_routes r WHERE r.id = route_stops.route_id AND public.can_access_school(auth.uid(), r.school_id)
                 AND (public.is_school_admin(auth.uid(), r.school_id) OR public.has_role(auth.uid(),'transport_manager'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bus_routes r WHERE r.id = route_stops.route_id AND public.can_access_school(auth.uid(), r.school_id)
                 AND (public.is_school_admin(auth.uid(), r.school_id) OR public.has_role(auth.uid(),'transport_manager'))));

DROP POLICY IF EXISTS "events manage" ON public.trip_events;
CREATE POLICY "events manage" ON public.trip_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bus_trips t WHERE t.id = trip_events.trip_id AND public.can_access_school(auth.uid(), t.school_id)
                 AND (public.is_school_admin(auth.uid(), t.school_id) OR public.has_role(auth.uid(),'transport_manager')))
         OR EXISTS (SELECT 1 FROM public.bus_trips t JOIN public.drivers d ON d.id = t.driver_id WHERE t.id = trip_events.trip_id AND d.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bus_trips t WHERE t.id = trip_events.trip_id AND public.can_access_school(auth.uid(), t.school_id)
                 AND (public.is_school_admin(auth.uid(), t.school_id) OR public.has_role(auth.uid(),'transport_manager')))
         OR EXISTS (SELECT 1 FROM public.bus_trips t JOIN public.drivers d ON d.id = t.driver_id WHERE t.id = trip_events.trip_id AND d.profile_id = auth.uid()));

-- ============ join request role escalation ============
ALTER TABLE public.join_requests DROP CONSTRAINT IF EXISTS join_requests_role_scoped;
ALTER TABLE public.join_requests ADD CONSTRAINT join_requests_role_scoped
  CHECK (requested_role IN ('class_teacher','subject_teacher','parent','student'));

CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
  IF r.requested_role NOT IN ('class_teacher','subject_teacher','parent','student') THEN
    RAISE EXCEPTION 'role not allowed via join requests';
  END IF;

  SELECT full_name, email INTO _full_name, _email FROM public.profiles WHERE id = r.user_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (r.user_id, r.requested_role)
  ON CONFLICT DO NOTHING;

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
END; $function$;

-- ============ schools directory: only non-sensitive columns ============
REVOKE SELECT ON public.schools FROM authenticated, anon;
GRANT SELECT (id, name, address, state, lga, country, code, logo_url, banner_url, favicon_url,
              login_background_url, primary_color, secondary_color, motto, admin_profile_id, created_at)
  ON public.schools TO authenticated;
DROP POLICY IF EXISTS "Signed-in users can view school directory" ON public.schools;
CREATE POLICY "Signed-in users can view school directory fields" ON public.schools FOR SELECT TO authenticated
  USING (true);
