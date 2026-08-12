-- 1. Helper: which schools a user belongs to
CREATE OR REPLACE FUNCTION public.can_access_school(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _school_id IS NOT NULL AND (
    public.is_platform_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.schools s WHERE s.id = _school_id AND s.admin_profile_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.profile_id = _user_id AND t.school_org_id = _school_id)
    OR EXISTS (SELECT 1 FROM public.parents p WHERE p.profile_id = _user_id AND p.school_org_id = _school_id)
    OR EXISTS (SELECT 1 FROM public.students st WHERE st.profile_id = _user_id AND st.school_org_id = _school_id)
    OR EXISTS (SELECT 1 FROM public.drivers d WHERE d.profile_id = _user_id AND d.school_id = _school_id)
  )
$$;

-- 2. schools: remove anon + duplicate open policies, restrict sensitive columns
DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;
DROP POLICY IF EXISTS "Anyone authenticated can view schools for branding" ON public.schools;

CREATE POLICY "Signed-in users can view school directory" ON public.schools
FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.schools FROM anon;
REVOKE SELECT ON public.schools FROM authenticated;
GRANT SELECT (
  id, name, address, state, lga, code, country, created_by, created_at, updated_at,
  admin_profile_id, logo_url, primary_color, secondary_color, motto, banner_url,
  favicon_url, login_background_url
) ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;

-- Sensitive lookups behind authorization checks
CREATE OR REPLACE FUNCTION public.platform_schools()
RETURNS TABLE (
  id uuid, name text, address text, state text, lga text, country text,
  email text, phone text, admin_email text, admin_profile_id uuid,
  logo_url text, banner_url text, primary_color text, secondary_color text,
  motto text, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.address, s.state, s.lga, s.country, s.email, s.phone,
         s.admin_email, s.admin_profile_id, s.logo_url, s.banner_url,
         s.primary_color, s.secondary_color, s.motto, s.created_at
  FROM public.schools s
  WHERE public.is_platform_admin(auth.uid())
  ORDER BY s.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.school_payout_info(_school_id uuid)
RETURNS TABLE (
  name text, flw_subaccount_id text, payout_account_number text,
  payout_account_name text, payout_bank_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.name, s.flw_subaccount_id, s.payout_account_number,
         s.payout_account_name, s.payout_bank_code
  FROM public.schools s
  WHERE s.id = _school_id AND public.is_school_admin(auth.uid(), _school_id)
$$;

-- 3. Transport tables: scope reads to the user's school
DROP POLICY IF EXISTS "buses readable" ON public.buses;
CREATE POLICY "buses readable to school" ON public.buses
FOR SELECT TO authenticated USING (public.can_access_school(auth.uid(), school_id));

DROP POLICY IF EXISTS "routes readable" ON public.bus_routes;
CREATE POLICY "routes readable to school" ON public.bus_routes
FOR SELECT TO authenticated USING (public.can_access_school(auth.uid(), school_id));

DROP POLICY IF EXISTS "trips readable" ON public.bus_trips;
CREATE POLICY "trips readable to school" ON public.bus_trips
FOR SELECT TO authenticated USING (public.can_access_school(auth.uid(), school_id));

DROP POLICY IF EXISTS "rates readable" ON public.transport_fee_rates;
CREATE POLICY "rates readable to school" ON public.transport_fee_rates
FOR SELECT TO authenticated USING (public.can_access_school(auth.uid(), school_id));

DROP POLICY IF EXISTS "stops readable" ON public.route_stops;
CREATE POLICY "stops readable to school" ON public.route_stops
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bus_routes r
          WHERE r.id = route_stops.route_id
            AND public.can_access_school(auth.uid(), r.school_id))
);

DROP POLICY IF EXISTS "events readable" ON public.trip_events;
CREATE POLICY "events readable to school" ON public.trip_events
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bus_trips t
          WHERE t.id = trip_events.trip_id
            AND public.can_access_school(auth.uid(), t.school_id))
);

DROP POLICY IF EXISTS "pings readable" ON public.bus_gps_pings;
CREATE POLICY "pings readable to school" ON public.bus_gps_pings
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.bus_trips t
          WHERE t.id = bus_gps_pings.trip_id
            AND public.can_access_school(auth.uid(), t.school_id))
);

-- 4. drivers: remove USING(true) policy
DROP POLICY IF EXISTS "drivers readable to school" ON public.drivers;
CREATE POLICY "drivers readable within school" ON public.drivers
FOR SELECT TO authenticated USING (public.can_access_school(auth.uid(), school_id));

-- 5. storage.objects policies for the private school-assets bucket
DROP POLICY IF EXISTS "school assets readable by members" ON storage.objects;
DROP POLICY IF EXISTS "school assets writable by admins" ON storage.objects;
DROP POLICY IF EXISTS "school assets updatable by admins" ON storage.objects;
DROP POLICY IF EXISTS "school assets deletable by admins" ON storage.objects;

CREATE POLICY "school assets readable by members" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'school-assets'
  AND public.can_access_school(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "school assets writable by admins" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'school-assets'
  AND public.is_school_admin(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "school assets updatable by admins" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'school-assets'
  AND public.is_school_admin(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
) WITH CHECK (
  bucket_id = 'school-assets'
  AND public.is_school_admin(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

CREATE POLICY "school assets deletable by admins" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'school-assets'
  AND public.is_school_admin(auth.uid(), NULLIF((storage.foldername(name))[1], '')::uuid)
);

-- 6. Lock down function execution
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

GRANT EXECUTE ON FUNCTION
  public.has_role(uuid, public.app_role),
  public.is_admin(uuid),
  public.is_any_teacher(uuid),
  public.is_parent_of(uuid, uuid),
  public.is_platform_admin(uuid),
  public.is_school_admin(uuid, uuid),
  public.is_student_self(uuid, uuid),
  public.teacher_can_see_student(uuid, uuid),
  public.can_access_school(uuid, uuid),
  public.platform_schools(),
  public.school_payout_info(uuid),
  public.approve_join_request(uuid),
  public.reject_join_request(uuid),
  public.approve_teacher(uuid),
  public.reject_teacher(uuid),
  public.approve_parent(uuid),
  public.reject_parent(uuid),
  public.assign_school_admin(uuid, text)
TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;