import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useCart } from "@/contexts/CartContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { Trash2, ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, AlertTriangle, ShoppingCart } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { formatCurrency } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from "@/components/ui/carousel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMiniCartRecommendations } from "@/features/storefront/hooks/useMiniCartRecommendations";

import { buildStorefrontProductLink } from "@/features/storefront/lib/buildStorefrontProductLink";
import { useCartStockValidation } from "@/features/checkout/hooks/useCartStockValidation";
import { useUndoableCartRemove } from "@/hooks/useUndoableCartRemove";
import { trackAddToCart } from "@/features/tracking/lib/trackEvent";
import { getProductRetailerId } from "@/features/tracking/lib/retailerId";

const CategoryQuickAddDialog = lazy(() => 
  import('@/features/storefront/components/category/CategoryQuickAddDialog').then(mod => ({ default: mod.CategoryQuickAddDialog }))
);

interface MiniCartProps {
  open: boolean;
  onClose: () => void;
}

export default function MiniCart({ open, onClose }: MiniCartProps) {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, total, addItem } = useCart();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [quickAddProduct, setQuickAddProduct] = useState<typeof recommendations[0] | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  const { handleRemoveWithUndo } = useUndoableCartRemove();

  // Stock validation
  const { stockIssues, isValidating: isValidatingStock, hasStockIssues, getItemStockIssue } = useCartStockValidation(items, open);

  // Fetch store with free_shipping_threshold
  const { data: store } = useQuery({
    queryKey: ['store-mini-cart', storeSlug],
    queryFn: async () => {
      if (!storeSlug) return null;
      const { data } = await supabase
        .from('stores')
        .select('id, free_shipping_threshold, currency')
        .eq('slug', storeSlug)
        .single();
      return data;
    },
    enabled: !!storeSlug,
    staleTime: 10 * 60 * 1000,
  });

  // Use dynamic threshold from store settings (default to null/disabled if not set)
  const freeShippingThreshold = store?.free_shipping_threshold ?? null;

  // Cart items with info for recommendation exclusion
  const cartItemsForRecommendations = useMemo(() => 
    items.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      variationId: item.variationId,
      colorCode: item.colorCode,
      color: item.color,
    })),
    [items]
  );

  // Get intelligent recommendations (when cart has items)
  const { recommendations, isLoading: recommendationsLoading } = useMiniCartRecommendations({
    storeId: store?.id,
    cartItems: cartItemsForRecommendations,
    maxProducts: 5,
  });


  // Only calculate if threshold is set
  const remainingForFreeShipping = freeShippingThreshold ? Math.max(0, freeShippingThreshold - total) : null;
  const progressPercentage = freeShippingThreshold ? Math.min(100, (total / freeShippingThreshold) * 100) : 0;
  const hasFreeShipping = freeShippingThreshold !== null && total >= freeShippingThreshold;

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const getItemKey = (item: { id: string; variant?: string; variationId?: string }) => 
    item.variationId || `${item.id}-${item.variant || ''}`;

  const handleQuantityChange = useCallback((item: { id: string; variant?: string; variationId?: string }, newQuantity: number) => {
    const key = getItemKey(item);
    setLoadingItems(prev => ({ ...prev, [key]: true }));
    
    setTimeout(() => {
      updateQuantity(item.id, newQuantity, item.variant, item.variationId);
      setLoadingItems(prev => ({ ...prev, [key]: false }));
    }, 300);
  }, [updateQuantity]);


  const handleCheckout = async () => {
    setIsNavigating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onClose();
    navigate(buildPath("/checkout"));
  };

  const handleAddRecommended = async (product: typeof recommendations[0]) => {
    setAddingProductId(product.id);
    
    // Check if product has variations
    const realId = product.id.includes('_color_') ? product.id.split('_color_')[0] : product.id;
    const { count } = await supabase
      .from('product_variations_v2')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', realId)
      .eq('is_active', true);
    
    if (count && count > 0) {
      // Has variations — open quick add dialog
      setAddingProductId(null);
      setQuickAddProduct(product);
      setQuickAddOpen(true);
    } else {
      // No variations — add directly
      const finalPrice = product.sale_price || product.price;
      addItem({
        id: product.id,
        name: product.name,
        price: finalPrice,
        image: product.images[0] || '/placeholder.svg',
        productCode: (product as any).product_code,
      });
      trackAddToCart({
        id: getProductRetailerId(product as any),
        name: product.name,
        price: finalPrice,
        quantity: 1,
        currency: (store as any)?.currency || 'BRL',
      }, store?.id);
      await new Promise(resolve => setTimeout(resolve, 600));
      setAddingProductId(null);
    }
  };

  const handleProductClick = (product: typeof recommendations[0]) => {
    onClose();
    const link = buildStorefrontProductLink({
      storeSlug: storeSlug || '',
      productSlug: product.slug,
      productCode: product._productCode,
      colorCode: product._colorCode,
      color: product._colorName,
      buildPath,
    });
    // Use replace + navigate to force React Router to detect the change
    // even when navigating to the same product with a different color
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath === link) {
      // Exact same URL – just scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(link);
    }
  };

  return (
    <>
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      modal={false}
    >
      {/* Overlay manual para modal={false} */}
      {open && (
        <div 
          className="fixed inset-0 z-[49] bg-black/80 animate-in fade-in-0" 
          onClick={onClose}
        />
      )}
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col z-[50]">
        {/* Header com barra de frete grátis fixa */}
        <div className="px-6 pt-4 pb-3 border-b">
          <h2 className="text-lg font-semibold mb-2">
            Meu Carrinho {items.length > 0 && <span className="text-muted-foreground font-normal">({items.reduce((acc, item) => acc + item.quantity, 0)})</span>}
          </h2>
          
          {/* Barra de progresso para frete grátis - só mostra se threshold estiver configurado */}
          {freeShippingThreshold !== null && (
            remainingForFreeShipping && remainingForFreeShipping > 0 ? (
              <div>
                <p className="text-sm text-muted-foreground mb-1.5">
                  Faltam <span className="font-bold text-foreground">{formatCurrency(remainingForFreeShipping)}</span> para frete grátis
                </p>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            ) : (
              <div>
                <p className="text-sm text-success font-medium mb-1.5">
                  Você ganhou frete grátis! 🎉
                </p>
                <Progress value={100} className="h-2" />
              </div>
            )
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-3 pb-0">

            {/* Items no carrinho */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-16 w-16 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground mb-6">Seu carrinho está vazio</p>
                <Button 
                  onClick={() => {
                    onClose();
                    navigate(buildPath('/search'));
                  }} 
                  className="w-full bg-[hsl(var(--store-button,var(--store-primary)))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground)))] font-semibold"
                  style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
                >
                  Ver todos os produtos
                </Button>
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {items.map((item) => {
                  const key = getItemKey(item);
                  const isDeleting = false;
                  const isUpdating = loadingItems[key];
                  const stockIssue = getItemStockIssue(item.id, item.variationId);

                  const productLink = storeSlug
                    ? buildStorefrontProductLink({
                        storeSlug,
                        productSlug: item.slug || item.id,
                        productCode: item.productCode,
                        colorCode: item.colorCode,
                        color: !item.colorCode ? item.color : undefined,
                        buildPath,
                      })
                    : "/";
                  
                  return (
                    <div 
                      key={key} 
                      className={`flex gap-3 pb-4 border-b transition-all duration-300 ${
                        isDeleting ? 'opacity-50 scale-95 pointer-events-none' : ''
                      } ${stockIssue ? 'bg-destructive/5 -mx-2 px-2 py-2 rounded-lg' : ''}`}
                    >
                      <Link 
                        to={productLink}
                        onClick={onClose}
                        className="flex-shrink-0 relative"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}
                          className={`w-20 h-20 object-contain hover:opacity-80 transition-opacity ${
                            stockIssue && stockIssue.available === 0 ? 'opacity-50' : ''
                          }`}
                        />
                        {stockIssue && stockIssue.available === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                            <span className="text-[10px] font-bold text-destructive uppercase">Esgotado</span>
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0 pr-1">
                        <Link 
                          to={productLink}
                          onClick={onClose}
                          className="block"
                        >
                          <h3 className="font-medium text-sm mb-1 line-clamp-2 leading-tight hover:text-primary transition-colors">{item.name}</h3>
                        </Link>
                        {(item.color || item.size) && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {[item.color, item.size].filter(Boolean).join(' / ')}
                          </p>
                        )}
                        {item.variant && !item.color && !item.size && (
                          <p className="text-sm text-muted-foreground mb-2">{item.variant}</p>
                        )}
                        {stockIssue ? (
                          <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            {stockIssue.available === 0 ? (
                              <span>Produto esgotado</span>
                            ) : (
                              <span>Apenas {stockIssue.available} disponível(is)</span>
                            )}
                          </div>
                        ) : (
                          <QuantitySelector
                            value={item.quantity}
                            onChange={(value) => handleQuantityChange(item, value)}
                            size="sm"
                            isLoading={isUpdating}
                          />
                        )}
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRemoveWithUndo(item)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                        <p className={`font-bold text-sm ${stockIssue && stockIssue.available === 0 ? 'line-through text-muted-foreground' : ''}`}>{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Produtos Recomendados - Inteligente */}
            {items.length > 0 && recommendations.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h3 className="text-base font-semibold">Combine com seu pedido</h3>
                </div>
                
                {/* Área do carrossel com borda */}
                <div className="border rounded-lg p-4 mb-3">
                  <Carousel
                    setApi={setApi}
                    className="w-full"
                    opts={{
                      align: "start",
                      loop: recommendations.length > 1,
                    }}
                  >
                    <CarouselContent>
                      {recommendations.map((product) => {
                        const isAdding = addingProductId === product.id;
                        const hasDiscount = product.sale_price && product.sale_price < product.price;
                        
                        return (
                          <CarouselItem key={product.id}>
                            <div className="flex gap-4">
                              <button
                                onClick={() => handleProductClick(product)}
                                className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary rounded-md"
                              >
                                <img
                                  src={product.images[0] || '/placeholder.svg'}
                                  alt={product.name}
                                  style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}
                                  className="w-24 h-24 object-contain hover:opacity-80 transition-opacity"
                                />
                              </button>
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => handleProductClick(product)}
                                  className="text-left focus:outline-none"
                                >
                                  <h4 className="font-medium text-sm mb-1 line-clamp-2 hover:text-primary transition-colors">
                                    {product.name}
                                  </h4>
                                </button>
                                <div className="mb-3">
                                  {hasDiscount ? (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xs text-muted-foreground line-through">
                                        {formatCurrency(product.price)}
                                      </span>
                                      <span className="text-lg font-bold text-green-600">
                                        {formatCurrency(product.sale_price!)}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-lg font-bold">
                                      {formatCurrency(product.price)}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-9"
                                  onClick={() => handleAddRecommended(product)}
                                  disabled={isAdding}
                                >
                                  {isAdding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Adicionar
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                </div>

                {/* Controles externos - fora da borda, abaixo */}
                {recommendations.length > 1 && (
                  <div className="flex items-center justify-between px-1">
                    {/* Indicadores de slide à esquerda */}
                    <div className="flex gap-1.5">
                      {recommendations.map((_, index) => (
                        <div
                          key={index}
                          className={`h-2 rounded-full transition-all ${
                            index === current
                              ? "w-6 bg-foreground"
                              : "w-2 bg-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Setas de navegação à direita */}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => api?.scrollPrev()}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => api?.scrollNext()}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer fixo */}
        {items.length > 0 && (
          <div className="border-t px-6 py-2.5 bg-background">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Subtotal</span>
              <span className="text-xl font-bold">{formatCurrency(total)}</span>
            </div>
            
            {hasStockIssues && (
              <div className="flex items-center gap-2 p-2.5 mb-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Remova os itens esgotados para finalizar.</span>
              </div>
            )}

            <Button
              onClick={handleCheckout}
              disabled={isNavigating || hasStockIssues}
              className="w-full h-11 text-sm font-bold mb-2 bg-[hsl(var(--store-button,var(--store-primary)))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground)))]"
              style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
            >
              {isNavigating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  PROCESSANDO...
                </>
              ) : (
                "FINALIZAR COMPRA"
              )}
            </Button>

            <button
              onClick={onClose}
              className="block w-full text-center text-sm text-muted-foreground underline hover:text-foreground"
            >
              continuar comprando
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>

    {quickAddProduct && (
      <Suspense fallback={null}>
        <CategoryQuickAddDialog
          product={{
            id: quickAddProduct.id,
            name: quickAddProduct.name,
            slug: quickAddProduct.slug,
            price: quickAddProduct.price,
            sale_price: quickAddProduct.sale_price,
            images: quickAddProduct.images,
            _colorName: quickAddProduct._colorName,
            _colorCode: quickAddProduct._colorCode,
            _productCode: quickAddProduct._productCode,
            _colorValueId: quickAddProduct._colorValueId,
            _colorAttributeId: quickAddProduct._colorAttributeId,
          }}
          open={quickAddOpen}
          onOpenChange={(open) => {
            setQuickAddOpen(open);
            if (!open) setQuickAddProduct(null);
          }}
          onViewDetails={() => {
            setQuickAddOpen(false);
            setQuickAddProduct(null);
            handleProductClick(quickAddProduct);
          }}
          storeSlug={storeSlug || ''}
        />
      </Suspense>
    )}
    </>
  );
}
