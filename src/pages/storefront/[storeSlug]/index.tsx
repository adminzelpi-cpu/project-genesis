import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { useStorefrontHome, SectionWithDetails } from "@/features/storefront/hooks/useHomeSections";
import { useRecentlyViewed } from "@/features/storefront/hooks/useRecentlyViewed";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { CategoryProductCard } from "@/features/storefront/components/category/CategoryProductCard";
import { CategoryQuickAddDialog } from "@/features/storefront/components/category/CategoryQuickAddDialog";
import { RecommendationCarousel } from "@/features/storefront/components/recommendations/RecommendationCarousel";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { TrackingScripts } from "@/features/tracking/components/TrackingScripts";
import { LGPDBanner } from "@/features/lgpd/components/LGPDBanner";
import { trackPageView } from "@/features/tracking/lib/trackEvent";
import { StorefrontMeta } from "@/features/storefront/components/layout/StorefrontMeta";
import { AuthModal } from "@/features/storefront/components/favorites";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCardSkeleton } from "@/features/storefront/components/skeletons";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryProduct } from "@/features/storefront/types/category";
import { slugifyColor } from "@/features/storefront/lib/buildStorefrontProductLink";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";

interface SectionSettings {
  carousel_autoplay?: boolean;
  carousel_autoplay_interval?: number;
  carousel_visible_mobile?: number;
  carousel_visible_tablet?: number;
  carousel_visible_desktop?: number;
  banner_height_desktop?: number;
  banner_height_mobile?: number;
  category_image_aspect?: '1:1' | '3:4' | '2:3';
  title_alignment?: 'left' | 'center' | 'right';
  show_button?: boolean;
  button_text?: string;
  button_link?: string;
}

