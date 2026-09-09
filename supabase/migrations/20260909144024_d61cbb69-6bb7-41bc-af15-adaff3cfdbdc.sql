-- 1) Drivers: restrict full-row reads to school staff who need them
DROP POLICY IF EXISTS "drivers readable within school" ON public.drivers;

CREATE POLICY "drivers readable by school staff"
ON public.drivers
FOR SELECT
TO authenticated
USING (
  public.can_access_school(auth.uid(), school_id)
  AND (
    public.is_school_admin(auth.uid(), school_id)
    OR public.has_role(auth.uid(), 'transport_manager'::app_role)
  )
);

-- 2) Schools: ensure sensitive payout / contact columns are never readable
--    by ordinary signed-in users, even though the directory SELECT policy
--    allows searching schools by name/state/LGA.
REVOKE SELECT (
  admin_email,
  email,
  phone,
  created_by,
  flw_subaccount_id,
  payout_bank_code,
  payout_account_number,
  payout_account_name,
  platform_fee_percent
) ON public.schools FROM authenticated, anon;

REVOKE ALL ON public.schools FROM anon;