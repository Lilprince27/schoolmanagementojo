CREATE TABLE public.payment_settings (
  id boolean PRIMARY KEY DEFAULT true,
  mode text NOT NULL DEFAULT 'test',
  live_secret_key text,
  test_secret_key text,
  secret_hash text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_settings_singleton CHECK (id),
  CONSTRAINT payment_settings_mode_valid CHECK (mode IN ('test','live'))
);

GRANT ALL ON public.payment_settings TO service_role;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.payment_settings (id, mode) VALUES (true, 'test');