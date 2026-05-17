import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchAndSeparateProducts } from './useProductSeparation';

export interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  images: string[];
  product_code: number | null;
  _colorValueId?: string;
  _colorAttributeId?: string;
  _colorName?: string;
  _colorCode?: number;
  _productCode?: number;
}

function extractImages(images: any): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((img: any) => (typeof img === 'string' ? img : img?.url))
    .filter(Boolean) as string[];
}

export function useProductSearch(storeId: string | undefined, query: string, enabled = true) {
  return useQuery({
    queryKey: ['product-search', storeId, query],
    queryFn: async (): Promise<SearchProduct[]> => {
      if (!storeId || !query.trim()) return [];

      // Find matching product IDs
      const { data: matchingProducts, error } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .ilike('name', `%${query.trim()}%`)
        .order('name')
        .limit(20);

      if (error) throw error;
      if (!matchingProducts || matchingProducts.length === 0) return [];

      const productIds = matchingProducts.map(p => p.id);
      const { products: separated } = await fetchAndSeparateProducts(storeId, productIds);

      return separated.slice(0, 6).map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        sale_price: p.sale_price,
        images: p.images,
        product_code: p._productCode ?? null,
        _colorValueId: p._colorValueId,
        _colorAttributeId: p._colorAttributeId,
        _colorName: p._colorName,
        _colorCode: p._colorCode,
        _productCode: p._productCode,
      }));
    },
    enabled: enabled && !!storeId && query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useProductSearchFull(storeId: string | undefined, query: string) {
  const isAllProducts = !query.trim();

  return useQuery({
    queryKey: ['product-search-full', storeId, query || '__all__'],
    queryFn: async (): Promise<SearchProduct[]> => {
      if (!storeId) return [];

      let productQuery = supabase
        .from('products')
        .select('id')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!isAllProducts) {
        productQuery = productQuery.ilike('name', `%${query.trim()}%`);
      }

      const { data: matchingProducts, error } = await productQuery;

      if (error) throw error;
      if (!matchingProducts || matchingProducts.length === 0) return [];

      const productIds = matchingProducts.map(p => p.id);
      const { products: separated } = await fetchAndSeparateProducts(storeId, productIds);

      return separated.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        sale_price: p.sale_price,
        images: p.images,
        product_code: p._productCode ?? null,
        _colorValueId: p._colorValueId,
        _colorAttributeId: p._colorAttributeId,
        _colorName: p._colorName,
        _colorCode: p._colorCode,
        _productCode: p._productCode,
      }));
    },
    enabled: !!storeId,
    staleTime: 30_000,
  });
}
