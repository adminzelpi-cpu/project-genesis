---
name: Boot Skeleton Route-Agnostic
description: index.html boot skeleton servido em TODA rota. Permitido só elementos universais (barra topo, pulses neutros). PROIBIDO grade de produtos ou layout específico.
type: constraint
---

`index.html` é servido pra TODAS as rotas (landing, admin, storefront, customer, etc.).
O HTML inline dentro de `<div id="root">` aparece antes do bundle JS parsear (~50ms a ~4s em cold load).

**PERMITIDO no boot inline:**
- Barra superior neutra (sem logo/links específicos)
- 1-3 "pulses" cinza genéricos (linhas/blocos retangulares)
- Background sólido
- CSS puro (animações simples, `prefers-reduced-motion` respeitado)

**PROIBIDO no boot inline:**
- Grade de cards de produto (causa "skeleton de grade na landing/dashboard")
- Sidebar de dashboard
- Qualquer skeleton específico de uma rota
- Imports externos, JS, fetch
- Elementos com texto/marca

**Por quê:** mostrar grade na landing OU sidebar na storefront cria a sequência ruim "skeleton errado → flash → skeleton certo". Elementos universais (barra + pulses) funcionam em qualquer contexto e eliminam a tela branca de cold load.
