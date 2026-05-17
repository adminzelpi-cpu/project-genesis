-- 1. Limpar pedidos lixo antigos (testes - pendente nunca pagos, expirados, cancelados, rejeitados)
-- Mantém apenas pedidos com pagamento aprovado/pago ou cancelados manualmente recentes
DELETE FROM public.orders
WHERE (
  (status_pagamento = 'pendente' AND status_pedido = 'novo')
  OR status_pagamento = 'expirado'
  OR status_pagamento = 'rejeitado'
  OR (status_pagamento = 'cancelado' AND status_pedido = 'novo')
  OR (status_pagamento = 'reembolsado' AND status_pedido = 'cancelado')
);

-- 2. Função para deletar pedido com falha de pagamento (chamada pelo checkout no erro)
-- Só permite deletar se ainda estiver pendente e não tiver pagamento confirmado
CREATE OR REPLACE FUNCTION public.delete_failed_order(p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status_pagamento INTO v_status
  FROM orders WHERE id = p_order_id;

  IF v_status IS NULL THEN
    RETURN false; -- já não existe
  END IF;

  -- Segurança: só apaga se ainda estiver pendente (não pago)
  IF v_status NOT IN ('pendente', 'rejeitado') THEN
    RETURN false;
  END IF;

  -- Apaga transações associadas primeiro
  DELETE FROM payment_transactions WHERE order_id = p_order_id;
  -- Apaga o pedido
  DELETE FROM orders WHERE id = p_order_id AND status_pagamento IN ('pendente', 'rejeitado');

  RETURN true;
END;
$$;