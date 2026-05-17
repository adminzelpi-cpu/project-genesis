---
name: currency-dynamic-store
description: Currency dinâmico por loja em todos os eventos de tracking (Pixel + CAPI). Sem fallback BRL hardcoded.
type: feature
---

Todos os eventos de tracking (ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase) leem `stores.currency` dinamicamente.

**Front**: hook `useStoreCurrency(storeId)` (cache 30 min) injeta o ISO em cada call. Default `"BRL"` só existe como último cinto-de-segurança no servidor (`track-conversion` edge function).

**Server-side** (`supabase/functions/_shared/sendPurchaseEvent.ts`): busca `stores.currency` antes de enviar Purchase via CAPI. Mesma currency é persistida na thank-you e enviada ao Pixel — garante paridade Pixel↔CAPI no campo `currency`.

**Paridade Purchase Pixel↔CAPI** (4 campos críticos pra EMQ alto):
- `event_id`: persistido em `orders.purchase_event_id` antes de qualquer envio (webhook ou thank-you)
- `value`: cálculo idêntico (com/sem frete) via `store_tracking_config.exclude_shipping_from_value`
- `currency`: lido de `stores.currency` em ambos os lados
- `content_ids`: usa `retailer_id` persistido em `orders.products[].retailer_id` (formato do feed)

Não exigido pela Meta: `content_type` igual entre Pixel/CAPI (dedupe é por event_id + event_name + janela temporal).

