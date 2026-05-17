import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { separateProductsByColor } from './useProductSeparation';
import { findVisualAttributeId } from '@/features/storefront/lib/visualAttributeUtils';

interface EmptyCartProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  images: string[];
  _colorValueId?: string;
  _colorAttributeId?: string;
  _colorName?: string;
  _colorCode?: number;
  _productCode?: number;
}

/**
 * Hybrid recommendations for empty cart state.
 * Priority: best-sellers > on-sale > newest products
 */
export function useEmptyCartRecommendations(storeId: string | undefined, maxProducts = 6) {
  // Fetch best-seller IDs from order history
  const { data: bestSellerIds } = useQuery({
    queryKey: ['empty-cart-best-sellers', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data: orders } = await supabase
        .rpc('get_store_order_products_for_ranking', { p_store_id: storeId, p_limit: 300 });
      if (!orders || orders.length === 0) return [];

      const salesCount = new Map<string, number>();
      for (const order of orders) {
        const orderProducts = order.products as any[];
        if (!Array.isArray(orderProducts)) continue;
        for (const p of orderProducts) {
          if (p.product_id) {
            salesCount.set(p.product_id, (salesCount.get(p.product_id) || 0) + (p.quantity || 1));
          }
        }
      }
      return Array.from(salesCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([id]) => id);
    },
    enabled: !!storeId,
    staleTime: 15 * 60 * 1000,
  });

  // Fetch all active products + color separation data
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['empty-cart-products', storeId],
    queryFn: async () => {
      if (!storeId) return { products: [], variations: [], colorAttributeId: undefined, valueMap: new Map() };

      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, slug, price, sale_price, images, display_variations_separately, hide_parent_product')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(60);

      if (error) throw error;
      const productIds = products?.map(p => p.id) || [];
      if (productIds.length === 0) return { products: [], variations: [], colorAttributeId: undefined, valueMap: new Map() };

      const [variationsRes, attributesRes] = await Promise.all([
        supabase.from('product_variations_v2').select('id, product_id, price, sale_price, image_url, images, is_active, attributes').in('product_id', productIds).eq('is_active', true),
        supabase.from('attributes').select('id, name, type').eq('store_id', storeId),
      ]);

      const attrIds = (attributesRes.data || []).map(a => a.id);
      const valuesRes = attrIds.length > 0
        ? await supabase.from('attribute_values').select('id, value, attribute_id, color_hex').in('attribute_id', attrIds)
        : { data: [] as { id: string; value: string; attribute_id: string; color_hex: string | null }[] };

      return {
        products: products || [],
        variations: variationsRes.data || [],
        colorAttributeId: findVisualAttributeId((attributesRes.data || []).map((a: any) => ({ id: a.id, type: a.type, name: a.name }))),
        valueMap: new Map(valuesRes.data?.map(v => [v.id, v]) || []),
      };
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });

  const allProducts = useMemo(() => {
    if (!rawData?.products?.length) return [];
    return separateProductsByColor(rawData.products, rawData.variations, rawData.colorAttributeId, rawData.valueMap);
  }, [rawData]);

  const recommendations = useMemo((): EmptyCartProduct[] => {
    if (!allProducts.length) return [];
    const bestSellerSet = new Set(bestSellerIds || []);

    const scored = allProducts.map(product => {
      let score = 0;
      const realId = product.id.match(/^(.+)_color_/)?.[1] || product.id;

      // Best-sellers get highest priority
      if (bestSellerSet.has(realId)) score += 50;
      // On-sale products get urgency boost
      if (product.sale_price && product.sale_price < product.price) score += 30;
      // Has images
      if (product.images.length > 0) score += 5;

      return { product, score };
    });

    return scored
      .sort((a, b) => {
        const diff = b.score - a.score;
        return diff !== 0 ? diff : Math.random() - 0.5;
      })
      .slice(0, maxProducts)
      .map(({ product }) => product);
  }, [allProducts, bestSellerIds, maxProducts]);

  return { recommendations, isLoading, hasRecommendations: recommendations.length > 0 };
}
