import { useState, lazy, Suspense, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { sanitizeHTML } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Loader2, ArrowUp, X, ChevronDown, ChevronUp } from "lucide-react";
import { TrackingScripts } from "@/features/tracking/components/TrackingScripts";
import { LGPDBanner } from "@/features/lgpd/components/LGPDBanner";
import { usePublicTrackingConfig } from "@/features/tracking";
import { trackViewCategory, trackPageView, ProductData } from "@/features/tracking/lib/trackEvent";
import { useStoreCurrency } from "@/features/tracking/hooks/useStoreCurrency";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet";
import { StorefrontMeta } from "@/features/storefront/components/layout/StorefrontMeta";
import { CategoryProductCard } from "@/features/storefront/components/category/CategoryProductCard";
import { useCategoryProducts } from "@/features/storefront/hooks/useCategoryProducts";
import type { CategoryProduct } from "@/features/storefront/types/category";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { ProductCardSkeleton } from "@/features/storefront/components/skeletons";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/features/storefront/components/favorites/AuthModal";
import { StorefrontBreadcrumbs } from "@/features/storefront/components/layout/StorefrontBreadcrumbs";
import { useCategoryBreadcrumbs } from "@/features/storefront/hooks/useCategoryBreadcrumbs";
import { slugifyColor } from "@/features/storefront/lib/buildStorefrontProductLink";
import { useStorefrontCategories } from "@/features/storefront/hooks/useStorefrontCategories";
import { useStorefrontMenus } from "@/features/storefront/hooks/useStorefrontMenus";
import { LazyMount } from "@/features/storefront/components/LazyMount";
import { interleaveByParent } from "@/features/storefront/lib/interleaveByParent";
import { useListStatePersistence } from "@/features/storefront/hooks/useListStatePersistence";
import type { FilterState } from "@/features/storefront/components/category/CategoryFilters";

// Lazy load heavy components
const CategoryQuickAddDialog = lazy(() => 
  import("@/features/storefront/components/category/CategoryQuickAddDialog").then(m => ({ default: m.CategoryQuickAddDialog }))
);
const CategoryFilters = lazy(() => 
  import("@/features/storefront/components/category/CategoryFilters").then(m => ({ default: m.CategoryFilters }))
);
const LazyCategoryRecommendations = lazy(() =>
  import("@/features/storefront/components/recommendations/LazyCategoryRecommendations").then(m => ({ default: m.LazyCategoryRecommendations }))
);

// Initial product count is route-aware to keep mobile LCP fast (fewer images
// competing for bandwidth above the fold). Infinite scroll loads more as the
// user scrolls, so reducing the initial batch on mobile does not hide content.
// We read the viewport synchronously so the first paint already uses the right
// number — avoids a re-render that would show 8 placeholders and then drop to 4.
const getInitialProductsCount = (): number => {
  if (typeof window === "undefined") return 4; // SSR-safe default = mobile
  return window.innerWidth >= 768 ? 8 : 4;
};
const INITIAL_PRODUCTS = getInitialProductsCount();
const LOAD_MORE_COUNT = 8;


