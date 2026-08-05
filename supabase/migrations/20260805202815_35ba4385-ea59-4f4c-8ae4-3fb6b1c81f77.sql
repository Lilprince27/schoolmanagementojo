-- 1. School payout config
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS flw_subaccount_id text,
  ADD COLUMN IF NOT EXISTS payout_bank_code text,
  ADD COLUMN IF NOT EXISTS payout_account_number text,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric NOT NULL DEFAULT 0;

-- 2. Fee structures
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  term term_type,
  amount numeric NOT NULL CHECK (amount >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_structures_read_school" ON public.fee_structures
  FOR SELECT TO authenticated
  USING (
    public.is_school_admin(auth.uid(), school_id)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.school_org_id = fee_structures.school_id AND s.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.parents p WHERE p.school_org_id = fee_structures.school_id AND p.profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.school_org_id = fee_structures.school_id AND t.profile_id = auth.uid())
  );

CREATE POLICY "fee_structures_admin_write" ON public.fee_structures
  FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id));

CREATE TRIGGER trg_fee_structures_updated BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Fee invoices
CREATE TABLE IF NOT EXISTS public.fee_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  title text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  due_date date,
  session_id uuid REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  term term_type,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_invoices TO authenticated;
GRANT ALL ON public.fee_invoices TO service_role;
ALTER TABLE public.fee_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_invoices_read" ON public.fee_invoices
  FOR SELECT TO authenticated
  USING (
    public.is_school_admin(auth.uid(), school_id)
    OR public.is_student_self(auth.uid(), student_id)
    OR public.is_parent_of(auth.uid(), student_id)
  );

CREATE POLICY "fee_invoices_admin_write" ON public.fee_invoices
  FOR ALL TO authenticated
  USING (public.is_school_admin(auth.uid(), school_id))
  WITH CHECK (public.is_school_admin(auth.uid(), school_id));

CREATE TRIGGER trg_fee_invoices_updated BEFORE UPDATE ON public.fee_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Payments ledger
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL,
  purpose text NOT NULL,
  reference text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'flutterwave',
  provider_tx_id text,
  channel text,
  payment_link text,
  order_id uuid REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  bus_fee_payment_id uuid REFERENCES public.bus_fee_payments(id) ON DELETE SET NULL,
  fee_invoice_id uuid REFERENCES public.fee_invoices(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_school ON public.payments(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_read_own_or_admin" ON public.payments
  FOR SELECT TO authenticated
  USING (payer_id = auth.uid() OR public.is_school_admin(auth.uid(), school_id));

CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Shop orders need a payment status flag
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';