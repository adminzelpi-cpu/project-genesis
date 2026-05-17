import { useState, memo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ChevronLeft, ChevronRight, ShoppingCart, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDecimal } from "@/lib/utils";
import type { CategoryProduct } from "../../types/category";
import { useFavoriteButton } from "../favorites/useFavoriteButton";
import { useStoreInstallmentConfig, getInstallmentDisplayText } from "../../lib/installmentDisplay";
import { getOptimizedImageUrl, getProductCardSrcSet, PRODUCT_CARD_SIZES } from "@/lib/imageOptimization";
import { usePrefetchProduct } from "../../hooks/usePrefetchProduct";

interface CategoryProductCardProps {
  product: CategoryProduct;
  onQuickAdd: (product: CategoryProduct) => void;
  onProductClick: (product: CategoryProduct) => void;
  onAuthRequired?: (productName?: string) => void;
  priority?: boolean;
  storeId?: string;
}

export const CategoryProductCard = memo(({ product, onQuickAdd, onProductClick, onAuthRequired, priority = false, storeId }: CategoryProductCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { prefetch, onMouseEnter: prefetchOnHover, onMouseLeave: cancelPrefetchHover, onPointerDown: prefetchOnTouch } = usePrefetchProduct();

  const prefetchInput = {
    productId: product.id.includes('_color_') ? product.id.split('_color_')[0] : product.id,
    productSlug: product.slug,
    productCode: product._productCode,
    storeId,
  };

  // IntersectionObserver — prefetch when card is ~200px from entering viewport.
  // Covers the mobile scroll case (no hover) before pointerdown fires.
  useEffect(() => {
    if (!storeId) return;
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          prefetch(prefetchInput);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, product.id]);
  
  // Extract real product UUID from virtual IDs like "uuid_color_valueId"
  const realProductId = product.id.includes('_color_') ? product.id.split('_color_')[0] : product.id;

  const { isFavorited, isProcessing, toggleFavorite } = useFavoriteButton({
    productId: realProductId,
    colorValueId: product._colorValueId,
    productName: product.name,
    onAuthRequired,
  });

  const images = product.images && product.images.length > 0 
    ? product.images 
    : [];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100) 
    : 0;
  const installmentConfig = useStoreInstallmentConfig();
  const installmentText = getInstallmentDisplayText(displayPrice, installmentConfig);

  return (
    <Card
      ref={cardRef as any}
      className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow rounded-none"
      onMouseEnter={() => prefetchOnHover(prefetchInput)}
      onMouseLeave={() => cancelPrefetchHover(prefetchInput)}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") prefetchOnTouch(prefetchInput);
      }}
    >
      {/* Product Image */}
      <div 
        className="relative aspect-[3/4] overflow-hidden cursor-pointer rounded-none"
        onClick={() => onProductClick(product)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {images.length > 0 ? (
          <img
            src={getOptimizedImageUrl(images[currentImageIndex], 400)}
            srcSet={getProductCardSrcSet(images[currentImageIndex]) || undefined}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 text-transparent"
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : undefined}
            sizes={PRODUCT_CARD_SIZES}
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        
        {/* Discount Badge - Top Left */}
        {hasDiscount && (
          <Badge 
            className="absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 bg-[hsl(var(--store-secondary))] text-[hsl(var(--store-secondary-foreground))] hover:bg-[hsl(var(--store-secondary))]"
          >
            -{discountPercentage}%
          </Badge>
        )}

        {/* Wishlist Icon - Top Right */}
        <button
          className={`absolute top-2 right-2 p-2 bg-background/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-background hover:scale-105 active:scale-95 transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100 ${isHovered ? 'opacity-100' : 'opacity-100 lg:opacity-0'}`}
          aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          disabled={isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite();
          }}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Heart 
              className={`h-4 w-4 transition-all duration-200 ${
                isFavorited 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-foreground hover:text-red-500'
              }`}
            />
          )}
        </button>

        {/* Image Navigation Arrows - Desktop Only */}
        {images.length > 1 && (
          <div className="hidden lg:block">
            <button
              onClick={handlePrevImage}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-background transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNextImage}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-background/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-background transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Desktop Quick Add Button */}
        <div className="hidden lg:block">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-background text-foreground hover:bg-background/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_25px_rgba(0,0,0,0.2)] transition-all w-[calc(100%-2rem)] ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
            size="lg"
          >
            Compra Rápida
          </Button>
        </div>

        {/* Mobile Quick Add Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(product);
          }}
          className="lg:hidden absolute bottom-2 right-2 p-2 bg-background rounded-full shadow-sm hover:bg-accent transition-colors"
          aria-label="Adicionar rápido"
        >
          <div className="relative">
            <ShoppingCart className="h-4 w-4" />
            <Plus className="h-2.5 w-2.5 absolute -top-1 -right-1 bg-background rounded-full" />
          </div>
        </button>
      </div>

      {/* Product Info */}
      <div className="px-2 py-3 space-y-2">
        <h3 
          className="font-medium text-sm line-clamp-2 cursor-pointer hover:underline"
          onClick={() => onProductClick(product)}
        >
          {product.name}
        </h3>
        
        {/* Prices */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasDiscount && (
            <p className="text-xs text-muted-foreground line-through whitespace-nowrap">
              {formatCurrency(product.price)}
            </p>
          )}
          <p className="text-base font-semibold text-foreground whitespace-nowrap">
            {formatCurrency(displayPrice)}
          </p>
        </div>
        
        {/* Installment Info */}
        {installmentText && (
          <p className="text-xs text-muted-foreground">
            {installmentText}
          </p>
        )}
      </div>
    </Card>
  );
});

CategoryProductCard.displayName = "CategoryProductCard";
