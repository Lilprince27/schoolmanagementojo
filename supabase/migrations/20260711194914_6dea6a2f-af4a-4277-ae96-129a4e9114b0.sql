
CREATE TABLE IF NOT EXISTS public.vehicle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  bus_id uuid NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('oil_change','tire_replacement','repair','inspection','insurance_renewal','license_renewal','other')),
  service_date date NOT NULL,
  next_due_date date,
  cost numeric(12,2),
  provider text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_maintenance TO authenticated;
GRANT ALL ON public.vehicle_maintenance TO service_role;
ALTER TABLE public.vehicle_maintenance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "maintenance school admin all" ON public.vehicle_maintenance
  FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager'))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager'));
CREATE TRIGGER trg_vehicle_maintenance_updated
  BEFORE UPDATE ON public.vehicle_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_maint_bus ON public.vehicle_maintenance(bus_id);
CREATE INDEX IF NOT EXISTS idx_maint_school ON public.vehicle_maintenance(school_id);
CREATE INDEX IF NOT EXISTS idx_maint_due ON public.vehicle_maintenance(next_due_date);

CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES public.buses(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES public.bus_trips(id) ON DELETE SET NULL,
  alert_type text NOT NULL DEFAULT 'general' CHECK (alert_type IN ('general','accident','breakdown','medical','security','other')),
  latitude double precision,
  longitude double precision,
  note text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_alerts TO authenticated;
GRANT ALL ON public.emergency_alerts TO service_role;
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency school admin all" ON public.emergency_alerts
  FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager'))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(),'transport_manager'));
CREATE POLICY "emergency driver insert own bus" ON public.emergency_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.profile_id = auth.uid())
  );
CREATE POLICY "emergency driver read own" ON public.emergency_alerts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.profile_id = auth.uid())
  );
CREATE POLICY "emergency parent read active trip" ON public.emergency_alerts
  FOR SELECT TO authenticated
  USING (
    trip_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bus_trips bt
      JOIN public.student_bus_assignments sba ON sba.route_id = bt.route_id
      JOIN public.parent_students ps ON ps.student_id = sba.student_id
      JOIN public.parents p ON p.id = ps.parent_id
      WHERE bt.id = emergency_alerts.trip_id AND p.profile_id = auth.uid()
    )
  );
CREATE TRIGGER trg_emergency_alerts_updated
  BEFORE UPDATE ON public.emergency_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_emg_school ON public.emergency_alerts(school_id);
CREATE INDEX IF NOT EXISTS idx_emg_bus ON public.emergency_alerts(bus_id);
CREATE INDEX IF NOT EXISTS idx_emg_unresolved ON public.emergency_alerts(school_id) WHERE resolved_at IS NULL;
