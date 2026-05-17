-- ETAPA 3a: Preparar tabelas do portal para isolamento por loja via customer_id
-- Sem remover user_id ainda (compatibilidade com app antigo durante transição)

-- 1. Adicionar customer_id (nullable) nas tabelas que hoje usam user_id (auth.users.id)
ALTER TABLE public.favorites ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE;

-- 2. Backfill: popular customer_id baseado em customers.auth_user_id
-- Cuidado: um auth_user_id pode estar vinculado a múltiplos customers (1 por loja).
-- Para favorites/notifications/addresses, escolhemos o customer mais recente do user.
-- Isso é seguro porque hoje o app antigo só tem 1 loja por usuário na prática.

UPDATE public.favorites f
SET customer_id = (
  SELECT c.id FROM public.customers c
  WHERE c.auth_user_id = f.user_id
  ORDER BY c.updated_at DESC
  LIMIT 1
)
WHERE f.customer_id IS NULL AND f.user_id IS NOT NULL;

UPDATE public.customer_notifications n
SET customer_id = (
  SELECT c.id FROM public.customers c
  WHERE c.auth_user_id = n.user_id
  ORDER BY c.updated_at DESC
  LIMIT 1
)
WHERE n.customer_id IS NULL AND n.user_id IS NOT NULL;

UPDATE public.addresses a
SET customer_id = (
  SELECT c.id FROM public.customers c
  WHERE c.auth_user_id = a.user_id
  ORDER BY c.updated_at DESC
  LIMIT 1
)
WHERE a.customer_id IS NULL AND a.user_id IS NOT NULL;

-- 3. Índices para performance das novas queries por customer_id
CREATE INDEX IF NOT EXISTS idx_favorites_customer_id ON public.favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id ON public.customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON public.addresses(customer_id);

-- 4. Índice em customers.platform_user_id (ID global escondido, usado em login multi-loja futuro)
CREATE INDEX IF NOT EXISTS idx_customers_platform_user_id ON public.customers(platform_user_id);

-- 5. RLS: manter políticas atuais funcionando (não remover) e adicionar política
-- que permite acesso via service_role (edge functions com JWT customizado).
-- service_role já bypassa RLS por padrão, então não precisa policy explícita —
-- mas garantimos que RLS está habilitado em todas as 3 tabelas.

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;