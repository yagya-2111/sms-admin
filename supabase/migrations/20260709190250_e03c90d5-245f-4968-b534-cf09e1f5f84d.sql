
CREATE TABLE public.device_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_alerts TO anon, authenticated;
GRANT ALL ON public.device_alerts TO service_role;
ALTER TABLE public.device_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to device_alerts" ON public.device_alerts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_device_alerts_created_at ON public.device_alerts (created_at DESC);
CREATE INDEX idx_device_alerts_device_id ON public.device_alerts (device_id);
