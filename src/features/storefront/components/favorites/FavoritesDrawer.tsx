import { useState, useCallback, lazy, Suspense } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Trash2, ShoppingCart, Loader2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/features/customers/hooks/useFavorites";
import { trackAddToCart } from "@/features/tracking/lib/trackEvent";
import { getProductRetailerId } from "@/features/tracking/lib/retailerId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CategoryQuickAddDialog = lazy(() =>
  import("@/features/storefront/components/category/CategoryQuickAddDialog").then(
    (m) => ({ default: m.CategoryQuickAddDialog })
  )
);

interface FavoritesDrawerProps {
  open: boolean;
  onClose: () => void;
  storeSlug: string;
}

export function FavoritesDrawer({ open, onClose, storeSlug }: FavoritesDrawerProps) {
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const { addItem, onCartOpen } = useCart();
  const { favorites, isLoading, removeFavorite } = useFavorites();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [quickAddProduct, setQuickAddProduct] = useState<any>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Filter favorites for current store
  const storeFavorites = favorites?.filter(
    (fav) => fav.product?.store?.slug === storeSlug
  ) || [];

  const handleRemove = useCallback(async (productId: string, colorValueId?: string | null) => {
    setRemovingId(productId);
    await removeFavorite.mutateAsync({ productId, colorValueId: colorValueId || undefined });
    setRemovingId(null);
  }, [removeFavorite]);

  const handleAddToCart = useCallback(async (product: any) => {
    if (!product.is_active || (product.stock_quantity !== null && product.stock_quantity <= 0)) {
      toast.error("Produto indisponível");
      return;
    }

    setAddingId(product.id);

    // Check if product has active variations — if so, force selection via QuickAdd
    const { count } = await supabase
      .from("product_variations_v2")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id)
      .eq("is_active", true);

    if (count && count > 0) {
      setAddingId(null);
      // Build minimal CategoryProduct shape expected by QuickAddDialog
      setQuickAddProduct({
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        sale_price: product.sale_price,
        images: product.images || [],
        product_code: product.product_code,
        store_id: product.store_id || product.store?.id,
      });
      setQuickAddOpen(true);
      return;
    }

    const imgSrc = (() => {
      const img = product.images?.[0];
      if (!img) return "";
      if (typeof img === "string") return img;
      if (img && typeof img === "object" && (img as any).url) return (img as any).url;
      return "";
    })();

    const finalPrice = product.sale_price || product.price;
    addItem({
      id: product.id,
      name: product.name,
      price: finalPrice,
      image: imgSrc,
      productCode: (product as any).product_code,
    });

    trackAddToCart({
      id: getProductRetailerId(product as any),
      name: product.name,
      price: finalPrice,
      quantity: 1,
      category: product.category || undefined,
      currency: (product as any).store?.currency || 'BRL',
    }, product.store_id || product.store?.id);

    await new Promise((resolve) => setTimeout(resolve, 400));
    setAddingId(null);
    toast.success("Adicionado ao carrinho!");
  }, [addItem]);

  const handleViewProduct = useCallback((product: any) => {
    onClose();
    navigate(buildPath(`/product/${product.slug}`));
  }, [navigate, onClose, buildPath]);

  const handleViewAll = useCallback(() => {
    onClose();
    navigate("/customer/favorites");
  }, [navigate, onClose]);

  return (
    <>
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <h2 className="text-lg font-semibold">
              Meus Favoritos
              {storeFavorites.length > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({storeFavorites.length})
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : storeFavorites.length === 0 ? (
              <div className="py-12 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Nenhum favorito ainda</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Clique no ❤️ nos produtos para salvá-los aqui
                </p>
                <Button onClick={onClose} variant="outline">
                  Continuar comprando
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {storeFavorites.map((item) => {
                  const product = item.product;
                  const hasDiscount = product.sale_price && product.sale_price < product.price;
                  const inStock = product.is_active && (product.stock_quantity === null || product.stock_quantity > 0);
                  const isRemoving = removingId === product.id;
                  const isAdding = addingId === product.id;

                  return (
                    <div
                      key={item.id}
                      className={`flex gap-3 pb-4 border-b transition-all duration-300 ${
                        isRemoving ? "opacity-50 scale-95" : ""
                      }`}
                    >
                      <button
                        onClick={() => handleViewProduct(product)}
                        className="flex-shrink-0 focus:outline-none"
                      >
                        <img
                          src={(() => {
                            const img = product.images?.[0];
                            if (!img) return "";
                            if (typeof img === 'string') return img;
                            if (img && typeof img === 'object' && (img as any).url) return (img as any).url;
                            return "";
                          })()}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-md hover:opacity-80 transition-opacity text-transparent"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => handleViewProduct(product)}
                          className="text-left focus:outline-none w-full"
                        >
                          <h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                        </button>

                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="font-bold text-sm">
                            {formatCurrency(product.sale_price || product.price)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(product.price)}
                            </span>
                          )}
                        </div>

                        {!inStock && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            Fora de estoque
                          </Badge>
                        )}

                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs flex-1"
                            onClick={() => handleAddToCart(product)}
                            disabled={!inStock || isAdding}
                          >
                            {isAdding ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Adicionar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleRemove(product.id, item.color_value_id)}
                            disabled={isRemoving}
                          >
                            {isRemoving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {storeFavorites.length > 0 && (
          <div className="border-t px-6 py-4 bg-background">
            <Button
              onClick={handleViewAll}
              variant="outline"
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver todos os favoritos
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>

    {quickAddProduct && (
      <Suspense fallback={null}>
        <CategoryQuickAddDialog
          product={quickAddProduct}
          open={quickAddOpen}
          onOpenChange={(o) => {
            setQuickAddOpen(o);
            if (!o) setQuickAddProduct(null);
          }}
          onViewDetails={() => {
            setQuickAddOpen(false);
            onClose();
            navigate(buildPath(`/product/${quickAddProduct.slug}`));
          }}
          storeSlug={storeSlug}
        />
      </Suspense>
    )}
    </>
  );
}
