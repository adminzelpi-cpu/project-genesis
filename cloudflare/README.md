# Deploy no Cloudflare Pages + Worker

## Arquitetura

```
zelpi.com.br          → Landing Page (Cloudflare Pages)
admin.zelpi.com.br    → Dashboard Lojista (Cloudflare Pages)
*.zelpi.com.br        → Storefront das Lojas (Worker → Pages)
dominiocustomizado.br → Storefront via custom_domains (Worker → Pages)
```

O **Cloudflare Worker** intercepta todas as requisições e:
1. Para **bots** (WhatsApp, Facebook, Google): retorna HTML com meta tags OG dinâmicas
2. Para **usuários reais**: faz proxy para o Cloudflare Pages (SPA)
3. Resolve **subdomínios** e **domínios customizados** para a loja correta

## Plano Gratuito - O que funciona

| Recurso | Free | Pro ($20/mês) |
|---------|------|---------------|
| Cloudflare Pages | ✅ Ilimitado | ✅ |
| Workers | ✅ 100k req/dia | ✅ 10M req/mês |
| Custom domains | ✅ Sim | ✅ |
| SSL automático | ✅ Sim | ✅ |
| Wildcard subdomain SSL | ❌ Não | ✅ Sim |

### Limitação importante no plano Free:
- **Wildcard SSL** (`*.zelpi.com.br`) requer plano Pro
- No plano Free, cada subdomínio de loja precisa ser adicionado manualmente no Cloudflare
- Alternativa: usar o Worker para rotear sem wildcard (funciona, mas precisa adicionar cada subdomínio no DNS)

## Passo a Passo - Deploy

### 1. Cloudflare Pages (SPA)

```bash
# Build do projeto
npm run build

# Opção A: Deploy via Dashboard
# Dashboard > Pages > Create > Connect to Git > Selecionar repo
# Build command: npm run build
# Output directory: dist

# Opção B: Deploy via Wrangler
npx wrangler pages deploy dist --project-name=zelpi
```

### 2. Cloudflare Worker (OG Meta + Routing)

```bash
cd cloudflare

# Configurar secrets
wrangler secret put SUPABASE_URL
# Cole: https://hyposhdvtaoamsezvwpv.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# Cole a anon key do Supabase

wrangler secret put PAGES_DOMAIN
# Cole: zelpi.pages.dev (seu domínio do Pages)

# Deploy
wrangler deploy
```

### 3. DNS no Cloudflare

```
Tipo   Nome      Valor              Proxy
A      @         192.0.2.1          ✅ Proxied (laranja)
A      www       192.0.2.1          ✅ Proxied (laranja)
A      admin     192.0.2.1          ✅ Proxied (laranja)
A      *         192.0.2.1          ✅ Proxied (laranja)  ← Pro only
```

> O IP `192.0.2.1` é um IP dummy - o Worker intercepta antes de chegar no IP.
> O proxy (nuvem laranja) DEVE estar ativado para o Worker funcionar.

### 4. Rotas do Worker

No Dashboard do Cloudflare:
- Workers & Pages > zelpi-og-router > Settings > Triggers > Routes
- Adicionar:
  - `zelpi.com.br/*`
  - `*.zelpi.com.br/*`

### 5. Domínios Customizados dos Lojistas

Para cada domínio customizado:
1. Lojista adiciona o domínio na plataforma (Configurações > Domínios)
2. Lojista configura DNS: `A @ → IP do Cloudflare` com proxy ativado
3. Adicionar o domínio no Cloudflare (Dashboard > Websites > Add site)
4. Configurar rota do Worker: `dominiodolojista.com.br/*`

**Para automação (Cloudflare for SaaS):**
- Recurso pago que permite adicionar domínios customizados via API
- Ideal para quando tiver muitos lojistas com domínios próprios

## Variáveis de Ambiente - Cloudflare Pages

No Dashboard > Pages > zelpi > Settings > Environment Variables:

```
VITE_SUPABASE_URL = https://hyposhdvtaoamsezvwpv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = (sua anon key)
VITE_SUPABASE_PROJECT_ID = hyposhdvtaoamsezvwpv
```

## Testando

### Testar OG Meta (simular bot)
```bash
curl -A "WhatsApp" "https://loja.zelpi.com.br/product/camisa-polo-3"
```

### Testar roteamento normal
Acessar no navegador: `https://loja.zelpi.com.br` → deve mostrar a loja
