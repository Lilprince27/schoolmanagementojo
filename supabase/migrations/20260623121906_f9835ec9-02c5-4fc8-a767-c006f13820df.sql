
CREATE TABLE public.buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plate_number text NOT NULL,
  model text,
  capacity int NOT NULL DEFAULT 0,
  driver_name text,
  driver_phone text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buses TO authenticated;
GRANT ALL ON public.buses TO service_role;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buses readable" ON public.buses FOR SELECT TO authenticated USING (true);
CREATE POLICY "buses manage" ON public.buses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'transport_manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'transport_manager'));
CREATE TRIGGER trg_buses_updated BEFORE UPDATE ON public.buses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bus_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES public.buses(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  pickup_time time,
  dropoff_time time,
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  monthly_fee numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bus_routes TO authenticated;
GRANT ALL ON public.bus_routes TO service_role;
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes readable" ON public.bus_routes FOR SELECT TO authenticated USING (true);
CREATE POLICY "routes manage" ON public.bus_routes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'transport_manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'transport_manager'));
CREATE TRIGGER trg_bus_routes_updated BEFORE UPDATE ON public.bus_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_bus_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  stop_name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, route_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_bus_assignments TO authenticated;
GRANT ALL ON public.student_bus_assignments TO service_role;
ALTER TABLE public.student_bus_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sba manage" ON public.student_bus_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'transport_manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'transport_manager'));
CREATE POLICY "sba visible" ON public.student_bus_assignments FOR SELECT TO authenticated
  USING (
    public.is_student_self(auth.uid(), student_id)
    OR public.is_parent_of(auth.uid(), student_id)
    OR public.teacher_can_see_student(auth.uid(), student_id)
  );
CREATE TRIGGER trg_sba_updated BEFORE UPDATE ON public.student_bus_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bus_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.bus_routes(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  period text NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  paid_at timestamptz,
  note text,
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bus_fee_payments TO authenticated;
GRANT ALL ON public.bus_fee_payments TO service_role;
ALTER TABLE public.bus_fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fees manage" ON public.bus_fee_payments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'transport_manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'transport_manager'));
CREATE POLICY "fees visible" ON public.bus_fee_payments FOR SELECT TO authenticated
  USING (
    public.is_student_self(auth.uid(), student_id)
    OR public.is_parent_of(auth.uid(), student_id)
  );
CREATE TRIGGER trg_bus_fee_updated BEFORE UPDATE ON public.bus_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
