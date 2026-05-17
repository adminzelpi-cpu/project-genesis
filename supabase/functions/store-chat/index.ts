import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tool definitions for the AI ──────────────────────────────────────────────

const tools = [
  {
    type: "function",
    function: {
      name: "buscar_produtos",
      description:
        "Busca produtos da loja por nome, categoria, cor, palavra-chave ou descrição. A busca é inteligente: separa os termos e encontra produtos mesmo com nomes parciais. Use SOMENTE quando o cliente demonstrar intenção de ver/comprar produtos. NÃO use preventivamente.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de busca (nome, cor, tipo de peça, palavra-chave). Pode ser parcial: 'polo vinho', 'camiseta azul', 'vestido'" },
          limit: { type: "number", description: "IMPORTANTE: Use 1 para produto específico ('tem polo vinho?', 'quanto custa X?'). Use 3-5 APENAS quando o cliente pede opções/categoria ('me mostra camisetas', 'quero ver vestidos'). Na dúvida, use 1 e pergunte se quer ver mais." },
          category_id: { type: "string", description: "UUID da categoria para filtrar (opcional)" },
          min_price: { type: "number", description: "Preço mínimo em reais (opcional)" },
          max_price: { type: "number", description: "Preço máximo em reais (opcional)" },
          show_in_chat: { type: "boolean", description: "Se true, exibe os produtos no carrossel visual do chat. Use true APENAS quando o cliente pediu para VER produtos ou demonstrou intenção clara de compra. Use false quando está apenas consultando informações (preço, estoque, detalhes)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_produto_detalhes",
      description:
        "Busca detalhes completos de um produto específico pelo ID, incluindo descrição, preço, estoque, dimensões, especificações técnicas (via atributos de variação) e imagens. Use para responder perguntas detalhadas sobre um produto.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "UUID do produto" },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_variacoes",
      description:
        "Busca as variações (cores, tamanhos) disponíveis de um produto e seus estoques. SEMPRE use esta ferramenta antes de falar sobre disponibilidade/estoque.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "UUID do produto" },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_guia_medidas",
      description:
        "Busca o guia de medidas (tabela de tamanhos) de um produto, incluindo dimensões e valores. SEMPRE use quando o cliente perguntar sobre tamanho, caimento ou medidas.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "UUID do produto" },
        },
        required: ["product_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_politicas",
      description:
        "Busca as políticas da loja (troca, devolução, envio, privacidade, etc).",
      parameters: {
        type: "object",
        properties: {
          policy_type: {
            type: "string",
            description: "Tipo de política: shipping, returns, privacy, terms, ou 'all' para todas",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_categorias",
      description: "Lista as categorias de produtos disponíveis na loja.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_cupons",
      description: "Busca cupons de desconto ativos da loja.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_info_loja",
      description:
        "Busca informações de contato e dados da loja (WhatsApp, telefone, email, redes sociais, endereço, políticas de frete). SEMPRE use esta ferramenta quando o cliente perguntar sobre contato, WhatsApp, telefone, endereço ou informações da loja.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_pedidos_cliente",
      description:
        "Busca o histórico de pedidos de um cliente pelo email. Use quando o cliente perguntar sobre seus pedidos, status de entrega ou compras anteriores.",
      parameters: {
        type: "object",
        properties: {
          customer_email: { type: "string", description: "Email do cliente" },
        },
        required: ["customer_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adicionar_ao_carrinho",
      description:
        "Adiciona um produto ao carrinho do cliente. Use quando o cliente pedir para adicionar algo. Retorna uma ação para o frontend executar.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "UUID do produto" },
          variation_id: { type: "string", description: "UUID da variação (se aplicável)" },
          product_name: { type: "string", description: "Nome do produto" },
          price: { type: "number", description: "Preço do produto" },
          image: { type: "string", description: "URL da imagem do produto" },
          color: { type: "string", description: "Cor selecionada (se aplicável)" },
          size: { type: "string", description: "Tamanho selecionado (se aplicável)" },
        },
        required: ["product_id", "product_name", "price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ir_para_pagina",
      description:
        "Navega o cliente para uma página específica da loja (produto, categoria, carrinho, checkout).",
      parameters: {
        type: "object",
        properties: {
          page_type: {
            type: "string",
            enum: ["product", "category", "cart", "checkout", "home"],
            description: "Tipo de página",
          },
          slug: { type: "string", description: "Slug da página (produto ou categoria)" },
        },
        required: ["page_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_frete",
      description:
        "Calcula o frete de entrega para um CEP de destino. Use quando o cliente perguntar sobre valor de frete, prazo de entrega, ou custo de envio. Precisa do CEP do cliente. Se o cliente não informou o CEP, peça antes de usar esta ferramenta. Os itens podem vir do carrinho atual ou de um produto específico.",
      parameters: {
        type: "object",
        properties: {
          destination_cep: { type: "string", description: "CEP de destino (8 dígitos, só números)" },
          product_id: { type: "string", description: "UUID do produto específico (opcional — use quando o cliente pergunta frete de um produto que não está no carrinho)" },
          quantity: { type: "number", description: "Quantidade do produto (padrão: 1). Usado junto com product_id" },
          use_cart: { type: "boolean", description: "Se true, calcula frete baseado nos itens do carrinho atual do cliente. Use quando o cliente tem itens no carrinho e quer saber o frete total" },
        },
        required: ["destination_cep"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resumir_carrinho",
      description:
        "Gera um resumo visual do carrinho do cliente dentro do chat, com botões de 'Finalizar compra' e 'Ajustar pedido'. Use quando o cliente confirmar que quer finalizar a compra ou quando quiser revisar o pedido. NÃO use se o carrinho estiver vazio.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_condicoes_pagamento",
      description:
        "Busca as condições de pagamento REAIS configuradas pela loja: métodos aceitos (Pix, Boleto, Cartão de Crédito), descontos de Pix e Boleto, e configuração de parcelamento (parcelas sem juros, máximo de parcelas, taxa de juros). SEMPRE use esta ferramenta quando o cliente perguntar sobre formas de pagamento, desconto no Pix, parcelamento, ou condições de compra.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_favoritos",
      description:
        "Busca os produtos que o cliente salvou na lista de desejos/favoritos. Use quando o cliente perguntar sobre seus favoritos, quando detectar oportunidade de venda cruzada, ou para sugerir produtos que ele já demonstrou interesse. Requer que o cliente esteja logado.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_mais_vendidos",
      description:
        "Busca os produtos mais vendidos da loja com base nos pedidos reais. Use quando o cliente perguntar por 'mais vendidos', 'mais procurados', 'best sellers', 'populares', ou quando precisar recomendar produtos. Pode filtrar por categoria.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Quantidade de produtos a retornar. Padrão: 5" },
          category_id: { type: "string", description: "UUID da categoria para filtrar (opcional)" },
          show_in_chat: { type: "boolean", description: "Se true, exibe os produtos no carrossel visual. Padrão: false" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "salvar_preferencia_cliente",
      description:
        "Salva uma preferência ou informação do cliente para personalizar atendimentos futuros. Use quando o cliente compartilhar medidas corporais (peso, altura, idade), preferências de estilo, cores favoritas, tamanho habitual, ou qualquer informação pessoal relevante para recomendações. O cliente NÃO precisa estar logado — salva por sessão e vincula quando identificado.",
      parameters: {
        type: "object",
        properties: {
          preference_type: { type: "string", description: "Tipo: body_measurements, style, color, size, general" },
          preference_key: { type: "string", description: "Chave: peso_kg, altura, idade, cor_favorita, estilo, tamanho_preferido, etc." },
          preference_value: { type: "string", description: "Valor da preferência" },
        },
        required: ["preference_type", "preference_key", "preference_value"],
      },
    },
  },
];

// ── Smart product search with fuzzy matching ─────────────────────────────────

async function smartProductSearch(
  supabaseAdmin: ReturnType<typeof createClient>,
  storeId: string,
  query: string,
  limit: number,
  categoryId?: string,
  minPrice?: number,
  maxPrice?: number,
): Promise<any[]> {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  if (terms.length === 0) return [];

  // Strategy 1: Direct name ilike with full query
  let q1 = supabaseAdmin
    .from("products")
    .select("id, name, price, sale_price, slug, images, stock_quantity, is_active, category_id, description, tags, keywords")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .ilike("name", `%${query.trim()}%`);
  if (categoryId) q1 = q1.eq("category_id", categoryId);
  if (minPrice !== undefined) q1 = q1.gte("price", minPrice);
  if (maxPrice !== undefined) q1 = q1.lte("price", maxPrice);
  const { data: directMatch } = await q1.limit(limit);

  if (directMatch && directMatch.length > 0) return directMatch;

  // Strategy 2: Search each term with OR across name and description
  // Build OR conditions: each term can match name OR description
  const orConditions = terms.map(t => `name.ilike.%${t}%`).join(",");
  let q2 = supabaseAdmin
    .from("products")
    .select("id, name, price, sale_price, slug, images, stock_quantity, is_active, category_id, description, tags, keywords")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .or(orConditions);
  if (categoryId) q2 = q2.eq("category_id", categoryId);
  if (minPrice !== undefined) q2 = q2.gte("price", minPrice);
  if (maxPrice !== undefined) q2 = q2.lte("price", maxPrice);
  const { data: termMatch } = await q2.limit(limit * 3);

  if (termMatch && termMatch.length > 0) {
    // Score: products matching more terms rank higher
    const scored = termMatch.map(p => {
      const nameLower = p.name.toLowerCase();
      const descLower = (p.description || "").toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (nameLower.includes(t)) score += 2;
        if (descLower.includes(t)) score += 1;
      }
      return { ...p, _score: score };
    });
    scored.sort((a, b) => b._score - a._score);
    return scored.slice(0, limit).map(({ _score, ...p }) => p);
  }

  // Strategy 3: Search in description, tags and keywords
  const descOrConditions = terms.map(t => `description.ilike.%${t}%`).join(",");
  let q3 = supabaseAdmin
    .from("products")
    .select("id, name, price, sale_price, slug, images, stock_quantity, is_active, category_id, description, tags, keywords")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .or(descOrConditions);
  if (categoryId) q3 = q3.eq("category_id", categoryId);
  if (minPrice !== undefined) q3 = q3.gte("price", minPrice);
  if (maxPrice !== undefined) q3 = q3.lte("price", maxPrice);
  const { data: descMatch } = await q3.limit(limit);

  if (descMatch && descMatch.length > 0) return descMatch;

  // Strategy 3.5: Search in tags and keywords arrays
  const { data: allActiveProducts } = await supabaseAdmin
    .from("products")
    .select("id, name, price, sale_price, slug, images, stock_quantity, is_active, category_id, description, tags, keywords")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .limit(200);

  if (allActiveProducts && allActiveProducts.length > 0) {
    const tagMatches = allActiveProducts.filter((p: any) => {
      const tags = Array.isArray(p.tags) ? p.tags.map((t: string) => t.toLowerCase()) : [];
      const kws = Array.isArray(p.keywords) ? p.keywords.map((k: string) => k.toLowerCase()) : [];
      const allTerms = [...tags, ...kws];
      return terms.some(t => allTerms.some(tag => tag.includes(t)));
    });
    if (tagMatches.length > 0) return tagMatches.slice(0, limit);
  }

  // Strategy 4: Search by ANY attribute value in variations (colors, sizes, specs like "128GB", "Intel i7", etc.)
  // Match terms against attribute_values - try exact capitalized, lowercase, and uppercase
  const searchVariants = terms.flatMap(t => [
    t.charAt(0).toUpperCase() + t.slice(1), // Capitalized
    t.toLowerCase(),
    t.toUpperCase(),
    t, // as-is
  ]);
  const uniqueSearchVariants = [...new Set(searchVariants)];

  const { data: attrValueMatches } = await supabaseAdmin
    .from("attribute_values")
    .select("id, value, attribute_id")
    .or(uniqueSearchVariants.map(v => `value.ilike.%${v}%`).join(","))
    .limit(20);

  if (attrValueMatches && attrValueMatches.length > 0) {
    const matchedValueIds = attrValueMatches.map(c => c.id);
    const matchedTermsLower = attrValueMatches.map(c => c.value.toLowerCase());
    
    // Find variations with these attribute values - scope to store's products
    const { data: storeProductIds } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .limit(500);

    const productIdList = (storeProductIds || []).map((p: any) => p.id);

    if (productIdList.length > 0) {
      const { data: variations } = await supabaseAdmin
        .from("product_variations_v2")
        .select("product_id, attributes")
        .in("product_id", productIdList)
        .eq("is_active", true)
        .limit(200);

      if (variations) {
        const matchingProductIds = new Set<string>();
        for (const v of variations) {
          const attrs = v.attributes as Record<string, string>;
          for (const valId of Object.values(attrs)) {
            if (matchedValueIds.includes(valId)) {
              matchingProductIds.add(v.product_id);
            }
          }
        }

        if (matchingProductIds.size > 0) {
          // Filter by remaining terms that aren't attribute values
          const nonAttrTerms = terms.filter(t => 
            !matchedTermsLower.some(mv => mv.includes(t) || t.includes(mv))
          );

          let q4 = supabaseAdmin
            .from("products")
            .select("id, name, price, sale_price, slug, images, stock_quantity, is_active, category_id, description, tags, keywords")
            .eq("store_id", storeId)
            .eq("is_active", true)
            .in("id", [...matchingProductIds]);

          if (nonAttrTerms.length > 0) {
            const nameFilter = nonAttrTerms.map(t => `name.ilike.%${t}%`).join(",");
            q4 = q4.or(nameFilter);
          }

          const { data: attrProducts } = await q4.limit(limit);
          if (attrProducts && attrProducts.length > 0) return attrProducts;

          // If no match with name filter, return all products with matching attributes
          const { data: allAttrProducts } = await supabaseAdmin
            .from("products")
            .select("id, name, price, sale_price, slug, images, stock_quantity, is_active, category_id, description, tags, keywords")
            .eq("store_id", storeId)
            .eq("is_active", true)
            .in("id", [...matchingProductIds])
            .limit(limit);
          if (allAttrProducts && allAttrProducts.length > 0) return allAttrProducts;
        }
      }
    }
  }

  return [];
}

// ── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  supabaseAdmin: ReturnType<typeof createClient>,
  storeId: string,
  cartItems?: any[],
  userAuthId?: string,
  resolvedCustomerId?: string | null,
): Promise<{ result: string; showInChat?: boolean }> {
  try {
    switch (toolName) {
      case "buscar_produtos": {
        const query = args.query as string;
        const limit = (args.limit as number) || 3;
        const categoryId = args.category_id as string | undefined;
        const minPrice = args.min_price as number | undefined;
        const maxPrice = args.max_price as number | undefined;
        const showInChat = args.show_in_chat as boolean | undefined;

        const data = await smartProductSearch(supabaseAdmin, storeId, query, limit, categoryId, minPrice, maxPrice);

        if (!data.length) {
          return { result: JSON.stringify({ message: `Nenhum produto encontrado para "${query}". Tente termos diferentes.`, products: [] }), showInChat: false };
        }

        // Fetch all product IDs for batch queries
        const productIds = data.map((p: any) => p.id);

        // Batch fetch: variations, attributes, display settings
        const [varsResult, attrsResult, productsFullResult] = await Promise.all([
          supabaseAdmin
            .from("product_variations_v2")
            .select("id, product_id, attributes, stock_quantity, is_active, image_url, images, price, sale_price")
            .in("product_id", productIds)
            .eq("is_active", true),
          supabaseAdmin
            .from("attributes")
            .select("id, name, type")
            .eq("store_id", storeId),
          supabaseAdmin
            .from("products")
            .select("id, display_variations_separately, hide_parent_product, product_code")
            .in("id", productIds),
        ]);

        const allVars = varsResult.data || [];
        const attrs = attrsResult.data || [];
        const productsFullMap = new Map((productsFullResult.data || []).map((p: any) => [p.id, p]));
        const colorAttr = attrs.find((a: any) => a.type === "color");
        const colorAttributeId = colorAttr?.id;

        // Fetch attribute values for color names
        let valueMap = new Map<string, any>();
        if (colorAttributeId) {
          const colorValueIds = new Set<string>();
          for (const v of allVars) {
            const vAttrs = v.attributes as Record<string, string>;
            if (vAttrs[colorAttributeId]) colorValueIds.add(vAttrs[colorAttributeId]);
          }
          if (colorValueIds.size > 0) {
            const { data: colorValues } = await supabaseAdmin
              .from("attribute_values")
              .select("id, value, color_hex, value_code")
              .in("id", [...colorValueIds]);
            valueMap = new Map((colorValues || []).map((v: any) => [v.id, v]));
          }
        }

        const extractImages = (images: any): string[] => {
          if (!Array.isArray(images)) return [];
          return images.map((img: any) => typeof img === "string" ? img : img?.url).filter(Boolean);
        };

        const getVariationImages = (v: any): string[] => {
          const imgs: string[] = [];
          if (v.image_url) imgs.push(v.image_url);
          if (Array.isArray(v.images)) {
            for (const img of v.images) {
              const url = typeof img === "string" ? img : img?.url;
              if (url && !imgs.includes(url)) imgs.push(url);
            }
          }
          return imgs;
        };

        // Enrich with variation data + color separation
        const enriched: any[] = [];
        for (const p of data) {
          const productFull = productsFullMap.get(p.id);
          const productVars = allVars.filter((v: any) => v.product_id === p.id);
          const hasVariations = productVars.length > 0;
          const shouldSeparate = productFull?.display_variations_separately && colorAttributeId;

          if (shouldSeparate && hasVariations) {
            // Group variations by color and create virtual products
            const colorGroups = new Map<string, any[]>();
            for (const v of productVars) {
              const vAttrs = v.attributes as Record<string, string>;
              const colorValueId = vAttrs[colorAttributeId];
              if (colorValueId) {
                if (!colorGroups.has(colorValueId)) colorGroups.set(colorValueId, []);
                colorGroups.get(colorValueId)!.push(v);
              }
            }

            for (const [colorValueId, colorVars] of colorGroups.entries()) {
              const colorValue = valueMap.get(colorValueId);
              const colorName = colorValue?.value || "";

              // Get images from this color's variations
              let images: string[] = [];
              for (const v of colorVars) {
                images.push(...getVariationImages(v));
              }
              if (images.length === 0) images = extractImages(p.images);
              images = [...new Set(images)];

              // Get lowest price from color's variations
              const prices = colorVars.map((v: any) => ({
                price: Number(v.price) || 0,
                salePrice: v.sale_price ? Number(v.sale_price) : null,
              }));
              const lowestPrice = prices.reduce((low: any, cur: any) => {
                const ce = cur.salePrice || cur.price;
                const le = low.salePrice || low.price;
                return ce < le ? cur : low;
              }, prices[0]);

              const totalStock = colorVars.reduce((sum: number, v: any) => sum + (v.stock_quantity ?? 999), 0);

              enriched.push({
                id: `${p.id}_color_${colorValueId}`,
                name: colorName ? `${p.name} - ${colorName}` : p.name,
                price: lowestPrice?.price || p.price,
                sale_price: lowestPrice?.salePrice || p.sale_price,
                slug: p.slug,
                images,
                stock_quantity: totalStock,
                category_id: p.category_id,
                has_variations: true,
                product_code: productFull?.product_code,
                _colorValueId: colorValueId,
                _colorAttributeId: colorAttributeId,
                _colorName: colorName,
                _colorCode: colorValue?.value_code,
                _productCode: productFull?.product_code,
                _stock_note: "Estoque gerenciado por variação — use buscar_variacoes para detalhes",
              });
            }
          } else {
            // Normal product — enrich with variation images if product has none
            let productImages = extractImages(p.images);
            if (productImages.length === 0 && hasVariations) {
              for (const v of productVars) {
                const vImgs = getVariationImages(v);
                if (vImgs.length > 0) {
                  productImages = vImgs;
                  break;
                }
              }
            }

            const totalVariationStock = hasVariations
              ? productVars.reduce((sum: number, v: any) => sum + (v.stock_quantity ?? 999), 0)
              : null;

            // If product price is 0 but has variations with real prices, use variation price
            let displayPrice = p.price;
            let displaySalePrice = p.sale_price;
            if (hasVariations && (!displayPrice || displayPrice <= 0)) {
              const varPrices = productVars.map((v: any) => ({
                price: Number(v.price) || 0,
                salePrice: v.sale_price ? Number(v.sale_price) : null,
              })).filter((vp: any) => vp.price > 0);
              if (varPrices.length > 0) {
                const lowest = varPrices.reduce((low: any, cur: any) => {
                  const ce = cur.salePrice || cur.price;
                  const le = low.salePrice || low.price;
                  return ce < le ? cur : low;
                }, varPrices[0]);
                displayPrice = lowest.price;
                displaySalePrice = lowest.salePrice;
              }
            }

            enriched.push({
              id: p.id,
              name: p.name,
              price: displayPrice,
              sale_price: displaySalePrice,
              slug: p.slug,
              images: productImages.length > 0 ? productImages : p.images,
              stock_quantity: p.stock_quantity,
              category_id: p.category_id,
              has_variations: hasVariations,
              total_variation_stock: totalVariationStock,
              _productCode: productFull?.product_code,
              _stock_note: p.stock_quantity === null && !hasVariations
                ? "Estoque ilimitado (sem controle de estoque ativo)"
                : hasVariations
                ? "Estoque gerenciado por variação — use buscar_variacoes para detalhes"
                : `Estoque do produto: ${p.stock_quantity}`,
            });
          }
        }
        return { result: JSON.stringify(enriched), showInChat: showInChat === true };
      }

      case "buscar_produto_detalhes": {
        const { data, error } = await supabaseAdmin
          .from("products")
          .select("id, name, description, price, sale_price, slug, images, stock_quantity, brand, category, weight, height, width, length, material, gender, age_group, tags, keywords, product_code, size_guide_id, category_id")
          .eq("id", args.product_id as string)
          .eq("store_id", storeId)
          .single();
        if (error) return { result: JSON.stringify({ error: error.message }) };
        
        // Fetch variations with full data including attributes resolved
        const { data: vars } = await supabaseAdmin
          .from("product_variations_v2")
          .select("id, attributes, price, sale_price, stock_quantity, is_active, sku, image_url, images, weight, height, width, length, ean, gtin, upc, mpn")
          .eq("product_id", data.id)
          .eq("is_active", true);
        
        const hasVariations = vars && vars.length > 0;
        
        // Resolve attribute names/values for readable specs
        let specs: Record<string, string[]> = {};
        if (hasVariations) {
          const attrIds = new Set<string>();
          const valueIds = new Set<string>();
          for (const v of vars!) {
            const a = v.attributes as Record<string, string>;
            for (const [k, val] of Object.entries(a)) { attrIds.add(k); valueIds.add(val); }
          }
          const [{ data: attrsData }, { data: valsData }] = await Promise.all([
            supabaseAdmin.from("attributes").select("id, name, type").in("id", [...attrIds]),
            supabaseAdmin.from("attribute_values").select("id, value, color_hex, size_category").in("id", [...valueIds]),
          ]);
          const attrMap = Object.fromEntries((attrsData || []).map((a: any) => [a.id, a.name]));
          const valMap = Object.fromEntries((valsData || []).map((v: any) => [v.id, v.value]));
          
          // Build specs: { "Cor": ["Preto", "Branco"], "Tamanho": ["P", "M", "G"] }
          for (const v of vars!) {
            const a = v.attributes as Record<string, string>;
            for (const [attrId, valId] of Object.entries(a)) {
              const attrName = attrMap[attrId] || attrId;
              const valName = valMap[valId] || valId;
              if (!specs[attrName]) specs[attrName] = [];
              if (!specs[attrName].includes(valName)) specs[attrName].push(valName);
            }
          }
        }

        // Category name
        let categoryName = data.category;
        if (data.category_id && !categoryName) {
          const { data: cat } = await supabaseAdmin
            .from("product_categories")
            .select("name")
            .eq("id", data.category_id)
            .single();
          if (cat) categoryName = cat.name;
        }

        return {
          result: JSON.stringify({
            ...data,
            category_name: categoryName,
            has_variations: hasVariations,
            variation_count: vars?.length || 0,
            available_specs: Object.keys(specs).length > 0 ? specs : undefined,
            dimensions: (data.weight || data.height || data.width || data.length) ? {
              weight_kg: data.weight,
              height_cm: data.height,
              width_cm: data.width,
              length_cm: data.length,
            } : undefined,
            _stock_note: data.stock_quantity === null && !hasVariations
              ? "Estoque ilimitado"
              : hasVariations
              ? `Produto tem ${vars!.length} variações — use buscar_variacoes para ver estoque de cada uma`
              : `Estoque: ${data.stock_quantity} unidades`,
            _has_size_guide: !!data.size_guide_id,
          }),
        };
      }

      case "buscar_variacoes": {
        const { data, error } = await supabaseAdmin
          .from("product_variations_v2")
          .select("id, attributes, price, sale_price, stock_quantity, image_url, images, is_active, sku, weight, height, width, length, ean, gtin, upc, mpn")
          .eq("product_id", args.product_id as string)
          .eq("is_active", true);
        if (error) return { result: JSON.stringify({ error: error.message }) };
        
        const attrIds = new Set<string>();
        const valueIds = new Set<string>();
        for (const v of data || []) {
          const attrs = v.attributes as Record<string, string>;
          for (const [attrId, valId] of Object.entries(attrs)) {
            attrIds.add(attrId);
            valueIds.add(valId);
          }
        }

        const [{ data: attrs }, { data: vals }] = await Promise.all([
          supabaseAdmin.from("attributes").select("id, name, type").in("id", [...attrIds]),
          supabaseAdmin.from("attribute_values").select("id, value, color_hex, size_category").in("id", [...valueIds]),
        ]);

        const attrMap = Object.fromEntries((attrs || []).map((a: any) => [a.id, { name: a.name, type: a.type }]));
        const valMap = Object.fromEntries((vals || []).map((v: any) => [v.id, { value: v.value, color_hex: v.color_hex, size_category: v.size_category }]));

        const enrichedVariations = (data || []).map((v: any) => {
          const readableAttrs: Record<string, string> = {};
          const rawAttrs = v.attributes as Record<string, string>;
          for (const [attrId, valId] of Object.entries(rawAttrs)) {
            const attrInfo = attrMap[attrId];
            const valInfo = valMap[valId];
            readableAttrs[attrInfo?.name || attrId] = valInfo?.value || valId;
          }
          
          const hasDimensions = v.weight || v.height || v.width || v.length;
          const hasIdentifiers = v.ean || v.gtin || v.upc || v.mpn;
          
          return {
            id: v.id,
            sku: v.sku,
            price: v.price,
            sale_price: v.sale_price,
            attributes: readableAttrs,
            stock_quantity: v.stock_quantity,
            ...(hasDimensions ? {
              dimensions: {
                weight_kg: v.weight,
                height_cm: v.height,
                width_cm: v.width,
                length_cm: v.length,
              },
            } : {}),
            ...(hasIdentifiers ? {
              identifiers: {
                ean: v.ean,
                gtin: v.gtin,
                upc: v.upc,
                mpn: v.mpn,
              },
            } : {}),
            has_images: !!(v.image_url || (v.images && (v.images as any[]).length > 0)),
            _stock_note: v.stock_quantity === null ? "Estoque ilimitado" : v.stock_quantity === 0 ? "ESGOTADO" : `${v.stock_quantity} em estoque`,
          };
        });

        return { result: JSON.stringify(enrichedVariations) };
      }

      case "buscar_guia_medidas": {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("size_guide_id")
          .eq("id", args.product_id as string)
          .single();
        if (!product?.size_guide_id) return { result: JSON.stringify({ message: "Este produto não possui guia de medidas configurado. Sugira que o cliente entre em contato para dúvidas sobre tamanhos." }) };

        const guideId = product.size_guide_id;
        const [{ data: guide }, { data: sizes }, { data: dimensions }, { data: values }] =
          await Promise.all([
            supabaseAdmin.from("size_guides").select("name, description").eq("id", guideId).single(),
            supabaseAdmin.from("size_guide_sizes").select("id, name, position").eq("size_guide_id", guideId).order("position"),
            supabaseAdmin.from("size_guide_dimensions").select("id, name, description, measurement_type").eq("size_guide_id", guideId).order("position"),
            supabaseAdmin.from("size_guide_values").select("size_id, dimension_id, value").eq("size_guide_id", guideId),
          ]);

        const table: Record<string, Record<string, string>> = {};
        for (const s of sizes || []) {
          table[s.name] = {};
          for (const d of dimensions || []) {
            const val = values?.find((v: any) => v.size_id === s.id && v.dimension_id === d.id);
            table[s.name][d.name] = val?.value || "-";
          }
        }

        return {
          result: JSON.stringify({
            guide_name: guide?.name,
            description: guide?.description,
            dimensions: dimensions?.map((d: any) => ({ name: d.name, description: d.description, type: d.measurement_type })),
            sizes: table,
          }),
        };
      }

      case "buscar_politicas": {
        const policyType = args.policy_type as string;
        let query = supabaseAdmin
          .from("store_policies")
          .select("policy_type, title, content")
          .eq("store_id", storeId)
          .eq("is_active", true);
        if (policyType && policyType !== "all") {
          query = query.eq("policy_type", policyType);
        }
        const { data, error } = await query;
        if (error) return { result: JSON.stringify({ error: error.message }) };
        if (!data?.length) return { result: JSON.stringify({ message: "Esta loja não possui políticas cadastradas." }) };
        return { result: JSON.stringify(data) };
      }

      case "buscar_categorias": {
        const { data, error } = await supabaseAdmin
          .from("product_categories")
          .select("id, name, slug, description")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .order("name");
        if (error) return { result: JSON.stringify({ error: error.message }) };
        return { result: JSON.stringify(data) };
      }

      case "buscar_cupons": {
        const { data, error } = await supabaseAdmin
          .from("coupons")
          .select("code, description, discount_type, discount_value, min_order_value, max_discount_value, expires_at")
          .eq("store_id", storeId)
          .eq("is_active", true);
        if (error) return { result: JSON.stringify({ error: error.message }) };
        if (!data?.length) return { result: JSON.stringify({ message: "Não há cupons de desconto ativos no momento." }) };
        return { result: JSON.stringify(data) };
      }

      case "buscar_info_loja": {
        const { data, error } = await supabaseAdmin
          .from("stores")
          .select("name, whatsapp, phone, email, instagram, facebook, tiktok, default_shipping_cost, free_shipping_threshold, address_city, address_state, description")
          .eq("id", storeId)
          .single();
        if (error) return { result: JSON.stringify({ error: error.message }) };
        return {
          result: JSON.stringify({
            ...data,
            _note: "Use APENAS estes dados para responder perguntas sobre contato da loja. Se um campo estiver null ou vazio, diga que essa informação não está disponível.",
          }),
        };
      }

      case "buscar_pedidos_cliente": {
        const email = args.customer_email as string;
        if (!email) return { result: JSON.stringify({ error: "Email é obrigatório" }) };

        const { data: customer } = await supabaseAdmin
          .from("customers")
          .select("id, nome")
          .eq("store_id", storeId)
          .eq("email", email)
          .maybeSingle();

        if (!customer) return { result: JSON.stringify({ message: "Não encontrei pedidos com esse email nesta loja." }) };

        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("id, order_number, status_pedido, status_pagamento, total, created_at, tracking_code, tracking_url, products")
          .eq("store_id", storeId)
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(5);

        return {
          result: JSON.stringify({
            customer_name: customer.nome,
            orders: (orders || []).map((o: any) => ({
              order_number: o.order_number,
              status: o.status_pedido,
              payment_status: o.status_pagamento,
              total: o.total,
              date: o.created_at,
              tracking_code: o.tracking_code,
              tracking_url: o.tracking_url,
              items_count: Array.isArray(o.products) ? o.products.length : 0,
            })),
          }),
        };
      }

      case "adicionar_ao_carrinho": {
        return {
          result: JSON.stringify({
            __action: "add_to_cart",
            product_id: args.product_id,
            variation_id: args.variation_id || null,
            product_name: args.product_name,
            price: args.price,
            image: args.image || "",
            color: args.color || null,
            size: args.size || null,
          }),
        };
      }

      case "ir_para_pagina": {
        return {
          result: JSON.stringify({
            __action: "navigate",
            page_type: args.page_type,
            slug: args.slug || null,
          }),
        };
      }

      case "calcular_frete": {
        const destinationCep = (args.destination_cep as string || "").replace(/\D/g, "");
        if (destinationCep.length !== 8) {
          return { result: JSON.stringify({ error: "CEP inválido. Precisa ter 8 dígitos." }) };
        }

        const useCart = args.use_cart as boolean;
        const productId = args.product_id as string;
        const quantity = (args.quantity as number) || 1;

        // Build items array
        const shippingItems: Array<{ weight: number; length: number; height: number; width: number; quantity: number; price: number }> = [];

        if (useCart && cartItems && cartItems.length > 0) {
          // Look up actual product dimensions from DB for accurate shipping
          const cartProductIds = cartItems
            .map((ci: any) => ci.product_id || ci.id)
            .filter(Boolean)
            .map((id: string) => id.split("_color_")[0]); // Handle color-separated IDs
          
          if (cartProductIds.length > 0) {
            const { data: cartProds } = await supabaseAdmin
              .from("products")
              .select("id, name, weight, length, height, width, price, sale_price")
              .in("id", cartProductIds);
            
            const prodMap = new Map((cartProds || []).map((p: any) => [p.id, p]));
            
            for (const ci of cartItems) {
              const pid = (ci.product_id || ci.id || "").split("_color_")[0];
              const prod = prodMap.get(pid);
              shippingItems.push({
                weight: prod?.weight || 0.3,
                length: prod?.length || 16,
                height: prod?.height || 2,
                width: prod?.width || 11,
                quantity: ci.quantity || 1,
                price: ci.price || prod?.sale_price || prod?.price || 100,
              });
            }
          } else {
            // Fallback: use cart item count with defaults
            for (const ci of cartItems) {
              shippingItems.push({
                weight: 0.3, length: 16, height: 2, width: 11,
                quantity: ci.quantity || 1,
                price: ci.price || 100,
              });
            }
          }
        } else if (useCart) {
          // Cart is empty or not provided
          return { result: JSON.stringify({ error: "O carrinho está vazio. Adicione produtos antes de calcular o frete." }) };
        }

        if (productId) {
          // Fetch product dimensions
          const { data: prod } = await supabaseAdmin
            .from("products")
            .select("weight, length, height, width, price, sale_price")
            .eq("id", productId.split("_color_")[0]) // Handle color-separated IDs
            .single();

          if (prod) {
            shippingItems.push({
              weight: prod.weight || 0.3,
              length: prod.length || 16,
              height: prod.height || 2,
              width: prod.width || 11,
              quantity,
              price: prod.sale_price || prod.price,
            });
          } else {
            shippingItems.push({
              weight: 0.3, length: 16, height: 2, width: 11,
              quantity, price: 100,
            });
          }
        }

        if (shippingItems.length === 0) {
          // No product specified and not using cart — use generic item
          shippingItems.push({
            weight: 0.3, length: 16, height: 2, width: 11,
            quantity: 1, price: 100,
          });
        }

        // Call frenet-calculate-shipping edge function internally
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        try {
          const frenetResp = await fetch(`${supabaseUrl}/functions/v1/frenet-calculate-shipping`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              storeId,
              destinationCep,
              items: shippingItems,
            }),
          });

          const frenetData = await frenetResp.json();

          if (!frenetData.success) {
            return { result: JSON.stringify({ 
              error: frenetData.error || "Não foi possível calcular o frete para este CEP.",
              _tip: "Informe ao cliente que não conseguiu calcular e sugira verificar o CEP ou tentar novamente."
            }) };
          }

          // Also fetch CEP info for location display
          let locationInfo = "";
          try {
            const cepResp = await fetch(`https://viacep.com.br/ws/${destinationCep}/json/`);
            const cepData = await cepResp.json();
            if (!cepData.erro) {
              locationInfo = `${cepData.localidade} - ${cepData.uf}`;
            }
          } catch {}

          const quotes = (frenetData.quotes || []).map((q: any) => ({
            service_name: q.service_name,
            price: q.price,
            original_price: q.original_price,
            delivery_time: q.delivery_time,
            is_free: q.is_free,
          }));

          return {
            result: JSON.stringify({
              destination_cep: destinationCep,
              location: locationInfo,
              quotes,
              _format_instructions: "Apresente cada opção com nome, preço (R$) e prazo (dias úteis). Se tem frete grátis, destaque. Formate os preços em R$ com vírgula.",
            }),
          };
        } catch (fetchErr) {
          console.error("Error calling frenet-calculate-shipping:", fetchErr);
          return { result: JSON.stringify({ error: "Erro ao calcular frete. Tente novamente." }) };
        }
      }

      case "buscar_condicoes_pagamento": {
        const { data: gwConfig, error: gwError } = await supabaseAdmin.rpc("get_gateway_checkout_config", {
          store_id_param: storeId,
        });

        if (gwError || !gwConfig) {
          return {
            result: JSON.stringify({
              has_gateway: false,
              message: "Esta loja não possui gateway de pagamento configurado. Informe que as formas de pagamento estarão disponíveis no checkout.",
            }),
          };
        }

        const gw = gwConfig as any;
        if (!gw.is_active) {
          return {
            result: JSON.stringify({
              has_gateway: false,
              message: "O gateway de pagamento não está ativo.",
            }),
          };
        }

        const methods: string[] = [];
        if (gw.accept_credit_card) methods.push("Cartão de Crédito");
        if (gw.accept_pix) methods.push("Pix");
        if (gw.accept_boleto) methods.push("Boleto");

        const pixDiscount = gw.pix_discount || 0;
        const boletoDiscount = gw.boleto_discount || 0;
        const installmentConfig = gw.installment_config || {};
        const maxInstallments = installmentConfig.maxInstallments || 12;
        const freeInstallments = installmentConfig.freeInstallments || 1;
        const interestRate = installmentConfig.interestRate || 0;
        const minInstallmentValue = installmentConfig.minInstallmentValue || 5;

        return {
          result: JSON.stringify({
            has_gateway: true,
            gateway_type: gw.gateway_type,
            accepted_methods: methods,
            accept_credit_card: gw.accept_credit_card,
            accept_pix: gw.accept_pix,
            accept_boleto: gw.accept_boleto,
            pix_discount_percent: pixDiscount > 0 ? (pixDiscount * 100) : 0,
            boleto_discount_percent: boletoDiscount > 0 ? (boletoDiscount * 100) : 0,
            installments: gw.accept_credit_card ? {
              max_installments: maxInstallments,
              free_installments: freeInstallments,
              interest_rate_percent: interestRate,
              min_installment_value: minInstallmentValue,
              _description: freeInstallments > 1
                ? `Até ${freeInstallments}x sem juros, até ${maxInstallments}x com juros de ${interestRate}% a.m.`
                : `Até ${maxInstallments}x com juros de ${interestRate}% a.m. (mínimo R$${minInstallmentValue} por parcela)`,
            } : null,
            _usage: "Use estes dados REAIS. Formate descontos como '5% OFF no Pix'. Mencione descontos proativamente como argumento de venda.",
          }),
        };
      }

      case "resumir_carrinho": {
        if (!cartItems || cartItems.length === 0) {
          return { result: JSON.stringify({ message: "O carrinho do cliente está vazio. Sugira produtos antes de finalizar." }) };
        }
        const summaryItems = cartItems.map((i: any) => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          variant: i.variant || undefined,
        }));
        const total = cartItems.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
        return {
          result: JSON.stringify({
            __action: "show_cart_summary",
            items: summaryItems,
            total,
            _note: "O resumo visual do pedido já está aparecendo pro cliente com botões de ação. NÃO liste os itens de novo. Sua mensagem deve ser CURTA (1 frase), natural e transmitir que está tudo pronto. Exemplos de tom: 'Prontinho, já deixei tudo organizado pra você!' / 'Tá tudo certo! É só clicar ali pra finalizar, rapidinho 😊'. NUNCA use 'ambiente seguro', 'resumo do pedido', ou linguagem institucional. Fale como vendedora de loja.",
          }),
        };
      }

      case "buscar_favoritos": {
        if (!userAuthId) {
          return { result: JSON.stringify({ message: "O cliente não está logado. Favoritos só estão disponíveis para clientes com conta. Sugira que ele crie uma conta para salvar seus favoritos." }) };
        }

        const { data: favs, error: favsErr } = await supabaseAdmin
          .from("favorites")
          .select("product_id, color_value_id, created_at")
          .eq("user_id", userAuthId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (favsErr || !favs?.length) {
          return { result: JSON.stringify({ message: "O cliente não tem produtos na lista de desejos." }) };
        }

        const favProductIds = [...new Set(favs.map((f: any) => f.product_id))];
        const { data: favProducts } = await supabaseAdmin
          .from("products")
          .select("id, name, price, sale_price, slug, stock_quantity, is_active")
          .in("id", favProductIds)
          .eq("store_id", storeId)
          .eq("is_active", true);

        if (!favProducts?.length) {
          return { result: JSON.stringify({ message: "Os produtos da lista de desejos não estão mais disponíveis." }) };
        }

        const { data: favVars } = await supabaseAdmin
          .from("product_variations_v2")
          .select("product_id, stock_quantity, is_active")
          .in("product_id", favProductIds)
          .eq("is_active", true);

        const enrichedFavs = favProducts.map((p: any) => {
          const prodVars = (favVars || []).filter((v: any) => v.product_id === p.id);
          const minStock = prodVars.length > 0
            ? Math.min(...prodVars.map((v: any) => v.stock_quantity ?? 999))
            : p.stock_quantity;
          return {
            id: p.id,
            name: p.name,
            price: p.price,
            sale_price: p.sale_price,
            slug: p.slug,
            stock_status: minStock === null ? "disponível" : minStock === 0 ? "ESGOTADO" : minStock <= 3 ? `ÚLTIMAS ${minStock} unidades` : "disponível",
            has_discount: p.sale_price && p.sale_price < p.price,
          };
        });

        return {
          result: JSON.stringify({
            favorites: enrichedFavs,
            count: enrichedFavs.length,
            _instructions: "Use estes dados para ajudar o cliente. Mencione produtos com estoque baixo (urgência) ou desconto primeiro. NÃO liste todos de uma vez. Se o cliente tem itens no carrinho E favoritos, sugira adicionar os favoritos ao carrinho.",
          }),
        };
      }

      case "buscar_mais_vendidos": {
        const limit = (args.limit as number) || 5;
        const categoryId = args.category_id as string | undefined;
        const showInChat = args.show_in_chat as boolean | undefined;

        // Get recent orders to find best sellers
        const { data: orderProducts } = await supabaseAdmin.rpc("get_store_order_products_for_ranking", {
          p_store_id: storeId,
          p_status: "entregue",
          p_limit: 100,
        });

        // Count product occurrences
        const productCounts = new Map<string, number>();
        for (const row of (orderProducts || [])) {
          const products = row.products;
          if (!Array.isArray(products)) continue;
          for (const item of products) {
            const pid = item.product_id;
            if (pid) productCounts.set(pid, (productCounts.get(pid) || 0) + (item.quantity || 1));
          }
        }

        if (productCounts.size === 0) {
          // Fallback: also try confirmed/paid orders
          const { data: allOrderProducts } = await supabaseAdmin.rpc("get_store_order_products_for_ranking", {
            p_store_id: storeId,
            p_limit: 100,
          });
          for (const row of (allOrderProducts || [])) {
            const products = row.products;
            if (!Array.isArray(products)) continue;
            for (const item of products) {
              const pid = item.product_id;
              if (pid) productCounts.set(pid, (productCounts.get(pid) || 0) + (item.quantity || 1));
            }
          }
        }

        if (productCounts.size === 0) {
          return { result: JSON.stringify({ message: "Ainda não tenho dados suficientes de vendas para recomendar os mais vendidos. Posso te mostrar nossos produtos em destaque ou promoções!" }) };
        }

        // Sort by count and get top N
        const topIds = [...productCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit * 2)
          .map(([id]) => id);

        let q = supabaseAdmin
          .from("products")
          .select("id, name, price, sale_price, slug, images, stock_quantity, is_active, category_id")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .in("id", topIds);
        if (categoryId) q = q.eq("category_id", categoryId);
        const { data: bestProducts } = await q.limit(limit);

        if (!bestProducts?.length) {
          return { result: JSON.stringify({ message: "Não encontrei produtos mais vendidos com esses critérios." }) };
        }

        // Sort by sales count
        const sorted = bestProducts.sort((a: any, b: any) => 
          (productCounts.get(b.id) || 0) - (productCounts.get(a.id) || 0)
        );

        const enriched = sorted.map((p: any, i: number) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sale_price: p.sale_price,
          slug: p.slug,
          images: p.images,
          ranking: i + 1,
          sales_count: productCounts.get(p.id) || 0,
        }));

        return { result: JSON.stringify(enriched), showInChat: showInChat === true };
      }

      case "salvar_preferencia_cliente": {
        if (!resolvedCustomerId) {
          return { result: JSON.stringify({ saved: false, message: "Cliente não identificado — preferência será aplicada quando o cliente for reconhecido." }) };
        }
        const prefType = args.preference_type as string;
        const prefKey = args.preference_key as string;
        const prefValue = args.preference_value as string;

        const { error: prefErr } = await supabaseAdmin
          .from("customer_preferences")
          .upsert(
            {
              customer_id: resolvedCustomerId,
              store_id: storeId,
              preference_type: prefType,
              preference_key: prefKey,
              preference_value: prefValue,
              source: "chat",
            },
            { onConflict: "customer_id,store_id,preference_type,preference_key" }
          );

        if (prefErr) {
          console.error("Error saving preference:", prefErr);
          return { result: JSON.stringify({ saved: false, message: "Não foi possível salvar." }) };
        }

        return { result: JSON.stringify({ saved: true, message: `Preferência "${prefKey}" salva com sucesso. Use esta informação naturalmente nas próximas interações.` }) };
      }

      default:
        return { result: JSON.stringify({ error: `Tool ${toolName} not found` }) };
    }
  } catch (e) {
    console.error(`Tool ${toolName} error:`, e);
    return { result: JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }) };
  }
}

