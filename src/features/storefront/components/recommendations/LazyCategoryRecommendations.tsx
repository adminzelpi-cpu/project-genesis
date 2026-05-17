import { useCategoryRecommendations } from "@/features/storefront/hooks/useCategoryRecommendations";
import { RecommendationCarousel } from "@/features/storefront/components/recommendations";
import type { CategoryProduct } from "@/features/storefront/types/category";

interface LazyCategoryRecommendationsProps {
  storeId: string | undefined;
  storeSlug: string;
  excludeIds: string[];
  onQuickAdd: (product: CategoryProduct) => void;
  onAuthRequired: (productName?: string) => void;
}

/**
 * Wraps the category recommendation query so that it only runs when the
 * component is actually mounted (i.e., when the user scrolls near the
 * bottom of the page). Reduces network/CPU contention on initial render.
 */
export function LazyCategoryRecommendations({
  storeId,
  storeSlug,
  excludeIds,
  onQuickAdd,
  onAuthRequired,
}: LazyCategoryRecommendationsProps) {
  const { data: recommendations } = useCategoryRecommendations(storeId, excludeIds);

  if (!recommendations || recommendations.products.length === 0) return null;

  return (
    <section className="mt-8 border-t pt-8">
      <RecommendationCarousel
        title={recommendations.title}
        products={recommendations.products.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          sale_price: p.sale_price,
          images: p.images,
          _productCode: p._productCode ?? p.product_code ?? undefined,
          _colorCode: p._colorCode,
          _colorValueId: p._colorValueId,
          _colorName: p._colorName,
        }))}
        storeSlug={storeSlug}
        onQuickAdd={(p) => onQuickAdd(p as any)}
        onAuthRequired={onAuthRequired}
      />
    </section>
  );
}
