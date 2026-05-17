
-- Fix existing data: ensure only one default per customer
WITH ranked AS (
  SELECT id, customer_id, is_default,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) as rn
  FROM customer_addresses
  WHERE is_default = true
)
UPDATE customer_addresses
SET is_default = false
FROM ranked
WHERE customer_addresses.id = ranked.id
AND ranked.rn > 1;

-- Create trigger to enforce single default address per customer
CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE customer_addresses
    SET is_default = false
    WHERE customer_id = NEW.customer_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER enforce_single_default_address_trigger
BEFORE INSERT OR UPDATE ON customer_addresses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_default_address();
