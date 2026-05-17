
-- Fix: make the trigger function SECURITY DEFINER so the internal UPDATE
-- bypasses RLS and can always unset other default addresses
CREATE OR REPLACE FUNCTION public.enforce_single_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
