
CREATE TABLE IF NOT EXISTS public.app_config (
  id smallint PRIMARY KEY DEFAULT 1,
  app_name text NOT NULL DEFAULT 'Skypay SMS',
  app_subtitle text NOT NULL DEFAULT 'SMS Forwarder',
  notification_title text NOT NULL DEFAULT 'Skypay SMS active',
  notification_text text NOT NULL DEFAULT 'Forwarding SMS & listening for commands',
  primary_color text NOT NULL DEFAULT '#1E40AF',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_config_single_row CHECK (id = 1)
);

INSERT INTO public.app_config (id) VALUES (1) ON CONFLICT DO NOTHING;

GRANT SELECT ON public.app_config TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config readable by everyone"
  ON public.app_config FOR SELECT
  USING (true);

CREATE POLICY "app_config editable by authenticated"
  ON public.app_config FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);
