import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { separateProductsByColor } from './useProductSeparation';
import {
  findCompetitorGroupIndices,
  findClassicPairTargets,
  isCompetitorOfCart,
  isClassicPairOfCart,
} from '@/features/storefront/lib/productAffinityDictionary';

interface CartItem {
  id: string;
  name: string;
  price: number;
  category_id?: string | null;
  variationId?: string;
  colorCode?: number;
  color?: string;
}

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  images: string[];
  category_id: string | null;
  _colorValueId?: string;
  _colorAttributeId?: string;
  _colorName?: string;
  _colorCode?: number;
  _productCode?: number;
}

interface UseMiniCartRecommendationsParams {
  storeId: string | undefined;
  cartItems: CartItem[];
  maxProducts?: number;
}

export function useMiniCartRecommendations({
  storeId,
  cartItems,
  maxProducts = 5,
}: UseMiniCartRecommendationsParams) {
  const cartItemIds = useMemo(() => cartItems.map(item => item.id), [cartItems]);

  // Extract real product IDs from cart (handle color variation virtual IDs)
  const realCartProductIds = useMemo(() => {
    const ids = new Set<string>();
    cartItemIds.forEach(id => {
      const colorMatch = id.match(/^(.+)_color_/);
      ids.add(colorMatch ? colorMatch[1] : id);
    });
    return Array.from(ids);
  }, [cartItemIds]);

  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price, 0);
  }, [cartItems]);

  // ═══════════════════════════════════════════════════
  // CAMADA 1: Frequentemente comprados juntos
  // Analisa pedidos reais para encontrar co-ocorrências
  // ═══════════════════════════════════════════════════
  const { data: frequentlyBoughtIds } = useQuery({
    queryKey: ['frequently-bought-together', storeId, realCartProductIds],
    queryFn: async () => {
      if (!storeId || realCartProductIds.length === 0) return [];

      // Fetch orders that contain at least one of the cart products (secure RPC)
      const { data: orders } = await supabase
        .rpc('get_store_order_products_for_ranking', { 
          p_store_id: storeId, 
          p_limit: 200 
        });

      if (!orders || orders.length === 0) return [];

      // Count co-occurrences: how often product X appears in orders with cart products
      const coOccurrenceCount = new Map<string, number>();
      const cartProductSet = new Set(realCartProductIds);

      for (const order of orders) {
        const orderProducts = order.products as any[];
        if (!Array.isArray(orderProducts)) continue;

        const orderProductIds = orderProducts.map((p: any) => p.product_id).filter(Boolean);
        const hasCartProduct = orderProductIds.some(id => cartProductSet.has(id));

        if (hasCartProduct) {
          // Count products in this order that are NOT in the cart
          for (const pid of orderProductIds) {
            if (!cartProductSet.has(pid)) {
              coOccurrenceCount.set(pid, (coOccurrenceCount.get(pid) || 0) + 1);
            }
          }
        }
      }

      // Sort by frequency, return top IDs
      return Array.from(coOccurrenceCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);
    },
    enabled: !!storeId && realCartProductIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  // ═══════════════════════════════════════════════════
  // CAMADA 3: Mais vendidos da loja (busca contagem)
  // ═══════════════════════════════════════════════════
  const { data: bestSellerIds } = useQuery({
    queryKey: ['best-sellers', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data: orders } = await supabase
        .rpc('get_store_order_products_for_ranking', { 
          p_store_id: storeId, 
          p_limit: 300 
        });

      if (!orders || orders.length === 0) return [];

      const salesCount = new Map<string, number>();
      for (const order of orders) {
        const orderProducts = order.products as any[];
        if (!Array.isArray(orderProducts)) continue;
        for (const p of orderProducts) {
          if (p.product_id) {
            const qty = p.quantity || 1;
            salesCount.set(p.product_id, (salesCount.get(p.product_id) || 0) + qty);
          }
        }
      }

      return Array.from(salesCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([id]) => id);
    },
    enabled: !!storeId,
    staleTime: 15 * 60 * 1000,
  });

  // ═══════════════════════════════════════════════════
  // Fetch all candidate products + separation data
  // ═══════════════════════════════════════════════════
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['mini-cart-recommendations', storeId],
    queryFn: async () => {
      if (!storeId) return { products: [], variations: [], colorAttributeId: undefined, valueMap: new Map() };

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, price, sale_price, images, category_id,
          display_variations_separately, hide_parent_product
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(80);

      if (error) throw error;

      const productIds = products?.map(p => p.id) || [];
      if (productIds.length === 0) return { products: [], variations: [], colorAttributeId: undefined, valueMap: new Map() };

      const [variationsRes, attributesRes, valuesRes] = await Promise.all([
        supabase
          .from('product_variations_v2')
          .select('id, product_id, price, sale_price, image_url, images, is_active, attributes')
          .in('product_id', productIds)
          .eq('is_active', true),
        supabase
          .from('attributes')
          .select('id, name, type')
          .eq('store_id', storeId),
        supabase
          .from('attribute_values')
          .select('id, value, attribute_id, color_hex'),
      ]);

      const { findVisualAttributeId } = await import('@/features/storefront/lib/visualAttributeUtils');
      const colorAttributeId = findVisualAttributeId((attributesRes.data || []).map((a: any) => ({ id: a.id, type: a.type, name: a.name })));
      const valueMap = new Map(valuesRes.data?.map(v => [v.id, v]) || []);

      return {
        products: products || [],
        variations: variationsRes.data || [],
        colorAttributeId,
        valueMap,
      };
    },
    enabled: !!storeId && cartItems.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Apply color separation
  const allProducts = useMemo(() => {
    if (!rawData?.products || rawData.products.length === 0) return [];
    return separateProductsByColor(
      rawData.products,
      rawData.variations,
      rawData.colorAttributeId,
      rawData.valueMap
    );
  }, [rawData]);

  // Fetch cart items' category info
  const { data: cartCategoryInfo } = useQuery({
    queryKey: ['cart-categories', realCartProductIds],
    queryFn: async () => {
      if (realCartProductIds.length === 0) return [];
      const { data } = await supabase
        .from('products')
        .select('id, category_id')
        .in('id', realCartProductIds);
      return data || [];
    },
    enabled: realCartProductIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // ═══════════════════════════════════════════════════
  // Pre-compute affinity sets do carrinho (uma vez)
  // ═══════════════════════════════════════════════════
  const cartAffinity = useMemo(() => {
    const competitorIndices = new Set<number>();
    const pairTargets: string[][] = [];
    cartItems.forEach((item) => {
      findCompetitorGroupIndices(item.name).forEach((idx) => competitorIndices.add(idx));
      findClassicPairTargets(item.name).forEach((target) => pairTargets.push(target));
    });
    return { competitorIndices, pairTargets };
  }, [cartItems]);

  // ═══════════════════════════════════════════════════
  // SMART SCORING: 3 camadas + dicionário PT-BR
  // ═══════════════════════════════════════════════════
  const recommendations = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];

    // Build exclusion set: match cart items to recommendation IDs
    // Cart items use real product UUIDs; recommendations use virtual IDs like {uuid}_color_{colorValueId}
    const excludeIds = new Set<string>();
    
    // Index cart items by base product ID for quick lookup
    const cartByBaseId = new Map<string, CartItem[]>();
    
    cartItems.forEach(item => {
      excludeIds.add(item.id); // Always exclude exact cart item ID
      const existing = cartByBaseId.get(item.id) || [];
      existing.push(item);
      cartByBaseId.set(item.id, existing);
    });

    // Match recommendations against cart items
    allProducts.forEach(p => {
      const colorMatch = p.id.match(/^(.+)_color_(.+)$/);
      
      if (colorMatch) {
        // Virtual color-separated product
        const baseProductId = colorMatch[1];
        const cartItemsForBase = cartByBaseId.get(baseProductId);
        
        if (cartItemsForBase) {
          // Check if any cart item with this base product matches this specific color
          const isInCart = cartItemsForBase.some(cartItem => {
            // Match by colorCode (most reliable)
            if (cartItem.colorCode !== undefined && p._colorCode !== undefined) {
              return cartItem.colorCode === p._colorCode;
            }
            // Match by color name (fallback - used when added via QuickAddDialog)
            if (cartItem.color && p._colorName) {
              return cartItem.color.toLowerCase() === p._colorName.toLowerCase();
            }
            // If cart item has no color info, it's a different variant — don't exclude
            return false;
          });
          
          if (isInCart) {
            excludeIds.add(p.id);
          }
        }
      } else {
        // Non-virtual product — exclude if any cart item has this exact ID
        if (cartByBaseId.has(p.id)) {
          excludeIds.add(p.id);
        }
      }
    });

    const availableProducts = allProducts.filter(p => !excludeIds.has(p.id));
    if (availableProducts.length === 0) return [];

    // Cart category IDs (to detect "different category" = complementary)
    const cartCategoryIds = new Set(
      cartCategoryInfo?.map(p => p.category_id).filter(Boolean) || []
    );

    // Sets for each layer
    const frequentSet = new Set(frequentlyBoughtIds || []);
    const bestSellerSet = new Set(bestSellerIds || []);

    const scoredProducts = availableProducts.map(product => {
      let score = 0;
      const effectivePrice = product.sale_price || product.price;

      // Extract real product ID for matching with order data
      const realId = product.id.match(/^(.+)_color_/)?.[1] || product.id;

      // ── CAMADA 1: Frequentemente comprados juntos (highest priority) ──
      if (frequentSet.has(realId)) {
        score += 60;
      }

      // ── DICIONÁRIO PT-BR: Par clássico (combina naturalmente) ──
      if (isClassicPairOfCart(product.name, cartAffinity.pairTargets)) {
        score += 50;
      }

      // ── DICIONÁRIO PT-BR: Competidor (canibaliza) ──
      if (isCompetitorOfCart(product.name, cartAffinity.competitorIndices)) {
        score -= 50;
      }

      // ── CAMADA 2: Categoria do carrinho ──
      if (product.category_id && cartCategoryIds.size > 0) {
        if (cartCategoryIds.has(product.category_id)) {
          // Mesma categoria = competidor → penalidade ativa
          score -= 40;
        } else {
          // Categoria diferente = complementar
          score += 35;
        }
      }

      // ── CAMADA 3: Mais vendidos da loja ──
      if (bestSellerSet.has(realId)) {
        score += 20;
      }

      // ── FILTROS DE CONVERSÃO ──

      // Impulse-buy friendly: price ≤ 50% of cart subtotal
      if (cartSubtotal > 0 && effectivePrice <= cartSubtotal * 0.5) {
        score += 15;
      }

      // Products on sale (urgency)
      if (product.sale_price && product.sale_price < product.price) {
        score += 10;
      }

      // Has images (visual appeal)
      if (product.images.length > 0) {
        score += 3;
      }

      return { product, score };
    });

    // Sort by score, randomize ties for variety
    return scoredProducts
      .sort((a, b) => {
        const diff = b.score - a.score;
        if (diff !== 0) return diff;
        // Randomize products with same score
        return Math.random() - 0.5;
      })
      .slice(0, maxProducts)
      .map(({ product }) => product);
  }, [allProducts, cartItems, cartItemIds, cartCategoryInfo, frequentlyBoughtIds, bestSellerIds, cartSubtotal, maxProducts, cartAffinity]);

  return {
    recommendations,
    isLoading,
    hasRecommendations: recommendations.length > 0,
  };
}
