
GRANT INSERT ON public.user_roles TO authenticated;

CREATE POLICY "Bootstrap first admin"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'super_admin'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles)
);
