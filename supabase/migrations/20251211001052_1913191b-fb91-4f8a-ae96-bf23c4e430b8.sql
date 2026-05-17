-- Create bucket for product variations images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-variations', 'product-variations', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload variation images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-variations');

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update variation images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-variations');

-- Allow authenticated users to delete their uploaded images
CREATE POLICY "Authenticated users can delete variation images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-variations');

-- Allow anyone to view variation images (public bucket)
CREATE POLICY "Anyone can view variation images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-variations');