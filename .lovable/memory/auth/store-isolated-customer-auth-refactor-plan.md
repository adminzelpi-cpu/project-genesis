---
name: Store-Isolated Customer Auth Refactor Plan
description: Migração concluída de supabase.auth (global) para JWT customizado por loja. Histórico das etapas e estado final.
type: feature
---

# Refatoração: Autenticação isolada por loja — CONCLUÍDA

## Decisões aprovadas
- Custom auth (sem supabase.auth para storefront customers)
- Forçar redefinição de senha para legados
- Só email/senha
- `customers.platform_user_id` como ID global escondido
- `favorites/notifications/addresses/payment_methods` com `customer_id`
- Acesso via Edge Functions com service_role

## Etapas concluídas
- **1**: schema customers
- **2**: edge functions auth (signup/login/verify/reset-request/reset-confirm)
- **3a**: backfill customer_id em favorites/notifications/addresses
- **3b**: useCustomerAuth + /redefinir-senha + ProtectedRoute coexistente
- **3c**: hooks/páginas com fallback dual; AuthModal/AccountDrawer/StorefrontHeader migrados
- **3d**: checkout migrado (useCustomerLookup, useCreateOrder, CheckoutContext)
- **4**: cleanup completo
  - purgeLegacyCustomerAuthOnce: força logout único de sessões supabase.auth legadas
  - removidos fallbacks supabase.auth de useFavorites, useCustomerProfile, useCustomerNotifications, useCustomerOrders, Addresses, AddressDialog
  - ProtectedRoute exige só JWT customizado
  - StorefrontHeader sem listener legacy
  - useActivityTracker captura customer_id/platform_user_id da sessão custom
- **5**: payment_methods migrado
  - coluna customer_id adicionada (user_id agora nullable; cartões legados ficam órfãos mas sem PII sensível)
  - RLS sem políticas: acesso só via edge function `customer-payment-methods` (service_role)
  - Páginas Payments e PaymentMethodDialog usam invokeCustomerFn

## Edge functions legadas a deletar (eventualmente)
- create-customer-auth, set-customer-password, send-password-reset
- customer-login: branch needs_password_setup (após migração total dos legados)
