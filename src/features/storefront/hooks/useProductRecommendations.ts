import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { separateProductsByColor } from './useProductSeparation';

interface RecommendationProduct {
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

interface UseProductRecommendationsParams {
  storeId: string | undefined;
  productId: string | undefined;
  categoryId: string | null | undefined;
  price: number;
  /** product_code of the current product (to exclude same-base variations) */
  productCode?: number | null;
  excludeIds?: string[];
}

/**
 * Limit colors per product_code to avoid flooding with 20 colors of the same item,
 * but still show variety. Products without _productCode are always included.
 */
function limitColorsPerProductCode(
  products: RecommendationProduct[],
  maxPerBase: number = 3
): RecommendationProduct[] {
  const countByCode = new Map<number, number>();
  const result: RecommendationProduct[] = [];
  for (const p of products) {
    if (p._productCode != null) {
      const count = countByCode.get(p._productCode) || 0;
      if (count >= maxPerBase) continue;
      countByCode.set(p._productCode, count + 1);
    }
    result.push(p);
  }
  return result;
}

export function useProductRecommendations({
  storeId,
  productId,
  categoryId,
  price,
  productCode,
  excludeIds = [],
}: UseProductRecommendationsParams) {
  // Fetch all active products from the store WITH display settings
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['store-products-recommendations', storeId],
    queryFn: async () => {
      if (!storeId) return { products: [], variations: [], colorAttributeId: undefined, valueMap: new Map() };

      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          price,
          sale_price,
          images,
          category_id,
          product_code,
          display_variations_separately,
          hide_parent_product
        `)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const productIds = products?.map(p => p.id) || [];
      if (productIds.length === 0) return { products: [], variations: [], colorAttributeId: undefined, valueMap: new Map() };

      // Fetch variations with attributes for separation
      const { data: variations } = await supabase
        .from('product_variations_v2')
        .select('id, product_id, price, sale_price, image_url, images, is_active, attributes')
        .in('product_id', productIds)
        .eq('is_active', true);

      // Fetch attributes to find color attribute
      const { data: attributes } = await supabase
        .from('attributes')
        .select('id, name, type')
        .eq('store_id', storeId);

      // Fetch attribute values for color names
      const { data: attributeValues } = await supabase
        .from('attribute_values')
        .select('id, value, attribute_id, color_hex, value_code');

      const { findVisualAttributeId } = await import('@/features/storefront/lib/visualAttributeUtils');
      const colorAttributeId = findVisualAttributeId((attributes || []).map((a: any) => ({ id: a.id, type: a.type, name: a.name })));
      const valueMap = new Map(attributeValues?.map(v => [v.id, v]) || []);

      return {
        products: products || [],
        variations: variations || [],
        colorAttributeId,
        valueMap,
      };
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000,
  });

  // Apply separation logic
  const allProducts = useMemo(() => {
    if (!rawData?.products || rawData.products.length === 0) return [];

    return separateProductsByColor(
      rawData.products,
      rawData.variations,
      rawData.colorAttributeId,
      rawData.valueMap
    );
  }, [rawData]);

  // Total product count in store
  const totalProductCount = allProducts.length;

  // Resolve the current product's product_code
  const currentProductCode = useMemo(() => {
    if (productCode != null) return productCode;
    // Try to find from allProducts
    if (!productId) return undefined;
    const found = allProducts.find(p => p.id === productId || p.id.startsWith(`${productId}_color_`));
    return found?._productCode;
  }, [productCode, productId, allProducts]);

  // Calculate recommendations
  const recommendations = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return { combineWith: [], youMayAlsoLike: [], totalProductCount: 0 };
    }

    // Exclude: current product + its color variations + cart items
    const baseExcludes = new Set<string>();
    [productId, ...excludeIds].filter(Boolean).forEach(id => {
      baseExcludes.add(id as string);
      // Also exclude virtual color IDs of the same product
      allProducts.forEach(p => {
        if (p.id.startsWith(`${id}_color_`)) {
          baseExcludes.add(p.id);
        }
      });
    });

    let available = allProducts.filter(p => !baseExcludes.has(p.id));

    // Also exclude items with the same product_code as the current product
    // (user already sees color options on the product page)
    if (currentProductCode != null) {
      available = available.filter(p => p._productCode !== currentProductCode);
    }

    if (available.length === 0) {
      return { combineWith: [], youMayAlsoLike: [], totalProductCount };
    }

    // Limit colors per product_code (max 3 per base product)
    const deduplicated = limitColorsPerProductCode(available, 3);

    // Check if the store has multiple categories
    const storeCategories = new Set(deduplicated.map(p => p.category_id).filter(Boolean));
    const hasMultipleCategories = storeCategories.size > 1;

    let combineWith: RecommendationProduct[] = [];
    let youMayAlsoLike: RecommendationProduct[] = [];

    if (hasMultipleCategories) {
      // Block 1 — "Combine com": products from DIFFERENT categories (cross-sell)
      combineWith = deduplicated
        .filter(p => p.category_id !== categoryId)
        .slice(0, 12);

      // Block 2 — "Você também pode gostar": same category, different product-base
      youMayAlsoLike = deduplicated
        .filter(p => p.category_id === categoryId)
        .slice(0, 12);

      // If same category has too few, fill with remaining cross-category not already in block 1
      if (youMayAlsoLike.length < 4) {
        const usedIds = new Set([...combineWith.map(p => p.id), ...youMayAlsoLike.map(p => p.id)]);
        const fillers = deduplicated.filter(p => !usedIds.has(p.id));
        youMayAlsoLike = [...youMayAlsoLike, ...fillers].slice(0, 12);
      }
    } else {
      // Store has only 1 category — split available products between two blocks
      // Shuffle deterministically by alternating
      const half = Math.ceil(deduplicated.length / 2);
      combineWith = deduplicated.slice(0, Math.min(half, 12));
      youMayAlsoLike = deduplicated.slice(half, half + 12);
    }

    return {
      combineWith,
      youMayAlsoLike,
      totalProductCount,
    };
  }, [allProducts, productId, categoryId, excludeIds, totalProductCount, currentProductCode]);

  return {
    ...recommendations,
    isLoading,
  };
}
