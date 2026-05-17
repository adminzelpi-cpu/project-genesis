import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAndSeparateProducts } from './useProductSeparation';
import type { CategoryProduct } from '../types/category';

/**
 * Fetches popular/recent products from a store to display on 404 pages
 * or other discovery surfaces when there are no personalized recommendations.
 */
export function usePopularProducts(storeId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['popular-products', storeId, limit],
    queryFn: async (): Promise<CategoryProduct[]> => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const productIds = data.map(p => p.id);
      const { products: separated } = await fetchAndSeparateProducts(storeId, productIds);

      return separated.slice(0, limit).map(p => ({
        id: p._colorValueId ? `${p.id}_color_${p._colorValueId}` : p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        sale_price: p.sale_price,
        images: p.images,
        stock_quantity: null,
        is_active: true,
        _colorValueId: p._colorValueId,
        _colorAttributeId: p._colorAttributeId,
        _colorName: p._colorName,
        _colorCode: p._colorCode,
        _productCode: p._productCode,
      }));
    },
    enabled: !!storeId,
    staleTime: 60_000,
  });
}
