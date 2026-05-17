ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_methods_customer_id ON public.payment_methods(customer_id);

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_methods'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payment_methods', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;