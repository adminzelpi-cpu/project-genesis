-- Create storage bucket for store logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view store logos (public bucket)
CREATE POLICY "Store logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');

-- Allow authenticated users to upload their store logo
CREATE POLICY "Users can upload their store logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their store logo
CREATE POLICY "Users can update their store logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their store logo
CREATE POLICY "Users can delete their store logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-logos' 
  AND auth.role() = 'authenticated'
);