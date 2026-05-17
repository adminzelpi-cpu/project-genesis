import { memo, useMemo, useState, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStorePath } from '@/contexts/StoreSlugContext';
import { useProductRecommendations } from '../../hooks/useProductRecommendations';
import { useRecentlyViewed, RecentlyViewedProduct } from '../../hooks/useRecentlyViewed';
import { RecommendationCarousel } from './RecommendationCarousel';
import { useCart } from '@/contexts/CartContext';

// Lazy load the quick add dialog
const CategoryQuickAddDialog = lazy(() => 
  import('../category/CategoryQuickAddDialog').then(mod => ({ default: mod.CategoryQuickAddDialog }))
);

interface QuickAddProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  images: string[];
}

interface ProductRecommendationsProps {
  storeId: string;
  storeSlug: string;
  productId: string;
  categoryId: string | null | undefined;
  price: number;
  /** product_code of the current product */
  productCode?: number | null;
  /** Current color code being viewed – used to exclude only the exact variant from recently viewed */
  currentColorCode?: number | null;
}

export const ProductRecommendations = memo(({
  storeId,
  storeSlug,
  productId,
  categoryId,
  price,
  productCode,
  currentColorCode,
}: ProductRecommendationsProps) => {
  const { items: cartItems } = useCart();
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  
  // Quick Add Dialog state
  const [selectedProduct, setSelectedProduct] = useState<QuickAddProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleQuickAdd = (product: QuickAddProduct) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleViewDetails = useCallback(() => {
    if (selectedProduct) {
      setDialogOpen(false);
      navigate(buildPath(`/product/${selectedProduct.slug}`));
    }
  }, [selectedProduct, storeSlug, navigate, buildPath]);
  
  // Get cart item IDs to exclude
  const cartItemIds = useMemo(() => 
    cartItems.map(item => item.id), 
    [cartItems]
  );

  // Get recently viewed products
  const { getRecentlyViewed, hasRecentlyViewed } = useRecentlyViewed(storeId);
  
  // Exclude only the exact current variant from recently viewed (not all colors)
  const currentExcludeKey = currentColorCode != null
    ? `${productId}__color_${currentColorCode}`
    : productId;
  
  const recentlyViewedProducts = useMemo(() => {
    return getRecentlyViewed([currentExcludeKey], 12);
  }, [getRecentlyViewed, currentExcludeKey]);

  // NOTE: Recently viewed IDs are NOT excluded from recommendation blocks.
  // A product can appear in "recently viewed" AND in recommendations — this is intentional
  // to keep recommendation blocks consistently populated.

  // Get adaptive recommendations (only exclude cart items, not recently viewed)
  const {
    combineWith,
    youMayAlsoLike,
    totalProductCount,
    isLoading,
  } = useProductRecommendations({
    storeId,
    productId,
    categoryId,
    price,
    productCode,
    excludeIds: cartItemIds,
  });

  // Transform recently viewed products to match recommendation format
  const formattedRecentlyViewed = useMemo(() => 
    recentlyViewedProducts.map(p => {
      // Strip color suffix from name (e.g. "Camisa Polo - Pink" → "Camisa Polo")
      const cleanName = p.colorName ? p.name.replace(new RegExp(`\\s*-\\s*${p.colorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '') : p.name;
      return {
        id: p.id,
        name: cleanName,
        slug: p.slug,
        price: p.price,
        sale_price: p.sale_price,
        images: p.images,
        _colorCode: p.colorCode ?? undefined,
        _productCode: p.productCode ?? undefined,
        _colorValueId: p.colorValueId ?? undefined,
        _colorAttributeId: p.colorAttributeId ?? undefined,
        _colorName: p.colorName ?? undefined,
      };
    }),
    [recentlyViewedProducts]
  );

  if (isLoading) {
    return null;
  }

  // Don't show anything if there's literally nothing to show
  const hasAnyContent = 
    formattedRecentlyViewed.length > 0 ||
    combineWith.length > 0 ||
    youMayAlsoLike.length > 0;

  if (!hasAnyContent) return null;

  return (
    <>
      <div className="mt-8 border-t border-border pt-8 space-y-[10px]">
        {/* 1. Recently Viewed - Only shows if there are viewed products */}
        {formattedRecentlyViewed.length > 0 && (
          <RecommendationCarousel
            title="Vistos Recentemente"
            products={formattedRecentlyViewed}
            storeSlug={storeSlug}
            onQuickAdd={handleQuickAdd}
          />
        )}

        {/* 2. Combine com (Cross-sell: different categories) */}
        {combineWith.length > 0 && (
          <RecommendationCarousel
            title="Combine com"
            products={combineWith}
            storeSlug={storeSlug}
            onQuickAdd={handleQuickAdd}
          />
        )}

        {/* 3. Você também pode gostar (same category, different product) */}
        {youMayAlsoLike.length > 0 && (
          <RecommendationCarousel
            title="Você também pode gostar"
            products={youMayAlsoLike}
            storeSlug={storeSlug}
            onQuickAdd={handleQuickAdd}
          />
        )}
      </div>

      {/* Quick Add Dialog */}
      {selectedProduct && (
        <Suspense fallback={null}>
          <CategoryQuickAddDialog
            product={{
              id: selectedProduct.id,
              name: selectedProduct.name,
              slug: selectedProduct.slug,
              price: selectedProduct.price,
              sale_price: selectedProduct.sale_price,
              images: selectedProduct.images,
              _colorValueId: (selectedProduct as any)._colorValueId,
              _colorAttributeId: (selectedProduct as any)._colorAttributeId,
            }}
            storeSlug={storeSlug}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onViewDetails={handleViewDetails}
          />
        </Suspense>
      )}
    </>
  );
});

ProductRecommendations.displayName = 'ProductRecommendations';
