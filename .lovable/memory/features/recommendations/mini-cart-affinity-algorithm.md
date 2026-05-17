---
name: Mini Cart Affinity Algorithm
description: Algoritmo de recomendação do mini carrinho com dicionário PT-BR para evitar canibalização e priorizar pares clássicos.
type: feature
---

O algoritmo do mini carrinho ("Combine com seu pedido") usa scoring multi-camadas:

1. **Frequentemente comprados juntos** (+60): co-ocorrência real em pedidos
2. **Par clássico do dicionário PT-BR** (+50): bermuda↔camiseta, shampoo↔condicionador, ração↔petisco, celular↔capa, etc.
3. **Competidor do dicionário PT-BR** (−50): bermuda + outra bermuda = canibalização
4. **Categoria do carrinho**: mesma (−40), diferente (+35)
5. **Mais vendidos** (+20)
6. **Filtros de conversão**: impulso ≤50% subtotal (+15), sale (+10), com imagens (+3)

**Dicionário em** `src/features/storefront/lib/productAffinityDictionary.ts` cobre Moda, Beleza, Casa, Pet e Eletrônicos. Detecção via word-boundary no nome normalizado (lowercase + sem acentos). Funciona mesmo sem categoria cadastrada.

**Limitação**: nomes criativos sem palavras-chave conhecidas caem fora do dicionário. Lojista precisa nomear produtos com tipo (norma do mercado BR).
