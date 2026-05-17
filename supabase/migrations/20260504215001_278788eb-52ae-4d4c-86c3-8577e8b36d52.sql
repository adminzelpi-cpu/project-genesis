-- Garantir purchase_event_id sempre presente desde o INSERT da order
-- Elimina race condition entre Pixel (thank-you) e CAPI (webhook): ambos lerão o mesmo UUID.
ALTER TABLE public.orders
  ALTER COLUMN purchase_event_id SET DEFAULT gen_random_uuid();

-- Backfill para orders existentes ainda sem event_id (não pagas / em andamento)
UPDATE public.orders
SET purchase_event_id = gen_random_uuid()
WHERE purchase_event_id IS NULL;

-- Opcional: garantir NOT NULL daqui pra frente
ALTER TABLE public.orders
  ALTER COLUMN purchase_event_id SET NOT NULL;