// Component for Banner Carousel with autoplay
function BannerCarousel({ section, storeSlug }: { section: SectionWithDetails; storeSlug: string }) {
  const { buildPath } = useStorePath();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  
  const banners = section.banners || [];
  const settings = (section.settings || {}) as SectionSettings;
  const autoplay = settings.carousel_autoplay !== false;
  const interval = settings.carousel_autoplay_interval || 5000;
  const heightDesktop = settings.banner_height_desktop || 500;
  const heightMobile = settings.banner_height_mobile || 400;
  
  useEffect(() => {
    if (!api) return;
    
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Autoplay logic
  useEffect(() => {
    if (!api || !autoplay || banners.length <= 1) return;
    
    const timer = setInterval(() => {
      api.scrollNext();
    }, interval);
    
    return () => clearInterval(timer);
  }, [api, autoplay, interval, banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="w-full relative">
      <Carousel 
        setApi={setApi} 
        className="w-full"
        opts={{ loop: true }}
      >
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              <div className="relative w-full overflow-hidden">
                {/* Desktop: object-contain para mostrar imagem inteira | Mobile: object-cover para preencher sem espaços */}
                <div className="relative w-full bg-muted">
                  {/* Mobile */}
                  <div 
                    className="block sm:hidden relative" 
                    style={{ height: `${heightMobile}px` }}
                  >
                    <img
                      src={banner.image_url_mobile || banner.image_url}
                      alt={banner.title || "Banner"}
                      className="absolute inset-0 w-full h-full object-cover"
                      sizes="100vw"
                      loading={banners.indexOf(banner) === 0 ? "eager" : "lazy"}
                      decoding={banners.indexOf(banner) === 0 ? "sync" : "async"}
                      fetchPriority={banners.indexOf(banner) === 0 ? "high" : undefined}
                    />
                  </div>
                  {/* Desktop */}
                  <div 
                    className="hidden sm:block relative" 
                    style={{ height: `${heightDesktop}px` }}
                  >
                    <img
                      src={getOptimizedImageUrl(banner.image_url, 1920)}
                      alt={banner.title || "Banner"}
                      className="absolute inset-0 w-full h-full object-cover"
                      sizes="100vw"
                      loading={banners.indexOf(banner) === 0 ? "eager" : "lazy"}
                      decoding={banners.indexOf(banner) === 0 ? "sync" : "async"}
                      fetchPriority={banners.indexOf(banner) === 0 ? "high" : undefined}
                    />
                  </div>

                  {/* Textos e botões com cores configuráveis */}
                  {(banner.title || banner.subtitle || banner.button_text) && (
                    <div className={`absolute inset-0 flex items-center ${
                      (banner as any).text_position === 'center' ? 'justify-center text-center' :
                      (banner as any).text_position === 'right' ? 'justify-end text-right' :
                      'justify-start text-left'
                    }`}>
                      <div className={`container mx-auto px-8 sm:px-6 md:px-8 ${
                        (banner as any).text_position === 'center' ? 'flex flex-col items-center' :
                        (banner as any).text_position === 'right' ? 'flex flex-col items-end' :
                        ''
                      }`}>
                        <div className={`w-[78%] sm:w-auto sm:max-w-xl space-y-2 sm:space-y-3 ${
                          (banner as any).text_position === 'center' ? 'items-center text-center' :
                          (banner as any).text_position === 'right' ? 'text-right' :
                          'text-left'
                        }`}>
                          {banner.title && (
                            <h2 
                              className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold leading-tight" 
                              style={{ color: (banner as any).title_color || '#ffffff' }}
                            >
                              {banner.title}
                            </h2>
                          )}
                          {banner.subtitle && (
                            <p 
                              className="text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed sm:max-w-md"
                              style={{ color: (banner as any).subtitle_color || '#ffffffcc' }}
                            >
                              {banner.subtitle}
                            </p>
                          )}
                          {banner.button_text && banner.button_link && (
                            <div className="pt-1 sm:pt-2">
                              <Link to={buildPath(`${banner.button_link.startsWith('/') ? '' : '/'}${banner.button_link}`)}>
                                {(banner as any).button_style === 'outline' ? (
                                  <Button 
                                    size="lg" 
                                    className="font-semibold text-sm sm:text-base px-6 sm:px-8 transition-opacity duration-200 hover:opacity-80"
                                    style={{ 
                                      backgroundColor: 'transparent',
                                      color: (banner as any).button_text_color || '#ffffff',
                                      border: `2px solid ${(banner as any).button_border_color || '#ffffff'}`,
                                    }}
                                  >
                                    {banner.button_text}
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button 
                                    size="lg" 
                                    className="font-semibold text-sm sm:text-base px-6 sm:px-8 transition-opacity duration-200 hover:opacity-85"
                                    style={{ 
                                      backgroundColor: (banner as any).button_bg_color || '#000000',
                                      color: (banner as any).button_text_color || '#ffffff',
                                    }}
                                  >
                                    {banner.button_text}
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                  </Button>
                                )}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {banners.length > 1 && (
          <>
            <CarouselPrevious className="left-1 sm:left-4 h-8 w-8 sm:h-10 sm:w-10 bg-black/30 sm:bg-background/60 hover:bg-black/50 sm:hover:bg-background/80 border-0 text-white sm:text-foreground backdrop-blur-sm sm:backdrop-blur drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:drop-shadow-none" />
            <CarouselNext className="right-1 sm:right-4 h-8 w-8 sm:h-10 sm:w-10 bg-black/30 sm:bg-background/60 hover:bg-black/50 sm:hover:bg-background/80 border-0 text-white sm:text-foreground backdrop-blur-sm sm:backdrop-blur drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] sm:drop-shadow-none" />
            
            {/* Dots indicator */}
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  aria-label={`Ir para banner ${index + 1}`}
                  className={`min-w-[24px] min-h-[24px] flex items-center justify-center p-1`}
                >
                  <span className={`block h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                    current === index 
                      ? 'w-6 sm:w-8 bg-foreground' 
                      : 'w-1.5 sm:w-2 bg-foreground/50 hover:bg-foreground/70'
                  }`} />
                </button>
              ))}
            </div>
          </>
        )}
      </Carousel>
    </section>
  );
}

// Component for Featured Categories with carousel
function FeaturedCategories({ section, storeSlug, storeId }: { section: SectionWithDetails; storeSlug: string; storeId: string }) {
  const { buildPath } = useStorePath();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [snapCount, setSnapCount] = useState(0);
  const [selectedSnap, setSelectedSnap] = useState(0);
  
  const settings = (section.settings || {}) as SectionSettings;
  const alignment = settings.title_alignment || 'left';
  const imageAspect = settings.category_image_aspect || '3:4';
  const aspectClass = imageAspect === '1:1' ? 'aspect-square' : imageAspect === '2:3' ? 'aspect-[2/3]' : 'aspect-[3/4]';

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setSnapCount(api.scrollSnapList().length);
      setSelectedSnap(api.selectedScrollSnap());
    };
    update();
    api.on('select', update);
    api.on('reInit', update);
  }, [api, categories.length]);

  useEffect(() => {
    const loadCategories = async () => {
      const categoryIds = section.items?.map(i => i.item_id) || [];
      if (categoryIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get categories with custom data from items
      const { data } = await supabase
        .from('product_categories')
        .select('*')
        .in('id', categoryIds)
        .eq('is_active', true);

      // Merge with item custom data
      const categoriesWithCustom = (data || []).map(cat => {
        const item = section.items?.find(i => i.item_id === cat.id) as any;
        return {
          ...cat,
          custom_image_url: item?.custom_image_url,
          custom_title: item?.custom_title,
          custom_subtitle: item?.custom_subtitle,
          custom_button_text: item?.custom_button_text,
          custom_button_link: item?.custom_button_link,
          title_color: item?.title_color,
          subtitle_color: item?.subtitle_color,
          button_style: item?.button_style,
          button_border_color: item?.button_border_color,
          button_bg_color: item?.button_bg_color,
          button_text_color: item?.button_text_color,
        };
      });

      setCategories(categoriesWithCustom);
      setLoading(false);
    };
    loadCategories();
  }, [section.items, storeId]);

  if (loading) {
    return (
      <section className="py-8 sm:py-12 lg:py-16 min-h-[400px]">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-6 sm:mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="aspect-[3/4]" style={{ borderRadius: 'var(--store-element-radius)' }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment];

  return (
    <section className="py-8 sm:py-12 lg:py-16">
      <div className="container mx-auto px-4">
        {section.title && (
          <div className={`mb-6 sm:mb-8 ${alignmentClass}`}>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{section.title}</h2>
            {section.subtitle && (
              <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2">{section.subtitle}</p>
            )}
          </div>
        )}
        
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3 sm:-ml-4">
            {categories.map((category) => {
              const displayImage = category.custom_image_url;
              const displayTitle = category.custom_title || category.name;
              const displaySubtitle = category.custom_subtitle;
              const displayButtonText = category.custom_button_text;
              const link = category.custom_button_link || buildPath(`/category/${category.slug}`);
              const titleColor = category.title_color || '#ffffff';
              const subtitleColor = category.subtitle_color || '#ffffffcc';
              const buttonStyle = category.button_style || 'solid';
              const buttonBgColor = category.button_bg_color || '#000000';
              const buttonTextColor = category.button_text_color || '#ffffff';
              const buttonBorderColor = category.button_border_color || '#ffffff';
              
              return (
                <CarouselItem 
                  key={category.id} 
                  className="pl-3 sm:pl-4 basis-[77%] sm:basis-[40%] md:basis-[25%]"
                >
                  <Link
                    to={link.startsWith('/store') ? link : (link.startsWith('/') ? buildPath(link) : link)}
                    className={`group block relative overflow-hidden bg-muted ${aspectClass}`}
                    style={{ borderRadius: 'var(--store-element-radius)' }}
                  >
                    {displayImage ? (
                      <img 
                        src={getOptimizedImageUrl(displayImage, 400)} 
                        alt={displayTitle}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
                    )}
                    
                    {/* Overlay e texto posicionados sobre a imagem */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                      <h3 
                        className="font-bold text-base sm:text-lg md:text-xl group-hover:underline underline-offset-2"
                        style={{ color: titleColor }}
                      >
                        {displayTitle}
                      </h3>
                      {displaySubtitle && (
                        <p 
                          className="text-xs sm:text-sm mt-0.5"
                          style={{ color: subtitleColor }}
                        >
                          {displaySubtitle}
                        </p>
                      )}
                      {displayButtonText && (
                        <div className="mt-2">
                          {buttonStyle === 'outline' ? (
                            <span 
                              className="inline-flex items-center px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md"
                              style={{ 
                                backgroundColor: 'transparent',
                                color: buttonTextColor,
                                border: `2px solid ${buttonBorderColor}`,
                              }}
                            >
                              {displayButtonText}
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-md"
                              style={{ 
                                backgroundColor: buttonBgColor,
                                color: buttonTextColor,
                              }}
                            >
                              {displayButtonText}
                              <ChevronRight className="ml-1 h-3 w-3" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          
          {categories.length > 4 && (
            <>
              <CarouselPrevious className="-left-3 sm:-left-4 hidden sm:flex" />
              <CarouselNext className="-right-3 sm:-right-4 hidden sm:flex" />
            </>
          )}
        </Carousel>

        {/* Dots indicator (mobile/tablet) */}
        {snapCount > 1 && (
          <div className="flex sm:hidden justify-center gap-1.5 mt-4">
            {Array.from({ length: snapCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Ir para slide ${index + 1}`}
                className="min-w-[24px] min-h-[24px] flex items-center justify-center p-1"
              >
                <span className={`block h-1.5 rounded-full transition-all duration-300 ${
                  selectedSnap === index
                    ? 'w-6 bg-foreground'
                    : 'w-1.5 bg-foreground/40 hover:bg-foreground/60'
                }`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Component for Product Sections with carousel
function ProductSection({ 
  section, 
  storeSlug, 
  storeId,
  onQuickAdd,
  onProductClick,
  onAuthRequired,
}: { 
  section: SectionWithDetails; 
  storeSlug: string; 
  storeId: string;
  onQuickAdd: (product: CategoryProduct) => void;
  onProductClick: (product: CategoryProduct) => void;
  onAuthRequired?: (productName?: string) => void;
}) {
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  const settings = (section.settings || {}) as SectionSettings;
  const { buildPath } = useStorePath();
  const alignment = settings.title_alignment || 'left';
  const showButton = settings.show_button !== false;
  const buttonText = settings.button_text || 'Ver todos';

  useEffect(() => {
    const loadProducts = async () => {
      const productIds = section.items?.map(i => i.item_id) || [];
      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch products with display settings
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, price, sale_price, images, category_id, display_variations_separately, hide_parent_product, product_code')
        .in('id', productIds)
        .eq('is_active', true);

      if (!data || data.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Fetch variations for separation
      const { data: variations } = await supabase
        .from('product_variations_v2')
        .select('id, product_id, price, sale_price, image_url, images, attributes')
        .in('product_id', productIds)
        .eq('is_active', true);

      // Fetch attributes to find color attribute
      const { data: attributes } = await supabase
        .from('attributes')
        .select('id, name, type')
        .eq('store_id', storeId);

      // Fetch attribute values filtered by store's attributes
      const attrIds = (attributes || []).map((a: any) => a.id);
      const { data: attributeValues } = attrIds.length > 0
        ? await supabase.from('attribute_values').select('id, value, attribute_id, color_hex').in('attribute_id', attrIds)
        : { data: [] as any[] };

      const { findVisualAttributeId } = await import('@/features/storefront/lib/visualAttributeUtils');
      const colorAttributeId = findVisualAttributeId((attributes || []).map((a: any) => ({ id: a.id, type: a.type, name: a.name })));
      const valueMap = new Map((attributeValues || []).map((v: any) => [v.id, v]));

      // Apply separation logic
      const { separateProductsByColor } = await import('@/features/storefront/hooks/useProductSeparation');
      const separated = separateProductsByColor(data, variations || [], colorAttributeId, valueMap);

      // Build a set of allowed keys from section items
      // If an item has color_value_id, only that specific color should show
      // If no color_value_id, show all separated colors for that product (backward compat)
      const itemsWithColor = (section.items || []).filter(i => i.color_value_id);
      const itemsWithoutColor = (section.items || []).filter(i => !i.color_value_id);
      const allowedColorKeys = new Set(itemsWithColor.map(i => `${i.item_id}_color_${i.color_value_id}`));
      const allowedProductIds = new Set(itemsWithoutColor.map(i => i.item_id));

      const filteredSeparated = separated.filter(p => {
        // For color-specific items: match the composite key
        if (p._colorValueId) {
          const realProductId = p.id.replace(/_color_.*$/, '');
          const colorKey = `${realProductId}_color_${p._colorValueId}`;
          if (allowedColorKeys.has(colorKey)) return true;
          // Also allow if the product was added without color filter (backward compat)
          return allowedProductIds.has(realProductId);
        }
        // For non-separated products
        return allowedProductIds.has(p.id);
      });

      const categoryProducts: CategoryProduct[] = filteredSeparated.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: Number(p.price),
        sale_price: p.sale_price ? Number(p.sale_price) : undefined,
        images: p.images,
        category_id: p.category_id || undefined,
        _colorValueId: p._colorValueId,
        _colorAttributeId: p._colorAttributeId,
        _colorName: p._colorName,
        _colorCode: p._colorCode,
        _productCode: p._productCode,
      }));

      setProducts(categoryProducts);
      setLoading(false);
    };
    loadProducts();
  }, [section.items, storeId]);

  if (loading) {
    return (
      <section className="py-8 sm:py-12 lg:py-16 min-h-[400px]">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-6 sm:mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  const alignmentClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment];

  // Transform products for RecommendationCarousel format
  const recommendationProducts = products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    sale_price: p.sale_price,
    images: Array.isArray(p.images) ? p.images as string[] : [],
    _colorValueId: p._colorValueId,
    _colorAttributeId: p._colorAttributeId,
    _colorName: p._colorName,
    _colorCode: p._colorCode,
    _productCode: p._productCode,
  }));

  return (
    <section className="py-8 sm:py-12 lg:py-16">
      <div className="container mx-auto px-4">
        <RecommendationCarousel
          title={section.title || (section.section_type === 'new_arrivals' ? 'Novidades' : 'Produtos em Destaque')}
          products={recommendationProducts}
          storeSlug={storeSlug}
          storeId={storeId}
          onQuickAdd={(product) => onQuickAdd(product as unknown as CategoryProduct)}
          onAuthRequired={onAuthRequired}
        />
        
        {/* "See all" button */}
        {showButton && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" asChild>
              <Link to={settings.button_link || buildPath(`/`)}>
                {buttonText} <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Storefront() {
  const storeSlug = useStoreSlug();
  const navigate = useNavigate();
  const { store, products, isLoading } = useStorefront(storeSlug);
  const { buildPath } = useStorePath();
  const { sections, isLoading: sectionsLoading } = useStorefrontHome(store?.id);
  const { getRecentlyViewed, hasRecentlyViewed } = useRecentlyViewed(store?.id);
  const [quickAddProduct, setQuickAddProduct] = useState<CategoryProduct | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authProductName, setAuthProductName] = useState<string | undefined>();

  // Recently viewed products formatted for RecommendationCarousel
  const recentlyViewedProducts = useMemo(() => {
    if (!hasRecentlyViewed) return [];
    return getRecentlyViewed([], 12).map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      sale_price: p.sale_price,
      images: p.images,
      _colorCode: p.colorCode ?? undefined,
      _productCode: p.productCode ?? undefined,
      _colorValueId: p.colorValueId ?? undefined,
      _colorAttributeId: p.colorAttributeId ?? undefined,
      _colorName: p.colorName ?? undefined,
    }));
  }, [hasRecentlyViewed, getRecentlyViewed]);

  const handleAuthRequired = useCallback((productName?: string) => {
    setAuthProductName(productName);
    setAuthModalOpen(true);
  }, []);
  useEffect(() => {
    if (store?.id) {
      trackPageView(store.id);
    }
  }, [store?.id]);

  const handleProductClick = (product: CategoryProduct) => {
    const slug = product._productCode 
      ? `${product.slug}-${product._productCode}` 
      : product.slug;
    const baseUrl = buildPath(`/product/${slug}`);
    if (product._colorCode != null) {
      navigate(`${baseUrl}?cor=${product._colorCode}`);
    } else if (product._colorName) {
      navigate(`${baseUrl}?cor=${slugifyColor(product._colorName)}`);
    } else {
      navigate(baseUrl);
    }
  };

  const handleQuickAdd = (product: CategoryProduct) => {
    setQuickAddProduct(product);
  };

  const handleViewDetails = () => {
    if (quickAddProduct) {
      const slugPart = quickAddProduct._productCode 
        ? `${quickAddProduct.slug}-${quickAddProduct._productCode}` 
        : quickAddProduct.slug;
      const baseUrl = buildPath(`/product/${slugPart}`);
      if (quickAddProduct._colorCode != null) {
        navigate(`${baseUrl}?cor=${quickAddProduct._colorCode}`);
      } else if (quickAddProduct._colorName) {
        navigate(`${baseUrl}?cor=${slugifyColor(quickAddProduct._colorName)}`);
      } else {
        navigate(baseUrl);
      }
      setQuickAddProduct(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Banner skeleton matching real banner heights to prevent CLS */}
        <div className="w-full bg-muted">
          <div className="block sm:hidden" style={{ height: '400px' }} />
          <div className="hidden sm:block" style={{ height: '500px' }} />
        </div>
        {/* Categories skeleton */}
        <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16 space-y-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2].map(i => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        </div>
        {/* Products skeleton — espelha o card real (CategoryProductCard) */}
        <div className="container mx-auto px-4 pb-8 space-y-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loja não encontrada</h1>
          <p className="text-muted-foreground">A loja que você procura não existe ou está inativa.</p>
        </div>
      </div>
    );
  }

  const hasSections = sections.length > 0;

  // Transform products to CategoryProduct format
  const categoryProducts: CategoryProduct[] = (products || []).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    sale_price: product.sale_price ? Number(product.sale_price) : undefined,
    images: Array.isArray(product.images) ? product.images as string[] : [],
    category_id: product.category_id || undefined,
  }));

  return (
    <StoreThemeProvider 
      primaryColor={store.theme_primary_color} 
      secondaryColor={store.theme_secondary_color}
      buttonColor={store.button_color}
      buttonHoverColor={store.button_hover_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      buttonBorderRadius={store.button_border_radius}
      elementBorderRadius={(store as any).element_border_radius}
      faviconUrl={(store as any).favicon_url}
      fontFamily={(store as any).font_family}
    >
      {/* SEO Meta Tags */}
      <StorefrontMeta
        title={(store as any).meta_title || store.name}
        description={(store as any).meta_description || (store as any).description || `Loja oficial ${store.name}. Confira nossos produtos e ofertas.`}
        ogImage={store.logo_url || undefined}
        ogUrl={`https://zelpi.com.br/store/${storeSlug}`}
        faviconUrl={(store as any).favicon_url}
      />
      {/* Tracking Scripts Injection */}
      <TrackingScripts storeId={store.id} />
      {/* LGPD Cookie Banner */}
      <LGPDBanner storeId={store.id} storeSlug={storeSlug} />
      
      <div className="min-h-screen bg-background">
        <StorefrontHeader 
          storeName={store.name} 
          storeSlug={storeSlug!} 
          storeId={store.id} 
          logoUrl={store.logo_url}
          headerBgColor={(store as any).header_bg_color}
          headerTextColor={(store as any).header_text_color}
          headerLayout={(store as any).header_layout}
          headerShowFavorites={(store as any).header_show_favorites}
          headerShowSearch={(store as any).header_show_search}
          headerMobileLogoPosition={(store as any).header_mobile_logo_position}
        />
        
        <main>
          {hasSections ? (
            // Render configured sections with proper spacing
            <div className="space-y-0">
              {sections.map((section, index) => {
                const rendered = (() => {
                  switch (section.section_type) {
                    case 'banner_carousel':
                      return <BannerCarousel key={section.id} section={section} storeSlug={storeSlug!} />;
                    case 'featured_categories':
                      return <FeaturedCategories key={section.id} section={section} storeSlug={storeSlug!} storeId={store.id} />;
                    case 'featured_products':
                    case 'new_arrivals':
                      return (
                        <ProductSection 
                          key={section.id} 
                          section={section} 
                          storeSlug={storeSlug!} 
                          storeId={store.id}
                          onQuickAdd={handleQuickAdd}
                          onProductClick={handleProductClick}
                          onAuthRequired={handleAuthRequired}
                        />
                      );
                    default:
                      return null;
                  }
                })();

                // Insert recently viewed right after the first banner_carousel
                const isFirstBanner = section.section_type === 'banner_carousel' && 
                  sections.findIndex(s => s.section_type === 'banner_carousel') === index;

                return (
                  <div key={section.id}>
                    {rendered}
                    {isFirstBanner && recentlyViewedProducts.length > 0 && (
                      <div className="container mx-auto px-4">
                        <RecommendationCarousel
                          title="Vistos Recentemente"
                          products={recentlyViewedProducts}
                          storeSlug={storeSlug!}
                          storeId={store?.id}
                          onQuickAdd={(p) => handleQuickAdd(p as unknown as CategoryProduct)}
                          onAuthRequired={handleAuthRequired}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Fallback: show all products if no sections configured
            <div className="container mx-auto px-4 py-8">
              {store.description && (
                <div className="mb-8 text-center">
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {store.description}
                  </p>
                </div>
              )}

              {categoryProducts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryProducts.map((product) => (
                    <CategoryProductCard
                      key={product.id}
                      product={product}
                      onQuickAdd={handleQuickAdd}
                      onProductClick={handleProductClick}
                      onAuthRequired={handleAuthRequired}
                      storeId={store?.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        <StorefrontFooter store={store as any} />

        <CategoryQuickAddDialog
          product={quickAddProduct}
          storeSlug={storeSlug!}
          open={!!quickAddProduct}
          onOpenChange={(open) => !open && setQuickAddProduct(null)}
          onViewDetails={handleViewDetails}
        />

        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {}}
          productName={authProductName}
          storeId={store.id}
        />
      </div>
    </StoreThemeProvider>
  );
}