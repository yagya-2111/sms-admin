
CREATE POLICY "Allow public uploads to device-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'device-media');

CREATE POLICY "Allow public reads from device-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'device-media');

CREATE POLICY "Allow public deletes from device-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'device-media');