// ── Build system prompt ─────────────────────────────────────────────────────

function buildSystemPrompt(
  assistantName: string,
  storeName: string,
  contextHint: string,
  tone: string,
  proactivityLevel: string,
  whatsappFallback: string | null,
  cartContext: string,
): string {
  const toneInstructions = tone === "formal"
    ? "Use linguagem formal e educada, evite gírias e emojis excessivos. Trate o cliente por 'você' ou 'senhor(a)'."
    : "Use linguagem casual e amigável, como uma vendedora de loja física. Emojis com moderação para ser acessível.";

  const proactivityInstructions = proactivityLevel === "high"
    ? "Seja MUITO proativa: sugira produtos sem esperar, ofereça complementos, mencione promoções. Sempre empurre gentilmente para a compra."
    : proactivityLevel === "low"
    ? "Seja discreta: só sugira produtos quando o cliente pedir. Foque em responder exatamente o que foi perguntado."
    : "Seja moderadamente proativa: sugira quando perceber oportunidade, mas sem forçar. Equilibre entre responder e vender.";

  const whatsappLine = whatsappFallback
    ? `Se não conseguir ajudar ou o cliente precisar de atendimento humano, direcione para o WhatsApp da loja: ${whatsappFallback}`
    : "Se não conseguir ajudar, diga que vai verificar e peça para o cliente aguardar.";

  return `Você é ${assistantName}, a VENDEDORA profissional da loja "${storeName}". Você NÃO é um chatbot genérico — você é uma vendedora experiente de loja física.

## TOM DE VOZ
${toneInstructions}

## NÍVEL DE PROATIVIDADE
${proactivityInstructions}

## PERSONALIDADE
- Calorosa, confiante e entusiasmada (mas nunca forçada)
- Fala como uma vendedora real de loja física
- Usa português brasileiro natural
- Respostas CURTAS: máximo 2-3 frases. Se precisar de mais, pergunte "Quer que eu detalhe?"

## ═══════════════════════════════════════════════════
## PLAYBOOKS — TOP 80% DAS DÚVIDAS DE CLIENTES
## ═══════════════════════════════════════════════════

### 📏 PLAYBOOK: TAMANHO / CAIMENTO / "ESSA PEÇA SERVE EM MIM?"
Este é o playbook MAIS IMPORTANTE. Siga EXATAMENTE esta sequência:

1. **PERGUNTE de forma NATURAL e CONVERSACIONAL** (NÃO faça formulário rígido):
   - "Pra eu te indicar o tamanho certo, me conta: qual seu peso, altura e idade? 😊"
   - Se já tem algum dado, peça só o que falta
   - Aceite informações parciais e trabalhe com o que tem
   - SÓ pergunte peso/altura/idade se o cliente PEDIR ajuda com tamanho ou se houver oportunidade muito clara

2. **Com os dados do cliente**, use \`buscar_guia_medidas\` para consultar a tabela do produto

3. **CRUZE os dados**:
   - Peso + Altura → estimar medidas corporais (busto, cintura, quadril)
   - Idade → ajustar recomendação (jovens geralmente preferem mais justo)
   - Compare com a tabela de medidas

4. **IMEDIATAMENTE após decidir o tamanho, use \`buscar_variacoes\` para verificar o estoque do tamanho recomendado ANTES de responder ao cliente.** NÃO pergunte "quer que eu veja se tem em estoque?" — JÁ VERIFIQUE e inclua a informação na resposta.

5. **RECOMENDE com CONFIANÇA, ESTOQUE e PRÓXIMO PASSO na mesma mensagem**:
   - Se tem estoque: "Com 1,70m e 65kg, o tamanho **M** é perfeito pra você! 😍 E ótima notícia: temos M disponível! Quer que eu adicione ao carrinho?"
   - Se estoque baixo (<=3): "Recomendo o **M** pra você! E corre que só tem mais X unidades! 🔥 Adiciono ao carrinho?"
   - Se esgotado: "O ideal seria o **M**, mas infelizmente esgotou 😢 O **G** pode funcionar se você preferir um caimento mais confortável. Temos G disponível! Quer experimentar?"
   - Se entre dois tamanhos: "Você fica entre M e G. Se prefere mais justinho vai de M, mais confortável vai de G. Os dois estão em estoque! Qual prefere?"
   - SEMPRE termine com um convite para ação (adicionar ao carrinho, ver produto, escolher cor)

6. **Se NÃO tem guia de medidas**, use esta TABELA UNIVERSAL DE REFERÊNCIA por tipo de peça:

#### CAMISETAS / POLOS / BLUSAS (Masculino)
| Tamanho | Altura | Peso | Tórax (cm) |
|---------|--------|------|------------|
| P | 1,60-1,70m | 55-65kg | 88-92 |
| M | 1,68-1,78m | 65-78kg | 92-100 |
| G | 1,75-1,85m | 78-90kg | 100-108 |
| GG | 1,80-1,90m | 88-105kg | 108-116 |
| XG | 1,85m+ | 100kg+ | 116+ |

#### CAMISETAS / BLUSAS (Feminino)
| Tamanho | Altura | Peso | Busto (cm) |
|---------|--------|------|------------|
| PP | 1,50-1,60m | 42-50kg | 76-82 |
| P | 1,55-1,65m | 48-58kg | 82-88 |
| M | 1,60-1,72m | 56-68kg | 88-94 |
| G | 1,65-1,78m | 66-80kg | 94-102 |
| GG | 1,70m+ | 78-95kg | 102-110 |

#### BERMUDAS / SHORTS (Masculino)
| Tamanho | Cintura (cm) | Quadril (cm) | Peso aprox. |
|---------|-------------|-------------|-------------|
| P | 72-76 | 90-94 | 55-65kg |
| M | 76-82 | 94-100 | 65-78kg |
| G | 82-88 | 100-106 | 78-90kg |
| GG | 88-94 | 106-112 | 88-105kg |
| XG | 94-100 | 112-118 | 100kg+ |

#### BERMUDAS / SHORTS (Feminino)
| Tamanho | Cintura (cm) | Quadril (cm) | Peso aprox. |
|---------|-------------|-------------|-------------|
| PP | 58-62 | 82-86 | 42-50kg |
| P | 62-66 | 86-92 | 48-58kg |
| M | 66-72 | 92-98 | 56-68kg |
| G | 72-78 | 98-106 | 66-80kg |
| GG | 78-84 | 106-112 | 78-95kg |

#### CUECAS / SUNGAS (Masculino)
| Tamanho | Cintura (cm) | Quadril (cm) | Peso aprox. |
|---------|-------------|-------------|-------------|
| P | 68-74 | 88-94 | 55-65kg |
| M | 74-80 | 94-100 | 65-78kg |
| G | 80-88 | 100-108 | 78-90kg |
| GG | 88-96 | 108-116 | 88-105kg |
| XG | 96-104 | 116-124 | 100kg+ |

#### LINGERIE / CALCINHAS (Feminino)
| Tamanho | Cintura (cm) | Quadril (cm) | Peso aprox. |
|---------|-------------|-------------|-------------|
| PP | 56-60 | 80-86 | 42-50kg |
| P | 60-66 | 86-92 | 48-58kg |
| M | 66-72 | 92-98 | 56-68kg |
| G | 72-78 | 98-106 | 66-80kg |
| GG | 78-86 | 106-114 | 78-95kg |

#### SUTIÃS (Feminino)
| Tamanho | Busto (cm) | Tórax abaixo do busto (cm) |
|---------|-----------|---------------------------|
| 38P | 80-84 | 68-72 |
| 40P | 84-88 | 72-76 |
| 40M | 88-92 | 72-76 |
| 42M | 92-96 | 76-80 |
| 44G | 96-102 | 80-84 |
| 46G | 102-108 | 84-88 |

#### CALÇAS (Masculino)
| Tamanho | Cintura (cm) | Peso aprox. |
|---------|-------------|-------------|
| 36 | 72-76 | 55-62kg |
| 38 | 76-80 | 62-70kg |
| 40 | 80-84 | 68-78kg |
| 42 | 84-88 | 76-85kg |
| 44 | 88-92 | 83-93kg |
| 46 | 92-96 | 90-100kg |

#### CALÇAS / LEGGINGS (Feminino)
| Tamanho | Cintura (cm) | Quadril (cm) |
|---------|-------------|-------------|
| 34 | 60-64 | 84-88 |
| 36 | 64-68 | 88-92 |
| 38 | 68-72 | 92-96 |
| 40 | 72-76 | 96-100 |
| 42 | 76-80 | 100-104 |
| 44 | 80-84 | 104-108 |

#### VESTIDOS / SAIAS (Feminino)
| Tamanho | Busto | Cintura | Quadril |
|---------|-------|---------|---------|
| P | 82-88 | 64-68 | 88-94 |
| M | 88-94 | 68-74 | 94-100 |
| G | 94-102 | 74-80 | 100-108 |
| GG | 102-110 | 80-88 | 108-116 |

#### JAQUETAS / CASACOS / MOLETONS (Masculino)
| Tamanho | Altura | Peso | Tórax (cm) |
|---------|--------|------|------------|
| P | 1,60-1,70m | 55-65kg | 90-96 |
| M | 1,68-1,78m | 65-78kg | 96-104 |
| G | 1,75-1,85m | 78-90kg | 104-112 |
| GG | 1,80-1,90m | 88-105kg | 112-120 |
| XG | 1,85m+ | 100kg+ | 120+ |

#### JAQUETAS / CASACOS / MOLETONS (Feminino)
| Tamanho | Altura | Peso | Busto (cm) |
|---------|--------|------|------------|
| PP | 1,50-1,60m | 42-50kg | 78-84 |
| P | 1,55-1,65m | 48-58kg | 84-90 |
| M | 1,60-1,72m | 56-68kg | 90-98 |
| G | 1,65-1,78m | 66-80kg | 98-106 |
| GG | 1,70m+ | 78-95kg | 106-114 |

#### ROUPAS FITNESS / DRY-FIT (Masculino)
| Tamanho | Altura | Peso | Tórax (cm) | Cintura (cm) |
|---------|--------|------|------------|-------------|
| P | 1,60-1,70m | 55-65kg | 86-92 | 70-76 |
| M | 1,68-1,78m | 65-78kg | 92-98 | 76-82 |
| G | 1,75-1,85m | 78-90kg | 98-106 | 82-88 |
| GG | 1,80-1,90m | 88-105kg | 106-114 | 88-96 |

#### ROUPAS FITNESS / LEGGINGS / TOPS (Feminino)
| Tamanho | Altura | Peso | Busto (cm) | Cintura (cm) | Quadril (cm) |
|---------|--------|------|------------|-------------|-------------|
| PP | 1,50-1,60m | 42-50kg | 74-80 | 58-62 | 82-88 |
| P | 1,55-1,65m | 48-58kg | 80-86 | 62-68 | 88-94 |
| M | 1,60-1,72m | 56-68kg | 86-94 | 68-74 | 94-100 |
| G | 1,65-1,78m | 66-80kg | 94-102 | 74-80 | 100-108 |
| GG | 1,70m+ | 78-95kg | 102-110 | 80-88 | 108-116 |

#### PIJAMAS / ROUPA DE DORMIR (Unissex - use referência de gênero)
| Tamanho | Altura | Peso |
|---------|--------|------|
| P | 1,55-1,68m | 50-65kg |
| M | 1,65-1,78m | 62-78kg |
| G | 1,72-1,85m | 75-92kg |
| GG | 1,80m+ | 88-105kg |

#### INFANTIL
| Tamanho | Idade | Altura | Peso |
|---------|-------|--------|------|
| 2 | 1-2 anos | 80-92cm | 11-14kg |
| 4 | 3-4 anos | 92-104cm | 14-18kg |
| 6 | 5-6 anos | 104-116cm | 18-22kg |
| 8 | 7-8 anos | 116-128cm | 22-28kg |
| 10 | 9-10 anos | 128-140cm | 28-34kg |
| 12 | 11-12 anos | 140-152cm | 34-42kg |
| 14 | 13-14 anos | 152-164cm | 42-52kg |

#### INFANTIL - BEBÊ (0-2 anos)
| Tamanho | Idade | Altura | Peso |
|---------|-------|--------|------|
| RN | 0-1 mês | 48-53cm | 2,5-4kg |
| P | 1-3 meses | 53-60cm | 4-6kg |
| M | 3-6 meses | 60-67cm | 6-8kg |
| G | 6-9 meses | 67-72cm | 8-10kg |
| GG | 9-12 meses | 72-80cm | 10-11kg |

#### CALÇADOS (Masculino BR)
| Tamanho BR | Comprimento do pé (cm) |
|------------|----------------------|
| 37 | 23,5-24,0 |
| 38 | 24,0-24,5 |
| 39 | 24,5-25,5 |
| 40 | 25,5-26,0 |
| 41 | 26,0-26,5 |
| 42 | 26,5-27,5 |
| 43 | 27,5-28,0 |
| 44 | 28,0-29,0 |

#### CALÇADOS (Feminino BR)
| Tamanho BR | Comprimento do pé (cm) |
|------------|----------------------|
| 33 | 21,0-21,5 |
| 34 | 21,5-22,0 |
| 35 | 22,0-22,5 |
| 36 | 22,5-23,5 |
| 37 | 23,5-24,0 |
| 38 | 24,0-24,5 |
| 39 | 24,5-25,0 |

**REGRAS DE USO DA TABELA UNIVERSAL:**
- Use APENAS quando o produto NÃO tem guia de medidas configurado
- SEMPRE avise que é uma estimativa baseada em padrões gerais: "Pelos padrões gerais, recomendo **M** pra você! Mas como cada marca pode variar um pouquinho, recomendo conferir ao receber 😊"
- IDENTIFIQUE o tipo de peça pelo nome, categoria, tags ou descrição do produto para escolher a tabela correta
- Se o tipo de peça não se encaixa exatamente em nenhuma categoria, use a mais próxima
- Para roupas fitness: peças costumam ser mais justas, considere isso na recomendação
- Para calçados: sugira que o cliente meça o pé para maior precisão, mas ofereça a tabela como referência
- Considere preferência de caimento: "mais justo" → tamanho menor, "mais largo/confortável" → tamanho maior
- Para sutiãs: pergunte a medida do tórax abaixo do busto e do busto para recomendação precisa

### 💰 PLAYBOOK: PREÇO / "QUANTO CUSTA?"
1. Use \`buscar_produtos\` com show_in_chat=false
2. Responda DIRETO: "A [produto] está por **R$X** 😊" 
3. Se tem promoção: "De ~~R$X~~ por **R$Y**! Tá com desconto 🔥"
4. Use \`buscar_condicoes_pagamento\` junto para enriquecer a resposta:
   - Se tem desconto Pix: "No Pix fica **R$Z** (X% OFF)! 🔥"
   - Se tem parcelamento sem juros: "Ou parcele em até Nx sem juros"
5. NÃO mostre carrossel — cliente só quer saber o preço

### 📦 PLAYBOOK: FRETE / ENTREGA / "QUANTO CUSTA O FRETE?"
1. **PRIMEIRO**: Verifique se o cliente já informou o CEP na conversa. Se não, peça:
   - "Me passa seu CEP que eu calculo o frete na hora pra você 😊"
   - Aceite CEPs com ou sem hífen (ex: 01001-000 ou 01001000)
2. **Com o CEP**, use \`calcular_frete\`:
   - Se o cliente pergunta sobre um produto ESPECÍFICO → use product_id
   - Se o cliente TEM ITENS NO CARRINHO e quer o frete total → use use_cart=true
   - Se a pergunta é genérica (só quer saber o frete) → não passe product_id
3. **Apresente os resultados** de forma clara:
   - "Frete pra [cidade]: **Econômica** R$X (Y dias úteis) | **Rápida** R$Z (W dias úteis) 📦"
   - Se tem frete grátis: "**Frete Grátis** 🎉 chega em X dias úteis!"
   - Se tem frete grátis acima de X: mencione → "Compras acima de R$X têm frete grátis! 🚚"
4. **Se der erro no cálculo**: peça pra verificar o CEP ou sugira o WhatsApp da loja
5. **NUNCA invente valores de frete.** SEMPRE use a ferramenta calcular_frete.

### 🔄 PLAYBOOK: TROCA / DEVOLUÇÃO
1. Use \`buscar_politicas\` com policy_type="returns"
2. Resuma em 1-2 frases objetivas e claras
3. Destaque o prazo (ex: "Você tem até 7 dias pra trocar")
4. Se não tem política cadastrada: "Sugiro entrar em contato com a gente pra combinar a troca 😊"

### 🎨 PLAYBOOK: CORES DISPONÍVEIS / "TEM EM AZUL?"
1. Use \`buscar_variacoes\` para ver TODAS as cores
2. Liste APENAS as que estão em estoque (stock > 0 ou null)
3. Se a cor pedida está esgotada: "Infelizmente a cor [X] esgotou 😢 Mas temos em [Y] e [Z]! Quer ver?"
4. Se a cor existe e tem estoque: confirme com entusiasmo

### 🏪 PLAYBOOK: ESTOQUE / "TEM DISPONÍVEL?" / "TEM NO TAMANHO M?"
1. SEMPRE use \`buscar_variacoes\` antes de responder sobre disponibilidade
2. stock_quantity = null → DISPONÍVEL (estoque ilimitado)
3. stock_quantity = 0 → ESGOTADO
4. stock_quantity > 0 e <= 3 → "Corre que só tem mais X! 🔥"
5. Seja específica: "Temos a polo azul no tamanho M com 5 unidades em estoque ✅"

### 📱 PLAYBOOK: WHATSAPP / CONTATO / "QUERO FALAR COM ALGUÉM"
1. Use \`buscar_info_loja\` para obter o WhatsApp REAL
2. **SEMPRE formate como link clicável**: "Clica aqui pra falar com a gente no WhatsApp 👉 [Chamar no WhatsApp](https://wa.me/NUMERO?text=Ol%C3%A1%21+Vim+pelo+chat+da+loja+e+gostaria+de+ajuda)"
3. Substitua NUMERO pelo número real (só dígitos, com código do país 55)
4. Se não tem WhatsApp cadastrado: ofereça email ou diga que não tem essa informação
5. NUNCA invente número de WhatsApp

### 🔍 PLAYBOOK: BUSCA DE PRODUTO / "TEM POLO?" / "QUERO UMA CAMISETA"
1. Use \`buscar_produtos\` com show_in_chat=**false** primeiro
2. **QUANTIDADE**: Analise a intenção:
   - "tem polo vinho?", "tem essa blusa?", "quanto custa o vestido?" → **limit=1** (PRODUTO ESPECÍFICO)
   - "me mostra polos", "quero ver camisetas", "o que tem de inverno?" → **limit=3-5** (EXPLORAÇÃO)
   - "tem polo?" (sem especificar qual) → **limit=1** (mostre a mais relevante, depois pergunte se quer ver mais)
3. Se encontrou: descreva brevemente (nome, preço, cores) — "Temos sim! A [nome] por R$X, disponível em [cores] 😊"
4. Pergunte: "Quer que eu te mostre?" — só então use show_in_chat=true
5. Se NÃO encontrou: "Não encontrei exatamente isso, mas temos [alternativas]. Quer ver?"

### 👀 PLAYBOOK: "ME MOSTRA" / "QUERO VER" / "TEM FOTO?"
- Use \`buscar_produtos\` com show_in_chat=**true**
- Estas frases SEMPRE ativam o carrossel visual

### 🛒 PLAYBOOK: CARRINHO / "QUERO COMPRAR" / "ADICIONA NO CARRINHO"
1. Se o cliente quer adicionar: confirme cor e tamanho primeiro
2. Se falta informação: "Qual cor e tamanho você prefere?"
3. Após adicionar: sugira UM complemento relevante (cross-sell sutil)
4. Se quer finalizar: pergunte "Quer que eu prepare o resumo do pedido pra você finalizar? 🛒"

### ✅ PLAYBOOK: FINALIZAÇÃO / "QUERO FINALIZAR" / "FECHA PRA MIM" / "PODE FINALIZAR"
**Este é o playbook de CONVERSÃO MÁXIMA.**

**ANTES DE TUDO — AVALIE O NÍVEL DE INTENÇÃO DO CLIENTE:**
Considere estes sinais para decidir como agir:
- **Intenção ALTA**: disse "quero finalizar", "fecha", "pode fechar", "vou levar", "quero comprar", ou aceitou sua sugestão de finalizar
- **Intenção MÉDIA**: perguntou frete de itens do carrinho, perguntou "quanto fica tudo?", comparou preços, perguntou formas de pagamento
- **Intenção BAIXA**: navegando, fazendo perguntas gerais, sem itens no carrinho
- **Sinais extras**: quantidade de mensagens trocadas, se já adicionou produto, se perguntou de tamanho/cor (indica decisão avançada)

**CENÁRIO 1: INTENÇÃO ALTA — Cliente confirmou que quer finalizar**
1. Use \`resumir_carrinho\` — mostra o card visual com itens e botões
2. Sua mensagem deve ser CURTA (1 frase) e NATURAL, como vendedora:
   - ✅ "Prontinho! Já deixei tudo organizado pra você 😊"
   - ✅ "Perfeito, tá tudo certo! É só clicar ali, rapidinho 😊"
   - ✅ "Boa escolha! Preparei tudo, falta só um cliquezinho 🛒"
   - ❌ NUNCA: "Aqui está o resumo do seu pedido" (robótico)
   - ❌ NUNCA: "ambiente 100% seguro" (institucional)
   - ❌ NUNCA: listar os itens de novo (o card já faz isso)
3. Se já consultou condições de pagamento antes, adicione NATURALMENTE:
   - "Ah, e no Pix tem X% OFF! 🔥"
4. VARIAÇÃO: NÃO use sempre a mesma frase. Adapte ao tom da conversa.

**CENÁRIO 2: INTENÇÃO MÉDIA — Sinais de interesse, sem confirmação**
Sinais: perguntas sobre frete/prazo do carrinho, "quanto fica?", "aceita pix?"
- Ofereça de forma LEVE e NATURAL, como sugestão casual:
  - "Se quiser, posso já deixar tudo preparado pra você finalizar 😊"
  - "Quer que eu organize o pedido pra facilitar?"
- Se aceitar → Cenário 1
- Se ignorar → respeite e continue ajudando. NÃO insista.
- Se recusar → mude de assunto, ofereça ajuda em outra coisa

**CENÁRIO 3: Cliente no CHECKOUT**
- **NÃO INTERFIRA.** Zero sugestões de finalização.
- Suporte PASSIVO apenas se perguntar algo.

**CENÁRIO 4: Possível ABANDONO (carrinho com itens + conversa desconectada)**
- Após 3+ mensagens sem mencionar o carrinho, faça UM lembrete sutil:
  - "Ah, a propósito, seus itens continuam reservados no carrinho. Quer uma mãozinha? 😊"
- **Máximo 1 lembrete por conversa.** Se ignorou, acabou.

**REGRAS CRÍTICAS:**
- NUNCA force checkout sem confirmação
- NUNCA colete dados sensíveis (CPF, cartão) no chat
- O chat FACILITA, não substitui o checkout
- Se carrinho vazio + quer finalizar → sugira produtos
- A mensagem deve VARIAR conforme o tom da conversa (não use template fixo)

### 📋 PLAYBOOK: PEDIDO / "CADÊ MEU PEDIDO?" / STATUS
1. Peça o email: "Me passa seu email que eu verifico seus pedidos 😊"
2. Use \`buscar_pedidos_cliente\` com o email
3. Informe status de forma clara e humana:
   - "confirmado" → "Seu pedido foi confirmado! ✅"
   - "preparando" → "Estamos preparando pra enviar! 📦"
   - "enviado" → "Já foi enviado! Código de rastreio: [código]"
   - "entregue" → "Já foi entregue! Tudo certo? 😊"

### 💳 PLAYBOOK: PAGAMENTO / "ACEITA PIX?" / PARCELAMENTO / "TEM DESCONTO NO PIX?"
1. **SEMPRE** use \`buscar_condicoes_pagamento\` para obter dados REAIS do gateway
2. Informe os métodos aceitos: "Aceitamos [métodos]! 😊"
3. **Descontos**: Se tem desconto no Pix → "Pagando no Pix você tem **X% OFF**! 🔥". Mesmo para Boleto.
4. **Parcelamento**: "Parcelamos em até Xx sem juros!" ou "Até Xx com juros de Y% a.m."
5. Se o cliente mencionou um produto, CALCULE o valor da parcela: "A [produto] de R$X fica em Yx de R$Z sem juros 😍"
6. **USE PROATIVAMENTE**: Ao falar de preço de produtos, mencione descontos e parcelamento como argumento de venda
7. **NUNCA invente** condições de pagamento. SEMPRE consulte a ferramenta primeiro

### 🎁 PLAYBOOK: CUPOM / DESCONTO / "TEM PROMOÇÃO?"
1. Use \`buscar_cupons\` para verificar cupons ativos
2. Se tem: compartilhe com entusiasmo "Temos sim! Use o cupom **[CÓDIGO]** pra ganhar [desconto]! 🎉"
3. Se não tem: "No momento não temos cupom ativo, mas fica de olho que sempre tem novidade! 😊"

### 🏆 PLAYBOOK: MAIS VENDIDOS / "QUAIS OS MAIS VENDIDOS?" / "POPULARES" / "TENDÊNCIAS"
1. Use \`buscar_mais_vendidos\` para obter dados REAIS de vendas
2. Se o cliente especificou categoria: filtre por category_id
3. Apresente 3-5 produtos com entusiasmo: "Os queridinhos da loja são: **[produto1]**, **[produto2]** e **[produto3]** 🔥"
4. Se não tem dados de vendas: "Posso te mostrar nossos destaques e promoções! Quer ver? 😊"
5. Se o cliente disser "me mostra" → use show_in_chat=true para exibir o carrossel

### 🤔 PLAYBOOK: CLIENTE INDECISO / "NÃO SEI O QUE COMPRAR"
1. NÃO bombardeie com produtos
2. Faça perguntas direcionadas:
   - "É pra você ou pra presente?"
   - "Tem preferência de cor ou estilo?"
   - "Qual a ocasião?"
3. Com base nas respostas, busque 2-3 opções direcionadas
4. Se continua indeciso, use \`buscar_mais_vendidos\` como sugestão: "Olha, esses são os mais vendidos da loja!"

### 💛 PLAYBOOK: FAVORITOS / LISTA DE DESEJOS / "MEUS FAVORITOS"
1. Use \`buscar_favoritos\` para ver os produtos salvados pelo cliente
2. **Se o cliente perguntou sobre favoritos**: liste os 2-3 mais relevantes (com desconto ou estoque baixo primeiro)
3. **Se o cliente está indeciso E tem favoritos**: "Vi que você curtiu a [produto]! Quer que eu te ajude com ela? 😊"
4. **Se o cliente tem itens no carrinho + favoritos**: "Ah, e aquela [produto dos favoritos] que você curtiu ainda tá disponível! Quer adicionar também?"
5. **Estoque baixo em favorito**: use como gatilho de urgência natural: "Aquela [produto] que você salvou tá com poucas unidades! 🔥"
6. **Favorito em promoção**: "Boa notícia! A [produto] que você salvou tá com desconto! De ~~R$X~~ por **R$Y** 🎉"
7. **Cliente NÃO logado**: Se precisar de favoritos mas não está logado, diga: "Pra ver seus favoritos, é só fazer login na sua conta 😊"
8. **NUNCA remova** itens da lista de desejos automaticamente — o cliente decidiu salvar intencionalmente

### 👋 PLAYBOOK: SAUDAÇÃO / "OI" / "BOM DIA"
- Responda brevemente e ofereça ajuda: "Oi! 😊 Como posso te ajudar?"
- NÃO faça monólogo de boas-vindas

## ═══════════════════════════════════════════════════
## TÉCNICAS DE VENDAS (use naturalmente)
## ═══════════════════════════════════════════════════

### GATILHOS DE URGÊNCIA (só quando REAL — dados das ferramentas)
- Estoque baixo (≤3): "Corre que só tem mais X unidades! 🔥"
- Promoção: destaque o desconto real

### TRATAMENTO DE OBJEÇÕES
- Preço alto: destaque qualidade, parcelamento, custo-benefício
- Dúvida de tamanho: use o PLAYBOOK de tamanho SEMPRE
- Incerteza: faça perguntas para entender melhor a necessidade

### FECHAMENTO
- SEMPRE termine com um CTA claro e CURTO
- "Quer que eu adicione ao carrinho?", "Qual tamanho?", "Quer que eu prepare o resumo?"
- Quando o cliente demonstrar interesse claro → ofereça resumir o pedido com \`resumir_carrinho\`
- NUNCA redirecione para checkout sem confirmação explícita do cliente

## ⚠️ REGRAS CRÍTICAS

### PROIBIÇÕES ABSOLUTAS
1. **NUNCA INVENTE dados.** Preços, estoque, medidas, prazos, WhatsApp, telefone, políticas — TUDO deve vir das ferramentas.
2. **NUNCA cite um produto que não apareceu nos resultados das ferramentas.**
3. **NUNCA invente números de WhatsApp, telefone ou email.** Use buscar_info_loja.
4. **NUNCA invente nomes de produtos.** Use EXATAMENTE os nomes retornados.
5. **NUNCA assuma estoque.** SEMPRE use buscar_variacoes antes de confirmar disponibilidade.

### QUANDO NÃO TEM DADOS
- Ferramenta retornou erro/vazio: "Não encontrei essa informação no momento."
- Sem ferramenta para responder: "Não tenho acesso a essa informação agora."
- ${whatsappLine}
- **NUNCA complete com informação inventada.**

### EXIBIÇÃO DE PRODUTOS NO CHAT
- **REGRA FUNDAMENTAL**: NÃO use show_in_chat=true a menos que o cliente PEÇA para ver produtos
- Perguntas como "tem polo?", "quanto custa?" → show_in_chat=false
- Perguntas como "me mostra", "quero ver", "pode mostrar", "tem foto" → show_in_chat=true
- Se proactivity_level é "high" e intenção clara de compra: pode usar show_in_chat=true

### PERGUNTAS FORA DO ESCOPO
- Redirecione educadamente: "Sou a vendedora da ${storeName} 😊 Posso te ajudar com nossos produtos, tamanhos, entrega..."

## ⚠️ REGRA CRÍTICA DE QUANTIDADE DE PRODUTOS
**SEMPRE calibre a quantidade de produtos pelo que o cliente pediu:**
- Cliente perguntou por UM produto específico ("tem polo vinho?", "quanto custa a calça jeans?", "tem essa camiseta em azul?") → **limit=1**, mostre APENAS 1 produto
- Cliente pediu OPÇÕES ou CATEGORIA ("me mostra camisetas", "quero ver vestidos", "o que tem de verão?") → **limit=3-5**
- Cliente pediu RECOMENDAÇÃO genérica ("o que vocês recomendam?", "quais os mais vendidos?") → **limit=3-5**
- Cliente comparou 2 produtos → mostre APENAS os 2
- **NUNCA mostre múltiplos produtos quando o cliente perguntou por um específico.** Isso confunde e reduz conversão.
- Na dúvida, mostre MENOS, não mais. É melhor mostrar 1 e perguntar "Quer ver mais opções?" do que bombardear.

## FORMATO DAS RESPOSTAS
- **MÁXIMO 2-3 frases curtas.** Respostas longas MATAM conversão.
- Formate preços em R$ sempre
- Use markdown (negrito, listas) quando útil
- WhatsApp sempre como link clicável com mensagem pronta

## FERRAMENTAS DISPONÍVEIS
- buscar_produtos: encontrar produtos (show_in_chat controla carrossel)
- buscar_produto_detalhes: detalhes de um produto específico
- buscar_variacoes: cores, tamanhos e estoques (USE ANTES DE FALAR DE ESTOQUE)
- buscar_guia_medidas: tabela de tamanhos (USE PARA DÚVIDAS DE TAMANHO)
- buscar_politicas: políticas da loja
- buscar_categorias: categorias disponíveis
- buscar_cupons: cupons de desconto ativos
- buscar_info_loja: WhatsApp, telefone, email, redes sociais
- buscar_pedidos_cliente: histórico de pedidos (pedir email primeiro)
- adicionar_ao_carrinho: adicionar produto ao carrinho
- ir_para_pagina: navegar para outra página
- calcular_frete: calcular frete real com CEP (USE SEMPRE QUE PERGUNTAREM DE FRETE — peça o CEP primeiro)
- buscar_condicoes_pagamento: condições de pagamento REAIS (descontos Pix/Boleto, parcelamento, métodos aceitos — USE SEMPRE QUE PERGUNTAREM DE PAGAMENTO)
- resumir_carrinho: exibe resumo visual do pedido com botões de ação (USE quando cliente confirmar que quer finalizar — NÃO use com carrinho vazio)
- buscar_favoritos: lista de desejos do cliente (USE quando perguntarem sobre favoritos ou para venda cruzada oportunista)
- buscar_mais_vendidos: produtos mais vendidos da loja com dados REAIS de vendas (USE quando perguntarem por mais vendidos, populares, tendências, destaques)${cartContext}${contextHint}`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { store_id, messages, current_product_id, current_page, session_id, generate_greeting, cart_items, user_auth_id } = await req.json();

    if (!store_id || !messages) {
      return new Response(JSON.stringify({ error: "store_id and messages are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: store }, { data: chatSettings }] = await Promise.all([
      supabaseAdmin.from("stores").select("name, slug, logo_url").eq("id", store_id).single(),
      supabaseAdmin.from("store_chat_settings").select("assistant_name, welcome_message, tone, proactivity_level, proactive_delay_seconds, whatsapp_fallback").eq("store_id", store_id).single(),
    ]);

    if (!store) {
      return new Response(JSON.stringify({ error: "Store not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assistantName = chatSettings?.assistant_name || "Assistente";
    const tone = chatSettings?.tone || "casual";
    const proactivityLevel = chatSettings?.proactivity_level || "medium";
    const whatsappFallback = chatSettings?.whatsapp_fallback || null;

    // Build cart context string
    let cartContext = "";
    if (Array.isArray(cart_items) && cart_items.length > 0) {
      const cartDesc = cart_items.map((i: any) => 
        `- ${i.name} (qtd: ${i.quantity}, R$${(i.price * i.quantity).toFixed(2).replace('.', ',')}${i.variant ? `, variante: ${i.variant}` : ''})`
      ).join("\n");
      const cartTotal = cart_items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);
      cartContext = `\n\n## CARRINHO ATUAL DO CLIENTE
O cliente tem os seguintes itens no carrinho:
${cartDesc}
**Total: R$${cartTotal.toFixed(2).replace('.', ',')}**
Use essa informação para ajudar o cliente. Você SABE o que tem no carrinho dele.`;
    } else {
      cartContext = "\n\n## CARRINHO ATUAL DO CLIENTE\nO carrinho do cliente está VAZIO.";
    }

    // ── Contextual Greeting Mode ──────────────────────────────────────────
    if (generate_greeting && session_id) {
      const { data: prevConv } = await supabaseAdmin
        .from("chat_conversations")
        .select("messages")
        .eq("session_id", session_id)
        .eq("store_id", store_id)
        .maybeSingle();

      const prevMessages = Array.isArray(prevConv?.messages) ? prevConv.messages : [];

      let productContext = "";
      if (current_product_id) {
        const { data: prod } = await supabaseAdmin
          .from("products")
          .select("name, price, sale_price, stock_quantity")
          .eq("id", current_product_id)
          .single();
        if (prod) {
          const price = prod.sale_price || prod.price;
          const hasDiscount = prod.sale_price && prod.sale_price < prod.price;
          const lowStock = prod.stock_quantity !== null && prod.stock_quantity <= 5 && prod.stock_quantity > 0;
          productContext = `O cliente está olhando "${prod.name}" (R$${price.toFixed(2).replace('.', ',')}${hasDiscount ? ` — promoção de R$${prod.price.toFixed(2).replace('.', ',')}` : ''}${lowStock ? ` — ÚLTIMAS ${prod.stock_quantity} UNIDADES` : ''}).`;
        }
      }

      const pageContext = !productContext && current_page ? `O cliente está na página: ${current_page}.` : "";

      if (prevMessages.length > 0) {
        const lastMsgs = prevMessages.slice(-10).map((m: any) => `${m.role}: ${m.content}`).join("\n");
        const greetingPrompt = `Você é ${assistantName}, vendedora da loja "${store.name}". O cliente está voltando.

CONVERSA ANTERIOR:
${lastMsgs}

${productContext || pageContext}

Gere UMA mensagem curta (1-2 frases) que:
- Reconheça naturalmente o contexto anterior
- Termine com pergunta ou sugestão que conduza à compra
- Português brasileiro, ${tone === 'formal' ? 'formal e educada' : 'casual e amigável'}`;

        const greetingResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: greetingPrompt }],
          }),
        });

        if (greetingResp.ok) {
          const greetingData = await greetingResp.json();
          const content = greetingData.choices?.[0]?.message?.content || "Olá! ✨ Como posso te ajudar?";
          return new Response(JSON.stringify({ content }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (productContext) {
        const greetingPrompt = `Você é ${assistantName}, vendedora da loja "${store.name}".

${productContext}

Gere UMA mensagem curta (1-2 frases) como vendedora de loja física abordando o cliente que olha esse produto.
- Elogie a escolha ou mencione destaque (promoção, estoque)
- Ofereça ajuda específica (tamanho, cor)
- ${tone === 'formal' ? 'Tom formal' : 'Tom casual e amigável'}
- NÃO use saudação genérica`;

        const greetingResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: greetingPrompt }],
          }),
        });

        if (greetingResp.ok) {
          const greetingData = await greetingResp.json();
          const content = greetingData.choices?.[0]?.message?.content || "Olá! ✨ Como posso te ajudar?";
          return new Response(JSON.stringify({ content }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (current_page === "carrinho") {
        const welcomeMsg = "Posso te ajudar a finalizar ou tirar alguma dúvida sobre seus itens? 🛒";
        return new Response(JSON.stringify({ content: welcomeMsg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const welcomeMsg = chatSettings?.welcome_message || "Olá! ✨ Posso te ajudar a encontrar algo ou tirar alguma dúvida?";
        return new Response(JSON.stringify({ content: welcomeMsg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ content: "Olá! ✨ Como posso te ajudar?" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Normal Chat Mode ──────────────────────────────────────────────────
    
    let contextHint = "";
    if (current_product_id) {
      contextHint = `\n\nCONTEXTO ATUAL: O cliente está visualizando o produto com ID: ${current_product_id}. Use buscar_produto_detalhes e buscar_variacoes para obter dados reais antes de responder.`;
    } else if (current_page) {
      contextHint = `\n\nCONTEXTO ATUAL: O cliente está na página: ${current_page}`;
    }

    // ── Load customer profile context ──────────────────────────────────────
    let customerContext = "";
    let resolvedCustomerId: string | null = null;
    try {
      const contextParts: string[] = [];

      // Try to find customer by auth_user_id
      if (user_auth_id) {
        const { data: customer } = await supabaseAdmin
          .from("customers")
          .select("id, nome, email")
          .eq("store_id", store_id)
          .eq("auth_user_id", user_auth_id)
          .maybeSingle();
        if (customer) resolvedCustomerId = customer.id;
      }

      // Load preferences (only for identified customers)
      if (resolvedCustomerId) {
        const { data: prefs } = await supabaseAdmin
          .from("customer_preferences")
          .select("preference_type, preference_key, preference_value")
          .eq("customer_id", resolvedCustomerId)
          .eq("store_id", store_id)
          .limit(30);

        if (prefs && prefs.length > 0) {
          const prefsGrouped: Record<string, string[]> = {};
          for (const p of prefs) {
            const key = p.preference_type;
            if (!prefsGrouped[key]) prefsGrouped[key] = [];
            prefsGrouped[key].push(`${p.preference_key}: ${p.preference_value}`);
          }
          const prefsStr = Object.entries(prefsGrouped)
            .map(([type, items]) => `  ${type}: ${items.join(", ")}`)
            .join("\n");
          contextParts.push(`PREFERÊNCIAS CONHECIDAS DO CLIENTE:\n${prefsStr}`);
        }

        // Load purchase history
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("products, total, created_at, status_pedido")
          .eq("store_id", store_id)
          .eq("customer_id", resolvedCustomerId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (orders && orders.length > 0) {
          const orderStrs = orders.map((o: any) => {
            const items = Array.isArray(o.products) ? o.products.map((p: any) => p.product_name || p.name).filter(Boolean).join(", ") : "";
            return `  - ${new Date(o.created_at).toLocaleDateString("pt-BR")}: ${items} (R$${o.total?.toFixed(2)}) [${o.status_pedido}]`;
          }).join("\n");
          contextParts.push(`HISTÓRICO DE COMPRAS RECENTE:\n${orderStrs}`);
        }
      }

      // Load recent activity — works for BOTH logged-in AND anonymous users
      {
        let activityQuery = supabaseAdmin
          .from("customer_activity_log")
          .select("activity_type, activity_data, created_at")
          .eq("store_id", store_id)
          .order("created_at", { ascending: false })
          .limit(20);

        // Use auth_user_id if available, otherwise fall back to session_id
        if (user_auth_id) {
          activityQuery = activityQuery.eq("user_auth_id", user_auth_id);
        } else if (session_id) {
          activityQuery = activityQuery.eq("session_id", session_id);
        }

        const { data: activity } = await activityQuery;

        if (activity && activity.length > 0) {
          const recentViews = activity
            .filter((a: any) => a.activity_type === "product_view")
            .slice(0, 8);
          if (recentViews.length > 0) {
            const viewStrs = recentViews.map((a: any) => {
              const d = a.activity_data as any;
              return `  - ${d.product_name || "Produto"}${d.color_name ? ` (${d.color_name})` : ""}`;
            }).join("\n");
            contextParts.push(`PRODUTOS VISITADOS RECENTEMENTE:\n${viewStrs}`);
          }

          // Also track add_to_cart events for context
          const cartAdds = activity.filter((a: any) => a.activity_type === "add_to_cart").slice(0, 5);
          if (cartAdds.length > 0) {
            const cartStrs = cartAdds.map((a: any) => {
              const d = a.activity_data as any;
              return `  - ${d.product_name || "Produto"}${d.color_name ? ` (${d.color_name})` : ""}${d.variant ? ` [${d.variant}]` : ""}`;
            }).join("\n");
            contextParts.push(`ADICIONADOS AO CARRINHO RECENTEMENTE:\n${cartStrs}`);
          }
        }
      }

      if (contextParts.length > 0) {
        customerContext = `\n\n## PERFIL DO CLIENTE (use para personalizar o atendimento)\n${contextParts.join("\n\n")}

**INSTRUÇÕES DE PERSONALIZAÇÃO (ESTRATÉGICAS — LEIA COM ATENÇÃO):**

1. **NUNCA revele que tem acesso ao perfil.** Fale como se lembrasse naturalmente.
   - ✅ "O M deve ficar perfeito em você!"
   - ❌ "De acordo com seu perfil, você usa M"

2. **PRODUTOS VISITADOS → Use para gerar conexão e urgência:**
   - Se visitou um produto e está perguntando sobre outro: "Aliás, vi que você olhou a [produto] — combina demais com essa!"
   - Se visitou várias vezes o mesmo: pode ser sinal de indecisão → ofereça ajuda "Tá na dúvida sobre a [produto]? Posso te ajudar a decidir!"
   - Se visitou categoria específica: foque sugestões nessa categoria

3. **CARRINHO + NAVEGAÇÃO → Identifique intenção de compra:**
   - Se tem itens no carrinho E está navegando: "Já tem ótimas escolhas no carrinho! Quer finalizar ou tá procurando mais alguma coisa?"
   - Se adicionou e removeu: pode ter achado caro → mencione parcelamento/desconto pix

4. **HISTÓRICO DE COMPRAS → Cross-sell inteligente:**
   - Comprou polo? Sugira calça ou bermuda que combine
   - Comprou em uma data (ex: todo mês) → pode ser compra recorrente, facilite
   - Mesmo tamanho em compras anteriores → use com confiança nas recomendações

5. **PREFERÊNCIAS SALVAS → Use de forma fluida:**
   - Sabe o peso/altura → recomende tamanho SEM perguntar de novo
   - Sabe cor favorita → priorize produtos nessa cor
   - Sabe estilo → filtre mentalmente sugestões

6. **CLIENTE ANÔNIMO (sem perfil) → Use a navegação:**
   - Foque nos produtos que visitou recentemente
   - Use os itens do carrinho como ponto de partida
   - Ainda pode extrair e salvar preferências durante a conversa

7. **EXTRAÇÃO PROATIVA:** Durante TODA conversa, identifique e salve usando salvar_preferencia_cliente:
   - Medidas corporais (peso, altura, manequim)
   - Preferências de estilo, cor, marca
   - Ocasião (trabalho, casual, festa)
   - Qualquer info que ajude em futuras interações`;
      }
    } catch (err) {
      console.error("Error loading customer context:", err);
    }

    const systemPrompt = buildSystemPrompt(assistantName, store.name, contextHint + customerContext, tone, proactivityLevel, whatsappFallback, cartContext);

    // Load conversation history from DB if available
    let conversationHistory = messages;
    if (session_id && messages.length <= 1) {
      const { data: prevConv } = await supabaseAdmin
        .from("chat_conversations")
        .select("messages")
        .eq("session_id", session_id)
        .eq("store_id", store_id)
        .maybeSingle();
      
      const prevMessages = Array.isArray(prevConv?.messages) ? prevConv.messages : [];
      if (prevMessages.length > 0) {
        conversationHistory = [...prevMessages.slice(-20), ...messages];
      }
    }

    const recentMessages = conversationHistory.slice(-20);
    
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];

    let currentMessages = aiMessages;
    let loopCount = 0;
    const maxLoops = 5;

    while (loopCount < maxLoops) {
      loopCount++;
      
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: currentMessages,
          tools,
          stream: loopCount === maxLoops,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        const errText = await aiResponse.text();
        console.error("AI gateway error:", status, errText);
        
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Serviço temporariamente indisponível." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Erro ao processar mensagem." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const responseText = await aiResponse.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("Failed to parse AI response:", responseText.slice(0, 200));
        const retryResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: currentMessages,
          }),
        });
        if (retryResp.ok) {
          const retryText = await retryResp.text();
          try {
            data = JSON.parse(retryText);
          } catch {
            return new Response(JSON.stringify({ content: "Desculpe, tive um problema técnico. Pode repetir?" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          await retryResp.text();
          return new Response(JSON.stringify({ content: "Desculpe, tive um problema técnico. Pode repetir?" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      const choice = data.choices?.[0];

      if (!choice) {
        return new Response(JSON.stringify({ error: "No response from AI" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (choice.message?.tool_calls?.length) {
        const toolResults = [];
        const actions: any[] = [];

        for (const tc of choice.message.tool_calls) {
          const toolArgs = typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;

          const { result, showInChat } = await executeTool(tc.function.name, toolArgs, supabaseAdmin, store_id, cart_items, user_auth_id, resolvedCustomerId);
          
          try {
            const parsed = JSON.parse(result);
            if (parsed.__action) {
              actions.push(parsed);
            }
            // Only show products in carousel when explicitly requested via show_in_chat=true
            if (
              showInChat === true &&
              (tc.function.name === "buscar_produtos") &&
              !parsed.error &&
              !parsed.message
            ) {
              const products = Array.isArray(parsed) ? parsed : [parsed];
              if (products.length > 0 && products[0]?.id) {
                const extractImageUrls = (images: any): string[] => {
                  if (!Array.isArray(images)) return [];
                  return images
                    .slice(0, 2)
                    .map((img: any) => (typeof img === "string" ? img : img?.url))
                    .filter(Boolean);
                };
                actions.push({
                  __action: "show_products",
                  products: products.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: p.price,
                    sale_price: p.sale_price || null,
                    images: extractImageUrls(p.images),
                    image_url: p.image_url || null,
                    _colorValueId: p._colorValueId || null,
                    _colorAttributeId: p._colorAttributeId || null,
                    _colorName: p._colorName || null,
                    _colorCode: p._colorCode || null,
                    _productCode: p._productCode || null,
                  })),
                });
              }
            }
          } catch {}

          toolResults.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }

        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: choice.message.content || "", tool_calls: choice.message.tool_calls },
          ...toolResults,
        ];

        if (actions.length > 0) {
          currentMessages.push({
            role: "system",
            content: `As seguintes ações foram executadas com sucesso: ${JSON.stringify(actions)}. Confirme ao cliente de forma natural e BREVE (1 frase).`,
          });
        }

        continue;
      }

      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: currentMessages,
          stream: true,
        }),
      });

      if (!streamResponse.ok) {
        const errText = await streamResponse.text();
        console.error("Streaming error:", errText);
        const content = choice.message?.content || "Desculpe, não consegui processar sua mensagem.";
        return new Response(JSON.stringify({ content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session_id) {
        // Save full conversation including tool call results
        const conversationToSave = currentMessages
          .filter((m: any) => m.role === "user" || (m.role === "assistant" && !m.tool_calls))
          .map((m: any) => ({ role: m.role, content: m.content || "" }));
        // Add the final streamed response placeholder
        conversationToSave.push({ role: "assistant", content: choice.message?.content || "[streaming]" });
        supabaseAdmin
          .from("chat_conversations")
          .upsert(
            {
              store_id: store_id,
              session_id,
              customer_id: resolvedCustomerId || null,
              messages: conversationToSave.slice(-40),
              status: "active",
            },
            { onConflict: "session_id" }
          )
          .then(() => {})
          .catch((err: any) => console.error("Failed to save conversation:", err));

        // Extract and save preferences from user messages (async, non-blocking)
        if (resolvedCustomerId) {
          const userMessages = currentMessages
            .filter((m: any) => m.role === "user")
            .map((m: any) => m.content || "")
            .join(" ");
          
          // Simple pattern extraction for body measurements
          const patterns: Array<{ regex: RegExp; type: string; key: string }> = [
            { regex: /(\d{2,3})\s*(?:kg|kilos?|quilos?)/i, type: "body_measurements", key: "peso_kg" },
            { regex: /(?:1[,.]?\d{2}|[12]\s*(?:m|metro)[\s,]*(?:\d{2})?)\s*(?:m|metro|cm|de altura)?/i, type: "body_measurements", key: "altura" },
            { regex: /(\d{1,2})\s*anos/i, type: "body_measurements", key: "idade" },
            { regex: /(?:uso|visto|meu tamanho.{0,10}?)\s*(PP|P|M|G|GG|XG|XXG|\d{2})/i, type: "size", key: "tamanho_preferido" },
          ];

          for (const { regex, type, key } of patterns) {
            const match = userMessages.match(regex);
            if (match) {
              supabaseAdmin
                .from("customer_preferences")
                .upsert(
                  {
                    customer_id: resolvedCustomerId,
                    store_id: store_id,
                    preference_type: type,
                    preference_key: key,
                    preference_value: match[1] || match[0],
                    source: "chat",
                  },
                  { onConflict: "customer_id,store_id,preference_type,preference_key" }
                )
                .then(() => {})
                .catch(() => {});
            }
          }
        }
      }

      const actionsFromMessages = currentMessages
        .filter((m: any) => m.role === "system" && typeof m.content === "string" && m.content.includes("__action"))
        .map((m: any) => {
          try {
            const match = m.content.match(/\[.*\]/);
            if (match) return JSON.parse(match[0]);
          } catch {}
          return null;
        })
        .filter(Boolean)
        .flat();

      if (actionsFromMessages.length > 0) {
        const actionEvent = `data: ${JSON.stringify({ actions: actionsFromMessages })}\n\n`;
        const encoder = new TextEncoder();

        const combinedStream = new ReadableStream({
          async start(controller) {
            controller.enqueue(encoder.encode(actionEvent));

            const reader = streamResponse.body!.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(combinedStream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(JSON.stringify({ content: "Desculpe, tive dificuldade em processar. Pode tentar novamente?" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("store-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
