
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS signal_strength smallint;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS network_type text;

CREATE TABLE IF NOT EXISTS public.device_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS device_messages_device_id_idx ON public.device_messages(device_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_messages TO anon, authenticated;
GRANT ALL ON public.device_messages TO service_role;

ALTER TABLE public.device_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to device_messages" ON public.device_messages;
CREATE POLICY "Allow all access to device_messages"
  ON public.device_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
