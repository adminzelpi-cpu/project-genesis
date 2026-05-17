import { useState, memo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Heart, ShoppingCart, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDecimal } from '@/lib/utils';
import { useStoreInstallmentConfig, getInstallmentDisplayText } from '../../lib/installmentDisplay';
import { cn } from '@/lib/utils';
import { useFavoriteButton } from '../favorites/useFavoriteButton';
import { useStorePath } from '@/contexts/StoreSlugContext';
import { slugifyColor } from '@/features/storefront/lib/buildStorefrontProductLink';
import { getOptimizedImageUrl, PRODUCT_CARD_SIZES } from '@/lib/imageOptimization';
import { usePrefetchProduct } from '../../hooks/usePrefetchProduct';

interface RecommendationProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  images: string[];
  _colorValueId?: string;
  _colorAttributeId?: string;
  _colorName?: string;
  _colorCode?: number;
  _productCode?: number;
}

interface RecommendationCarouselProps {
  title: string;
  products: RecommendationProduct[];
  storeSlug: string;
  storeId?: string;
  onQuickAdd?: (product: RecommendationProduct) => void;
  onAuthRequired?: (productName?: string) => void;
}

const ProductCard = memo(({ 
  product, 
  storeSlug,
  storeId,
  onQuickAdd,
  onAuthRequired
}: { 
  product: RecommendationProduct; 
  storeSlug: string;
  storeId?: string;
  onQuickAdd?: (product: RecommendationProduct) => void;
  onAuthRequired?: (productName?: string) => void;
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { buildPath } = useStorePath();

  const realProductId = product.id.includes('_color_') ? product.id.split('_color_')[0] : product.id;

  const { onMouseEnter: prefetchOnHover, onMouseLeave: cancelPrefetchHover, onPointerDown: prefetchOnTouch } = usePrefetchProduct();
  const prefetchInput = {
    productId: realProductId,
    productSlug: product.slug,
    productCode: product._productCode,
    storeId,
  };

  const { isFavorited, isProcessing, toggleFavorite } = useFavoriteButton({
    productId: realProductId,
    colorValueId: (product as any)._colorValueId,
    productName: product.name,
    onAuthRequired,
  });

  const installmentConfig = useStoreInstallmentConfig(storeSlug);

  const images = product.images && product.images.length > 0 
    ? product.images 
    : [];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const displayPrice = hasDiscount ? product.sale_price! : product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100) 
    : 0;
  const installmentText = getInstallmentDisplayText(displayPrice, installmentConfig);

  const handleProductClick = () => {
    const slugPart = product._productCode ? `${product.slug}-${product._productCode}` : product.slug;
    const baseUrl = buildPath(`/product/${slugPart}`);
    if (product._colorCode) {
      navigate(`${baseUrl}?cor=${product._colorCode}`);
    } else if (product._colorName) {
      navigate(`${baseUrl}?cor=${slugifyColor(product._colorName)}`);
    } else {
      navigate(baseUrl);
    }
  };

  return (
    <Card
      className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow rounded-none h-full"
      onMouseEnter={() => prefetchOnHover(prefetchInput)}
      onMouseLeave={() => cancelPrefetchHover(prefetchInput)}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") prefetchOnTouch(prefetchInput);
      }}
    >
      {/* Product Image */}
      <div 
        className="relative aspect-[3/4] overflow-hidden cursor-pointer rounded-none"
        onClick={handleProductClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {images.length > 0 ? (
          <img
            src={getOptimizedImageUrl(images[currentImageIndex], 400)}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 text-transparent"
            loading="lazy"
            decoding="async"
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
        {onQuickAdd && (
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
        )}

        {/* Mobile Quick Add Button */}
        {onQuickAdd && (
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
        )}
      </div>

      {/* Product Info */}
      <div className="px-2 py-3 space-y-2">
        <h3 
          className="font-medium text-sm line-clamp-2 cursor-pointer hover:underline"
          onClick={handleProductClick}
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

ProductCard.displayName = 'RecommendationProductCard';

export const RecommendationCarousel = memo(({ 
  title, 
  products, 
  storeSlug,
  storeId,
  onQuickAdd,
  onAuthRequired
}: RecommendationCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (products.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="relative">
        {/* Left Arrow - all devices */}
        {canScrollPrev && (
          <button
            onClick={scrollPrev}
            className="absolute -left-1 sm:-left-3 top-[38%] -translate-y-1/2 z-10 p-1.5 bg-background/95 backdrop-blur-sm rounded-full shadow-md border border-border hover:bg-accent transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Right Arrow - all devices */}
        {canScrollNext && (
          <button
            onClick={scrollNext}
            className="absolute -right-1 sm:-right-3 top-[38%] -translate-y-1/2 z-10 p-1.5 bg-background/95 backdrop-blur-sm rounded-full shadow-md border border-border hover:bg-accent transition-colors"
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3 md:gap-4">
            {products.map((product) => (
              <div 
                key={product.id} 
                className={cn(
                  "flex-shrink-0",
                  // Mobile: 2 items
                  "w-[calc(50%-6px)]",
                  // Tablet: 3 items
                  "sm:w-[calc(33.333%-8px)]",
                  // Desktop: 4-5 items
                  "lg:w-[calc(25%-12px)]",
                  // Large desktop: 5 items
                  "xl:w-[calc(20%-13px)]"
                )}
              >
                <ProductCard 
                  product={product} 
                  storeSlug={storeSlug}
                  storeId={storeId}
                  onQuickAdd={onQuickAdd}
                  onAuthRequired={onAuthRequired}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

RecommendationCarousel.displayName = 'RecommendationCarousel';
