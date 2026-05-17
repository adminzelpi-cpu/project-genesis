---
name: Gestão de Categorias e SEO
description: A página de Categorias suporta hierarquia (subcategorias via parent_id), exclusão segura (preserva produtos, promove filhos a raiz), contador de produtos por categoria e SEO completo (slug editável, meta tags, descrição rica). O storefront monta a árvore automaticamente.
type: feature
---

## Estrutura

- Tabela `product_categories` com `parent_id` (self-FK) suporta hierarquia ilimitada.
- Produtos podem estar em múltiplas categorias via `category_ids[]` ou na coluna legada `category_id`.

## Exclusão de categoria (Categories.tsx)

A exclusão **nunca apaga produtos**. O hook `deleteCategory` (em `useCategories`) executa em sequência:
1. Desvincula produtos: `UPDATE products SET category_id = NULL WHERE category_id = $1`.
2. Promove filhos a raiz: `UPDATE product_categories SET parent_id = NULL WHERE parent_id = $1`.
3. Deleta a categoria.

O `AlertDialog` de confirmação mostra:
- Nº de produtos que serão desvinculados (via `getProductCountByCategory`, considera `category_id` + `category_ids`).
- Nº de subcategorias que serão movidas para o nível principal.

**Limitação conhecida**: a desvinculação cobre apenas `category_id` (legada). Produtos que tiverem o ID apenas em `category_ids[]` continuarão referenciando a categoria deletada — o array não é limpo automaticamente. Aceitar como dívida técnica enquanto a maioria dos produtos usa `category_id`.

## Subcategorias (CategoryEdit.tsx)

- Campo "Categoria pai" (Select) no editor, abaixo do nome.
- Lista de pais válidos exclui a própria categoria e todos os descendentes (previne ciclos).
- Valor `"__none__"` representa categoria raiz (gravado como `null`).
- Listagem na página `Categories.tsx` usa indentação por `depth` (DFS) com `ChevronRight` em filhos.

## Storefront

`useStorefrontCategories` já constrói árvore via `parent_id` — subcategorias aparecem automaticamente onde o componente consome a árvore. Editor visual de menu fica pós-MVP.
