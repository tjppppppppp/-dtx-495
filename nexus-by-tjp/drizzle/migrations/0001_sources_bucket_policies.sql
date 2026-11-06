
-- Per-user access to the private 'sources' bucket.
-- Files live under <user_id>/<file> so ownership is derivable from the path.
CREATE POLICY "Users read own source files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sources' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users upload own source files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sources' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own source files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sources' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own source files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sources' AND (storage.foldername(name))[1] = auth.uid()::text);
