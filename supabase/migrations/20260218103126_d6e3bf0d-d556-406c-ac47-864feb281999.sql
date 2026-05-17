-- Drop the restrictive check constraint and add all valid status values
ALTER TABLE public.orders DROP CONSTRAINT check_status_pagamento;

ALTER TABLE public.orders ADD CONSTRAINT check_status_pagamento 
CHECK (status_pagamento = ANY (ARRAY[
  'pendente', 'pago', 'aprovado', 'falhou', 'reembolsado', 
  'expirado', 'cancelado', 'rejeitado', 'recusado'
]));