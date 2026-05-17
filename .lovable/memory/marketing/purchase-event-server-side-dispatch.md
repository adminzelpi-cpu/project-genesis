---
name: purchase-event-server-side-dispatch
description: Disparo robusto do evento Purchase (Meta/Google/TikTok/Pinterest) a partir dos webhooks de pagamento, cobrindo PIX, boleto, cartão em análise e aba fechada.
type: feature
---

O evento Purchase é disparado pelo **webhook de pagamento** (mercadopago-webhook, pagarme-webhook) assim que `confirm_order_payment_atomic` retorna `confirmed`. Isso garante envio mesmo quando:

- Cliente fechou a aba antes da thank-you carregar
- PIX/boleto pago horas/dias depois
- Cartão em análise antifraude que aprova depois

**Idempotência**: a tabela `orders` tem `purchase_event_id` (uuid persistido antes do envio) e `purchase_event_sent_at` (lock pós-envio). Webhooks duplicados não disparam o evento duas vezes.

**Deduplicação pixel/CAPI**: a thank-you, ao fazer polling, lê `order.purchase_event_id` e passa via `options.eventId` em `trackPurchase()`. Plataformas deduplicam pixel (navegador) + CAPI (servidor) com o mesmo event_id.

**Implementação central**: `supabase/functions/_shared/sendPurchaseEvent.ts`. Busca dados de UAM em `customers` + `endereco_entrega`, calcula valor (com/sem frete via `store_tracking_config.exclude_shipping_from_value`) e invoca `track-conversion` que faz o fan-out para Meta/Google/TikTok/Pinterest CAPI.

**Não deve disparar para**: PIX expirado, pagamento recusado, cancelado, reembolsado.
