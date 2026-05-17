---
name: Storefront session policy & sensitive area gate
description: Regras de duração da sessão pós-checkout e gating de áreas sensíveis com senha.
type: feature
---

# Política de sessão storefront

## Storage por escopo
- `scope: "full"` (login com senha / magic link) → `localStorage` (persiste entre abas e reinícios). TTL JWT 30 dias.
- `scope: "guest_post_checkout"` (sessão automática após checkout) → `sessionStorage` (some quando a aba/janela fecha). TTL JWT 24h, mas o storage manda — se voltar amanhã em aba nova, sai sozinho.

`getStoredCustomerToken` / `getStoredCustomerSession` leem dos DOIS, priorizando `sessionStorage`. `persistSession` / `persistCustomerSessionToStorage` limpam ambos antes de gravar no certo.

## Áreas sensíveis (`RequireFullAuth`)
Usado em endereços, perfil, métodos de pagamento. NÃO usado na lista de pedidos.

Regras:
- `isFullyAuthenticated` → libera.
- `isGuestSession` → consulta `check-customer-auth-status`:
  - se `has_password` → form inline pedindo a senha; sucesso eleva pra full.
  - se NÃO tem senha → botão único "Receber email pra criar senha" (chama `requestPasswordReset` que cobre tanto reset quanto setup inicial).
- Não logado → CTA pra `/customer/login`.

⚠️ Magic link foi REMOVIDO desse gate. Decisão do dono: queremos que cliente defina senha real, não dependa de email a cada visita. Magic link continua disponível só pelo fluxo manual em `/acessar-link`.

## Pedidos
A lista/detalhes de pedidos continua liberada na guest session (zero fricção pro caso 99%: cliente que comprou e quer ver "meu pedido").