const CategoryPage = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const navigate = useNavigate();
  
  const [selectedProduct, setSelectedProduct] = useState<CategoryProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Persist displayed count + scroll position so returning from a product
  // restores the user to the same place in the grid.
  const listState = useListStatePersistence(`category:${categorySlug || "all"}`, INITIAL_PRODUCTS);
  const [displayedCount, setDisplayedCount] = useState(listState.initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authProductName, setAuthProductName] = useState<string | undefined>();
  const [appliedFilters, setAppliedFilters] = useState<FilterState | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Keep the persistence layer in sync with current count
  useEffect(() => {
    listState.setCount(displayedCount);
  }, [displayedCount, listState]);

  // Reset description expanded state when navigating to a different category
  useEffect(() => {
    setShowFullDescription(false);
  }, [categorySlug]);
  const loaderRef = useRef<HTMLDivElement>(null);

  const handleAuthRequired = (productName?: string) => {
    setAuthProductName(productName);
    setAuthModalOpen(true);
  };

  // Fetch store data - uses same queryKey as other storefront pages for cache sharing
  const { data: store } = useQuery({
    queryKey: ["storefront", storeSlug],
    queryFn: async () => {
      if (!storeSlug) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", storeSlug)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storeSlug,
  });

  const { data, isLoading, error } = useCategoryProducts({
    storeSlug: storeSlug || "",
    categorySlug: categorySlug || "",
  });

  // Use category-specific attributes instead of all store attributes
  const categoryAttributes = data?.categoryAttributes || [];

  // Fetch categories for filter navigation
  const { data: storeCategories = [] } = useStorefrontCategories(store?.id);
  // Fetch header menu so filter sidebar mirrors the lojista's Menu Principal order
  const { data: storefrontMenus } = useStorefrontMenus(store?.id);
  const headerMenuItems = storefrontMenus?.header?.items || [];

  // Fetch parent category for breadcrumbs
  const { breadcrumbs: categoryBreadcrumbs } = useCategoryBreadcrumbs(
    data?.category?.parentId,
    storeSlug || ""
  );

  // Fetch tracking config
  const { data: trackingConfig } = usePublicTrackingConfig(store?.id);
  const storeCurrency = useStoreCurrency(store?.id);

  // Track ViewCategory when products load
  const hasTrackedCategory = useRef(false);
  useEffect(() => {
    if (!data?.products || !data?.category || hasTrackedCategory.current) return;
    
    hasTrackedCategory.current = true;
    
    // Track PageView
    trackPageView(store?.id);
    
    // Track ViewCategory with products — use retailer_id format (matches catalog feed).
    // For separated-color cards we get P{code}-C{x}; for parent cards just P{code}.
    // Send up to 50 items (Meta best-practice cap for collection events; trackEvent
    // dedupes ids and CAPI mirrors the same set).
    import("@/features/tracking/lib/retailerId").then(({ buildRetailerIdFromCodes }) => {
      const productData: ProductData[] = data.products.slice(0, 50).map(p => ({
        id: buildRetailerIdFromCodes({
          productCode: (p as any)._productCode,
          productId: p.id,
          colorCode: (p as any)._colorCode,
        }),
        name: p.name,
        price: p.sale_price || p.price,
        category: data.category.name,
      }));
      trackViewCategory(data.category.name, productData, store?.id, storeCurrency);
    });
  }, [data?.products, data?.category, storeCurrency]);

  // Calculate price range from actual products
  const { priceMin, priceMax } = useMemo(() => {
    if (!data?.products || data.products.length === 0) return { priceMin: 0, priceMax: 1000 };
    const prices = data.products.map(p => p.sale_price || p.price);
    return {
      priceMin: Math.floor(Math.min(...prices)),
      priceMax: Math.ceil(Math.max(...prices)),
    };
  }, [data?.products]);

  // Apply filters to products
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];
    let products = [...data.products];

    if (appliedFilters) {
      // Price filter
      if (appliedFilters.priceRange) {
        products = products.filter(p => {
          const price = p.sale_price || p.price;
          return price >= appliedFilters.priceRange[0] && price <= appliedFilters.priceRange[1];
        });
      }

      // Attribute filters
      const activeAttributeFilters = Object.entries(appliedFilters.selectedAttributes)
        .filter(([_, values]) => values.length > 0);

      if (activeAttributeFilters.length > 0) {
        products = products.filter(p => {
          return activeAttributeFilters.every(([attrId, selectedValues]) => {
            if (p._colorValueId && p._colorAttributeId === attrId) {
              return selectedValues.includes(p._colorValueId);
            }
            return true;
          });
        });
      }
    }

    return interleaveByParent(products, { seedKey: `category-page-${categorySlug || 'all'}` });
  }, [data?.products, appliedFilters, categorySlug]);

  // Active filter labels for badges
  const activeFilterLabels = useMemo(() => {
    if (!appliedFilters) return [];
    const labels: { key: string; label: string }[] = [];

    if (appliedFilters.priceRange[0] !== priceMin || appliedFilters.priceRange[1] !== priceMax) {
      labels.push({ key: "price", label: `R$ ${appliedFilters.priceRange[0]} - R$ ${appliedFilters.priceRange[1]}` });
    }

    if (appliedFilters.inStockOnly) {
      labels.push({ key: "stock", label: "Em estoque" });
    }

    Object.entries(appliedFilters.selectedAttributes).forEach(([attrId, valueIds]) => {
      const attr = categoryAttributes.find(a => a.id === attrId);
      if (attr) {
        valueIds.forEach(vId => {
          const val = attr.values.find(v => v.id === vId);
          if (val) {
            labels.push({ key: `${attrId}-${vId}`, label: `${attr.name}: ${val.value}` });
          }
        });
      }
    });

    return labels;
  }, [appliedFilters, categoryAttributes, priceMin, priceMax]);

  const handleApplyFilters = (filters: FilterState) => {
    setAppliedFilters(filters);
    setDisplayedCount(INITIAL_PRODUCTS);
  };

  const clearAllFilters = () => {
    setAppliedFilters(null);
    setDisplayedCount(INITIAL_PRODUCTS);
  };

  const removeFilterLabel = (key: string) => {
    if (!appliedFilters) return;
    if (key === "price") {
      setAppliedFilters({ ...appliedFilters, priceRange: [priceMin, priceMax] });
    } else {
      // attribute filter: key is "attrId-valueId"
      const [attrId, valueId] = key.split("-");
      const updated = { ...appliedFilters.selectedAttributes };
      updated[attrId] = (updated[attrId] || []).filter(v => v !== valueId);
      setAppliedFilters({ ...appliedFilters, selectedAttributes: updated });
    }
  };

  const displayedProducts = filteredProducts.slice(0, displayedCount);
  const hasMore = displayedCount < filteredProducts.length;

  // Recommendations: only IDs computed eagerly (cheap); the actual query
  // is mounted lazily via LazyMount below to avoid competing with
  // above-the-fold product fetching.
  const excludeIds = useMemo(() => (data?.products || []).map(p => p.id), [data?.products]);

  const handleQuickAdd = (product: CategoryProduct) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

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

  const handleViewDetails = () => {
    if (selectedProduct) {
      setDialogOpen(false);
      handleProductClick(selectedProduct);
    }
  };

  const loadMoreProducts = () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + LOAD_MORE_COUNT, filteredProducts.length));
      setIsLoadingMore(false);
    }, 300);
  };

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, isLoadingMore, filteredProducts.length]);

  // Show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <StorefrontHeader 
          storeName={store?.name || ""} 
          storeSlug={storeSlug || ""} 
          storeId={store?.id || ""}
          logoUrl={store?.logo_url}
          headerBgColor={(store as any)?.header_bg_color}
          headerTextColor={(store as any)?.header_text_color}
          headerLayout={(store as any)?.header_layout}
          headerShowFavorites={(store as any)?.header_show_favorites}
          headerShowSearch={(store as any)?.header_show_search}
          headerMobileLogoPosition={(store as any)?.header_mobile_logo_position}
        />
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-9 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-4">
          <div className="h-4 w-40 bg-muted rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <StorefrontHeader 
          storeName={store?.name || ""} 
          storeSlug={storeSlug || ""} 
          storeId={store?.id || ""}
          logoUrl={store?.logo_url}
          headerBgColor={(store as any)?.header_bg_color}
          headerTextColor={(store as any)?.header_text_color}
          headerLayout={(store as any)?.header_layout}
          headerShowFavorites={(store as any)?.header_show_favorites}
          headerShowSearch={(store as any)?.header_show_search}
          headerMobileLogoPosition={(store as any)?.header_mobile_logo_position}
        />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Categoria não encontrada</h1>
          <p className="text-muted-foreground mb-8">
            A categoria que você está procurando não existe ou foi removida.
          </p>
          <Button asChild>
            <Link to={buildPath(`/`)}>Voltar para a loja</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StoreThemeProvider
      primaryColor={store?.theme_primary_color}
      secondaryColor={store?.theme_secondary_color}
      buttonColor={store?.button_color}
      buttonHoverColor={store?.button_hover_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      buttonBorderRadius={store?.button_border_radius}
      elementBorderRadius={(store as any)?.element_border_radius}
      faviconUrl={(store as any)?.favicon_url}
      fontFamily={(store as any)?.font_family}
    >
      <TrackingScripts storeId={store?.id} />
      <LGPDBanner storeId={store?.id} storeSlug={storeSlug} />
      <StorefrontMeta
        title={data.category.seoTitle || data.category.name}
        description={data.category.seoDescription || `Confira os produtos de ${data.category.name} na ${store?.name}`}
        ogUrl={`${window.location.origin}${buildPath(`/category/${categorySlug}`)}`}
        storeName={store?.name}
        faviconUrl={(store as any)?.favicon_url}
      />

      <div className="min-h-screen bg-background">
        <StorefrontHeader 
          storeName={store?.name || ""} 
          storeSlug={storeSlug || ""} 
          storeId={store?.id || ""}
          logoUrl={store?.logo_url}
          headerBgColor={(store as any)?.header_bg_color}
          headerTextColor={(store as any)?.header_text_color}
          headerLayout={(store as any)?.header_layout}
          headerShowFavorites={(store as any)?.header_show_favorites}
          headerShowSearch={(store as any)?.header_show_search}
          headerMobileLogoPosition={(store as any)?.header_mobile_logo_position}
        />

        {/* Header */}
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {/* Breadcrumbs */}
            <StorefrontBreadcrumbs
              storeSlug={storeSlug || ""}
              items={[
                ...categoryBreadcrumbs,
                { label: data.category.name }
              ]}
            />

            {/* Title */}
            <h1 className="text-2xl font-bold">{data.category.name}</h1>

            {/* Filter button */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtrar
                {activeFilterLabels.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {activeFilterLabels.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Product Count & Active Filters */}
        <div className="container mx-auto px-4 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {Math.min(displayedCount, filteredProducts.length)} de {filteredProducts.length} produtos
          </p>
          {activeFilterLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {activeFilterLabels.map(({ key, label }) => (
                <Badge key={key} variant="secondary" className="gap-1">
                  {label}
                  <button
                    onClick={() => removeFilterLabel(key)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-xs"
              >
                Limpar tudo
              </Button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <main className="container mx-auto px-4 pb-12">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {appliedFilters ? "Nenhum produto encontrado com os filtros aplicados." : "Nenhum produto encontrado nesta categoria."}
              </p>
              {appliedFilters && (
                <Button variant="link" onClick={clearAllFilters} className="mt-2">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {displayedProducts.map((product, index) => (
                <CategoryProductCard
                  key={`${product.id}-${product._colorValueId || ''}`}
                  product={product}
                  onQuickAdd={handleQuickAdd}
                  onProductClick={handleProductClick}
                  onAuthRequired={handleAuthRequired}
                  priority={index < 4}
                  storeId={store?.id}
                />
              ))}
            </div>
          )}
          <div ref={loaderRef} className="flex justify-center items-center py-8 mt-4">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground bg-background border border-border rounded-lg px-6 py-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando mais produtos...</span>
              </div>
            )}
          </div>

          {/* Category Description Section - SEO optimized */}
          {data.category.description && (
            <section className="mt-12 pt-8 border-t">
              <div className="relative">
                <div
                  className={cn(
                    "prose prose-sm max-w-none dark:prose-invert text-foreground leading-relaxed overflow-hidden transition-all",
                    !showFullDescription && "max-h-[250px]"
                  )}
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(data.category.description) }}
                />
                {!showFullDescription && data.category.description.length > 300 && (
                  <>
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 flex justify-start pb-4">
                      <button
                        onClick={() => setShowFullDescription(true)}
                        className="text-sm text-muted-foreground hover:underline flex items-center gap-1 relative z-10"
                      >
                        Ver descrição completa
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
                {showFullDescription && data.category.description.length > 300 && (
                  <button
                    onClick={() => setShowFullDescription(false)}
                    className="text-sm text-muted-foreground hover:underline mt-4 flex items-center gap-1"
                  >
                    Recolher descrição
                    <ChevronUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Recommendations Section — only fetched when user scrolls near it */}
          <LazyMount rootMargin="600px" minHeight={320}>
            <Suspense fallback={null}>
              <LazyCategoryRecommendations
                storeId={store?.id}
                storeSlug={storeSlug || ""}
                excludeIds={excludeIds}
                onQuickAdd={handleQuickAdd}
                onAuthRequired={handleAuthRequired}
              />
            </Suspense>
          </LazyMount>
        </main>

        {/* Quick Add Dialog - Lazy loaded */}
        <Suspense fallback={null}>
          <CategoryQuickAddDialog
            product={selectedProduct}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onViewDetails={handleViewDetails}
            storeSlug={storeSlug || ""}
          />
        </Suspense>

        {/* Product Filters - Lazy loaded */}
        <Suspense fallback={null}>
          <CategoryFilters
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            attributes={categoryAttributes}
            priceMin={priceMin}
            priceMax={priceMax}
            onApplyFilters={handleApplyFilters}
            categories={storeCategories}
            currentCategorySlug={categorySlug || ""}
            storeSlug={storeSlug || ""}
            menuItems={headerMenuItems}
            categoryProducts={data?.products || []}
          />
        </Suspense>

        {/* Auth Modal for Favorites */}
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => setAuthModalOpen(false)}
          productName={authProductName}
          storeId={store?.id}
        />

        <StorefrontFooter store={store as any} />
      </div>
    </StoreThemeProvider>
  );
};

export default CategoryPage;
