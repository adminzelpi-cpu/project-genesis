---
name: Payment fraud, double-submit and reliability protections
description: Proteções server-side de checkout contra manipulação de preço, duplo clique, perda de carrinho, CPF duplicado e falha de email transacional.
type: feature
---

# Checkout — Proteções de Robustez

## Anti-fraude (server-side)
As edge functions `pagarme-create-payment` e `mercadopago-create-payment` validam o `amount` recebido contra `orders.total` no banco (tolerância 0.01). Bloqueia manipulação de preço via dev tools.

## Anti duplo-clique
`src/pages/storefront/[storeSlug]/checkout.tsx` usa `submitLockRef` (useRef síncrono) além do estado `isSubmitting`. Isso cobre a janela entre o clique e o re-render do React.

## Carrinho seguro em falha de navegação
`navigate(/thank-you)` é chamado ANTES de `clearCart()` (via setTimeout 100ms). Se a navegação falhar, o usuário mantém o carrinho.

## CPF dedupe atômico
- Índice único parcial `customers_store_cpf_unique` em `(store_id, cpf) WHERE cpf IS NOT NULL`.
- `upsert_customer_for_checkout` usa `INSERT ... ON CONFLICT (store_id, cpf) DO UPDATE` em vez de UPDATE-then-INSERT separados. Elimina race condition entre abas/cliques.

## Fallback de email de confirmação
- Edge function `check-missing-payment-emails` roda via cron a cada 15 min.
- Detecta pedidos `aprovado`/`pago` nas últimas 2h (com 5 min de grace) sem registro `payment_confirmed` em `email_logs`.
- Dispara `send-transactional-email` para os faltantes. Idempotente: usa `email_logs` como source of truth.
- Cobre falhas/atrasos de webhook do Pagar.me e Mercado Pago.
