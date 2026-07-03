
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS motto TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS login_background_url TEXT;

-- Allow any authenticated user to SELECT schools (for branding lookup on their own school).
-- Existing policies remain; this just ensures branding is readable.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='schools' AND policyname='Anyone authenticated can view schools for branding') THEN
    EXECUTE 'CREATE POLICY "Anyone authenticated can view schools for branding" ON public.schools FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;
