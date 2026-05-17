import { useState, lazy, Suspense } from "react";
import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Loader2 } from "lucide-react";
import { useFavorites } from "@/features/customers/hooks/useFavorites";
import { useNavigate } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { CategoryProductCard } from "@/features/storefront/components/category/CategoryProductCard";
import type { CategoryProduct } from "@/features/storefront/types/category";

const CategoryQuickAddDialog = lazy(() =>
  import("@/features/storefront/components/category/CategoryQuickAddDialog").then(
    (mod) => ({ default: mod.CategoryQuickAddDialog })
  )
);

export default function Favorites() {
  const { favorites, isLoading } = useFavorites();
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const [quickAddProduct, setQuickAddProduct] = useState<CategoryProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Derive storeSlug from first favorite's store
  const storeSlug = favorites?.[0]?.product?.store?.slug || "";

  const getProductImage = (product: any): string => {
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) return "/placeholder.svg";
    const img = product.images[0];
    if (typeof img === "string") return img;
    if (img && typeof img === "object" && img.url) return img.url;
    return "/placeholder.svg";
  };

  const getProductImages = (product: any): string[] => {
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) return ["/placeholder.svg"];
    return product.images.map((img: any) => {
      if (typeof img === "string") return img;
      if (img && typeof img === "object" && img.url) return img.url;
      return "/placeholder.svg";
    });
  };

  const toCategoryProduct = (product: any, colorValueId?: string | null): CategoryProduct => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    sale_price: product.sale_price,
    images: getProductImages(product),
    stock_quantity: product.stock_quantity,
    is_active: product.is_active,
    _colorValueId: colorValueId || undefined,
  });

  const handleProductClick = (product: CategoryProduct) => {
    if (storeSlug) {
      navigate(buildPath(`/product/${product.slug}`));
    }
  };

  const handleQuickAdd = (product: CategoryProduct) => {
    setQuickAddProduct(product);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Helmet><title>Favoritos</title></Helmet>
      <div>
        <h1 className="text-3xl font-bold text-foreground">Favoritos</h1>
        <p className="text-muted-foreground mt-1">
          {favorites?.length || 0} {favorites?.length === 1 ? "item salvo" : "itens salvos"}
        </p>
      </div>

      {!favorites || favorites.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Nenhum item nos favoritos
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Explore nossos produtos e salve seus favoritos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map((item) => (
            <CategoryProductCard
              key={item.id}
              product={toCategoryProduct(item.product, item.color_value_id)}
              onQuickAdd={handleQuickAdd}
              onProductClick={handleProductClick}
            />
          ))}
        </div>
      )}

      {quickAddProduct && (
        <Suspense fallback={null}>
          <CategoryQuickAddDialog
            product={quickAddProduct}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onViewDetails={() => {
              setDialogOpen(false);
              handleProductClick(quickAddProduct);
            }}
            storeSlug={storeSlug}
          />
        </Suspense>
      )}
    </div>
  );
}
