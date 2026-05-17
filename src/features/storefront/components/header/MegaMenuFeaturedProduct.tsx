import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStorePath } from "@/contexts/StoreSlugContext";

interface MegaMenuFeaturedProductProps {
  categoryId: string;
  storeId: string;
  storeSlug: string;
}

export function MegaMenuFeaturedProduct({ categoryId, storeId, storeSlug }: MegaMenuFeaturedProductProps) {
  const { buildPath } = useStorePath();
  const { data: product } = useQuery({
    queryKey: ["mega-menu-featured", categoryId, storeId],
    queryFn: async () => {
      // Try to find most sold product in this category using secure RPC
      const { data: orders } = await supabase
        .rpc("get_store_order_products_for_ranking", { 
          p_store_id: storeId, 
          p_limit: 50 
        });

      const productCounts = new Map<string, number>();
      (orders || []).forEach((order) => {
        const items = order.products as any[];
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            if (item.product_id) {
              productCounts.set(item.product_id, (productCounts.get(item.product_id) || 0) + (item.quantity || 1));
            }
          });
        }
      });

      // Fetch products from this category
      const { data: categoryProducts } = await supabase
        .from("products")
        .select("id, name, slug, images, price, sale_price")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .or(`category_id.eq.${categoryId},category_ids.cs.{${categoryId}}`)
        .limit(20);

      if (!categoryProducts || categoryProducts.length === 0) return null;

      // Sort by sales count, fallback to newest
      const sorted = [...categoryProducts].sort((a, b) => {
        const countA = productCounts.get(a.id) || 0;
        const countB = productCounts.get(b.id) || 0;
        return countB - countA;
      });

      return sorted[0];
    },
    enabled: !!categoryId && !!storeId,
    staleTime: 5 * 60 * 1000,
  });

  if (!product) return null;

  const images = product.images as string[] | null;
  const imageUrl = images?.[0];

  if (!imageUrl) return null;

  return (
    <Link
      to={buildPath(`/product/${product.slug}`)}
      className="block relative overflow-hidden rounded-lg group h-full min-h-[200px]"
    >
      <img
        src={imageUrl}
        alt={product.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <p className="text-white text-sm font-medium truncate">{product.name}</p>
        <p className="text-white/90 text-sm font-bold">
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
            product.sale_price || product.price
          )}
        </p>
      </div>
    </Link>
  );
}
