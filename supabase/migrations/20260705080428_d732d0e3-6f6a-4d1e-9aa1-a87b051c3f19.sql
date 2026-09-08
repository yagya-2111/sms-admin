
-- Device commands table (admin sends commands to devices)
CREATE TABLE public.device_commands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  command_type text NOT NULL,
  command_status text NOT NULL DEFAULT 'pending',
  command_data jsonb DEFAULT '{}',
  response_data jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_commands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_commands TO authenticated;
GRANT ALL ON public.device_commands TO service_role;

ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to device_commands" ON public.device_commands
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_device_commands_updated_at
  BEFORE UPDATE ON public.device_commands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Device media table (photos/videos from devices)
CREATE TABLE public.device_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'photo',
  media_url text NOT NULL,
  file_name text,
  file_size bigint,
  thumbnail_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_media TO authenticated;
GRANT ALL ON public.device_media TO service_role;

ALTER TABLE public.device_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to device_media" ON public.device_media
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_device_media_updated_at
  BEFORE UPDATE ON public.device_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
