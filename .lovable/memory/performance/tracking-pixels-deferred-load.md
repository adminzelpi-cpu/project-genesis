---
name: tracking-pixels-deferred-load
description: Pixels (Meta/GA/TikTok/Pinterest) são carregados após idle/interação para reduzir TBT no PageSpeed. trackEvent espera até 5s.
type: feature
---

**Por quê**: `fbevents.js`, `gtag.js`, `ttq` e `pintrk` somam ~70KB+ de JS de terceiros que rodam no main thread. Carregar imediatamente piora TBT/LCP no PageSpeed quando o lojista ativa o pixel.

**Como**: `TrackingScripts.tsx` usa `whenIdleOrInteract()` — chama `requestIdleCallback` (com `timeout: 3500ms`) e adiciona listeners `scroll/click/touchstart/keydown/mousemove` (uma vez, capture). O que disparar primeiro inicializa todos os pixels habilitados.

**Hard ceiling**: 3500ms. Garante que mesmo bots/usuários inativos eventualmente disparam PageView.

**trackEvent.ts**: `waitForPixels` com timeout de 5000ms (margem sobre o ceiling de 3500ms) — qualquer ViewContent/AddToCart/InitiateCheckout chamado antes do pixel inicializar espera. Não perde evento.

**Purchase**: server-side via webhook (`sendPurchaseEvent.ts`) — independe do pixel browser. Mesmo que o cliente feche a aba antes dos 3.5s, o Purchase é disparado pelo servidor.

**index.html**: `dns-prefetch` para `connect.facebook.net`, `googletagmanager.com`, `analytics.tiktok.com`, `s.pinimg.com` — barato, acelera o handshake quando o script for carregado.

**NÃO mudar para preconnect** desses domínios sem testar — preconnect dispara TLS handshake imediato, anulando parte do ganho.
