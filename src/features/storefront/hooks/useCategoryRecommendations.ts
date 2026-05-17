import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAndSeparateProducts } from "./useProductSeparation";

/**
 * Category page recommendations: shows products from OTHER categories
 * to encourage cross-category browsing and increase conversion.
 * 
 * Rules:
 * - Only shows if there are products outside the current category
 * - Limits to 3 color variants per product-base to avoid flooding
 * - Prioritizes best sellers if sales history exists
 * - Title adapts: "Mais vendidos" (sales) or "Explore também" (no sales)
 * - Returns up to 12 products for carousel
 * - Works for any niche (fashion, electronics, food, etc.)
 */
export function useCategoryRecommendations(
  storeId: string | undefined,
  excludeProductIds: string[]
) {
  return useQuery({
    queryKey: ["category-recommendations", storeId, excludeProductIds.sort().join(",")],
    queryFn: async () => {
      if (!storeId) return null;

      // Fetch product IDs from the store EXCLUDING current category products
      const excludeSlice = excludeProductIds.slice(0, 50);
      
      let query = supabase
        .from("products")
        .select("id")
        .eq("store_id", storeId)
        .eq("is_active", true);

      if (excludeSlice.length > 0) {
        query = query.not("id", "in", `(${excludeSlice.join(",")})`);
      }

      const { data: productRows } = await query.limit(30);
      
      // No products outside this category → don't show the section at all
      if (!productRows || productRows.length === 0) return null;

      const productIds = productRows.map(p => p.id);

      // Use shared separation logic for proper images/prices
      const { products: separated } = await fetchAndSeparateProducts(storeId, productIds);
      if (separated.length === 0) return null;

      // Limit colors per product-base (max 3) to keep variety
      const countByCode = new Map<number, number>();
      const limited = separated.filter(p => {
        if (p._productCode == null) return true;
        const count = countByCode.get(p._productCode) || 0;
        if (count >= 3) return false;
        countByCode.set(p._productCode, count + 1);
        return true;
      });

      if (limited.length === 0) return null;

      // Try to get best sellers for sorting
      const { data: orders } = await supabase
        .rpc("get_store_order_products_for_ranking", { 
          p_store_id: storeId, 
          p_status: "entregue",
          p_limit: 100 
        });

      const salesCount = new Map<string, number>();
      (orders || []).forEach((order) => {
        const items = order.products as any[];
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            if (item?.product_id) {
              salesCount.set(
                item.product_id,
                (salesCount.get(item.product_id) || 0) + (item.quantity || 1)
              );
            }
          });
        }
      });

      const hasSales = salesCount.size > 0;
      const title = hasSales ? "Mais vendidos" : "Explore também";

      // Sort by sales or shuffle
      const sorted = [...limited];
      if (hasSales) {
        sorted.sort((a, b) => (salesCount.get(b.id) || 0) - (salesCount.get(a.id) || 0));
      } else {
        sorted.sort(() => Math.random() - 0.5);
      }

      const mapped = sorted.slice(0, 12).map((p) => ({
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

      return { products: mapped, title };
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 5,
  });
}
