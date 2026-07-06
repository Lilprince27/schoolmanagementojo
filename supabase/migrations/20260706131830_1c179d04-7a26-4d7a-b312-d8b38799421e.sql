
-- Extend buses
ALTER TABLE public.buses
  ADD COLUMN IF NOT EXISTS registration_no text,
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS assistant_name text,
  ADD COLUMN IF NOT EXISTS assistant_phone text,
  ADD COLUMN IF NOT EXISTS gps_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS inspection_date date,
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Drivers
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  photo_url text,
  phone text,
  email text,
  license_no text,
  license_expiry date,
  address text,
  emergency_contact text,
  assigned_bus_id uuid REFERENCES public.buses(id) ON DELETE SET NULL,
  employment_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers manage" ON public.drivers FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager'));
CREATE POLICY "drivers self read" ON public.drivers FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
CREATE POLICY "drivers readable to school" ON public.drivers FOR SELECT TO authenticated
  USING (true);
CREATE TRIGGER trg_drivers_updated BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.buses
  ADD CONSTRAINT buses_driver_fk FOREIGN KEY (assigned_driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;

-- Extend routes
ALTER TABLE public.bus_routes
  ADD COLUMN IF NOT EXISTS distance_km numeric(8,2),
  ADD COLUMN IF NOT EXISTS travel_minutes integer,
  ADD COLUMN IF NOT EXISTS destination_name text,
  ADD COLUMN IF NOT EXISTS destination_lat numeric(10,7),
  ADD COLUMN IF NOT EXISTS destination_lng numeric(10,7);

-- Route stops
CREATE TABLE IF NOT EXISTS public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude numeric(10,7),
  longitude numeric(10,7),
  stop_order integer NOT NULL DEFAULT 0,
  pickup_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.route_stops TO authenticated;
GRANT ALL ON public.route_stops TO service_role;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stops readable" ON public.route_stops FOR SELECT TO authenticated USING (true);
CREATE POLICY "stops manage" ON public.route_stops FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager'));

-- Extend assignments
ALTER TABLE public.student_bus_assignments
  ADD COLUMN IF NOT EXISTS pickup_stop_id uuid REFERENCES public.route_stops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dropoff_stop_id uuid REFERENCES public.route_stops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pickup_time time,
  ADD COLUMN IF NOT EXISTS seat_number text;

-- Trips
CREATE TABLE IF NOT EXISTS public.bus_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  bus_id uuid NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  route_id uuid REFERENCES public.bus_routes(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'morning',
  status text NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  last_lat numeric(10,7),
  last_lng numeric(10,7),
  last_speed numeric(6,2),
  last_ping_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bus_trips TO authenticated;
GRANT ALL ON public.bus_trips TO service_role;
ALTER TABLE public.bus_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trips readable" ON public.bus_trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "trips manage" ON public.bus_trips FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager')
    OR EXISTS(SELECT 1 FROM public.drivers d WHERE d.id = bus_trips.driver_id AND d.profile_id = auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager')
    OR EXISTS(SELECT 1 FROM public.drivers d WHERE d.id = bus_trips.driver_id AND d.profile_id = auth.uid()));
CREATE TRIGGER trg_bus_trips_updated BEFORE UPDATE ON public.bus_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trip events
CREATE TABLE IF NOT EXISTS public.trip_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.bus_trips(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  stop_id uuid REFERENCES public.route_stops(id) ON DELETE SET NULL,
  note text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_events TO authenticated;
GRANT ALL ON public.trip_events TO service_role;
ALTER TABLE public.trip_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events readable" ON public.trip_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events manage" ON public.trip_events FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager')
    OR EXISTS(SELECT 1 FROM public.bus_trips t JOIN public.drivers d ON d.id=t.driver_id WHERE t.id=trip_events.trip_id AND d.profile_id=auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager')
    OR EXISTS(SELECT 1 FROM public.bus_trips t JOIN public.drivers d ON d.id=t.driver_id WHERE t.id=trip_events.trip_id AND d.profile_id=auth.uid()));

-- GPS pings
CREATE TABLE IF NOT EXISTS public.bus_gps_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.bus_trips(id) ON DELETE CASCADE,
  latitude numeric(10,7) NOT NULL,
  longitude numeric(10,7) NOT NULL,
  speed numeric(6,2),
  heading numeric(6,2),
  accuracy numeric(8,2),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bus_gps_trip_time ON public.bus_gps_pings(trip_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.bus_gps_pings TO authenticated;
GRANT ALL ON public.bus_gps_pings TO service_role;
ALTER TABLE public.bus_gps_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pings readable" ON public.bus_gps_pings FOR SELECT TO authenticated USING (true);
CREATE POLICY "pings driver insert" ON public.bus_gps_pings FOR INSERT TO authenticated
  WITH CHECK (EXISTS(SELECT 1 FROM public.bus_trips t JOIN public.drivers d ON d.id=t.driver_id
    WHERE t.id=bus_gps_pings.trip_id AND d.profile_id=auth.uid() AND t.status='in_progress'));

-- Transport fee rates
CREATE TABLE IF NOT EXISTS public.transport_fee_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  term text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(route_id, session_id, term)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_fee_rates TO authenticated;
GRANT ALL ON public.transport_fee_rates TO service_role;
ALTER TABLE public.transport_fee_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates readable" ON public.transport_fee_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "rates manage" ON public.transport_fee_rates FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager'))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(),'transport_manager'));
CREATE TRIGGER trg_rates_updated BEFORE UPDATE ON public.transport_fee_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend bus_fee_payments
ALTER TABLE public.bus_fee_payments
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS term text,
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS receipt_no text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.parents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date date;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_trips;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_gps_pings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_events;
