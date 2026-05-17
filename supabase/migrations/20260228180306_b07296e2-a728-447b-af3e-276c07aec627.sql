
-- Function to generate a unique slug from a store name
-- Handles: accents removal, special chars, consecutive hyphens, trailing hyphens
-- Auto-appends -2, -3, etc. if slug already exists
CREATE OR REPLACE FUNCTION public.generate_unique_store_slug(store_name text, exclude_store_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  counter integer := 1;
BEGIN
  -- Normalize: lowercase, remove accents, replace non-alphanumeric with hyphens
  base_slug := lower(trim(store_name));
  
  -- Remove common accents (Portuguese)
  base_slug := translate(base_slug, 
    'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝÑÇ',
    'aaaaaaeeeeiiiioooooeuuuuyynccaaaaaaeeeeiiiioooooeuuuuync');
  
  -- Replace non-alphanumeric characters with hyphens
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  
  -- Remove consecutive hyphens
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  
  -- Ensure minimum length
  IF length(base_slug) < 2 THEN
    base_slug := 'loja';
  END IF;
  
  -- Truncate to reasonable length (max 50 chars for slug)
  base_slug := left(base_slug, 50);
  
  -- Remove trailing hyphen after truncation
  base_slug := trim(trailing '-' from base_slug);
  
  -- Check if base slug is available
  candidate_slug := base_slug;
  
  LOOP
    -- Check if this slug exists (excluding the current store if editing)
    IF NOT EXISTS (
      SELECT 1 FROM stores 
      WHERE slug = candidate_slug 
      AND (exclude_store_id IS NULL OR id != exclude_store_id)
    ) THEN
      RETURN candidate_slug;
    END IF;
    
    -- Increment counter and try again
    counter := counter + 1;
    candidate_slug := base_slug || '-' || counter;
  END LOOP;
END;
$$;
