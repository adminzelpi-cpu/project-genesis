import { useNavigate, Link } from "react-router-dom";
import { useState, useRef, useMemo, lazy, Suspense, useCallback } from "react";
import { Search, Home, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { useStorefrontCategories } from "@/features/storefront/hooks/useStorefrontCategories";
import { useRecentlyViewed } from "@/features/storefront/hooks/useRecentlyViewed";
import { usePopularProducts } from "@/features/storefront/hooks/usePopularProducts";
import { useSearchHistory } from "@/features/storefront/hooks/useSearchHistory";
import { SearchDropdown } from "@/features/storefront/components/header/SearchDropdown";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { CategoryProductCard } from "@/features/storefront/components/category/CategoryProductCard";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { Helmet } from "react-helmet";
import type { CategoryProduct } from "@/features/storefront/types/category";

const CategoryQuickAddDialog = lazy(() =>
  import("@/features/storefront/components/category/CategoryQuickAddDialog").then(mod => ({ default: mod.CategoryQuickAddDialog }))
);

const StorefrontNotFound = () => {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { store, isLoading: storeLoading } = useStorefront(storeSlug || "");
  const { data: categories } = useStorefrontCategories(store?.id);
  const { getRecentlyViewed, hasRecentlyViewed } = useRecentlyViewed(store?.id);
  const { data: popularProducts } = usePopularProducts(store?.id, 8);
  const { addTerm } = useSearchHistory(store?.id);
  
  const recentProducts = getRecentlyViewed([], 8);

  // Quick Add Dialog state
  const [selectedProduct, setSelectedProduct] = useState<CategoryProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleQuickAdd = useCallback((product: CategoryProduct) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  }, []);

  const handleProductClick = useCallback((product: CategoryProduct) => {
    const slugPart = product._productCode ? `${product.slug}-${product._productCode}` : product.slug;
    let path = buildPath(`/product/${slugPart}`);
    if (product._colorCode != null) path += `?cor=${product._colorCode}`;
    navigate(path);
  }, [buildPath, navigate]);

  const handleViewDetails = useCallback(() => {
    if (selectedProduct) {
      setDialogOpen(false);
      handleProductClick(selectedProduct);
    }
  }, [selectedProduct, handleProductClick]);

  // Transform recently viewed products to CategoryProduct format
  const recentAsCategoryProducts: CategoryProduct[] = useMemo(() => 
    recentProducts.map(p => ({
      id: p.colorCode != null ? `${p.id}_color_${p.colorCode}` : p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      sale_price: p.sale_price,
      images: p.images,
      _colorCode: p.colorCode ?? undefined,
      _productCode: p.productCode ?? undefined,
    })),
    [recentProducts]
  );

  // Filter popular products to exclude recently viewed ones
  const recentIds = useMemo(() => new Set(recentAsCategoryProducts.map(p => p.id)), [recentAsCategoryProducts]);
  const filteredPopular = useMemo(() => 
    (popularProducts || []).filter(p => !recentIds.has(p.id)),
    [popularProducts, recentIds]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addTerm(searchQuery.trim());
      navigate(buildPath(`/search?q=${encodeURIComponent(searchQuery.trim())}`));
      setSearchQuery("");
    }
  };

  const handleSearchFromDropdown = (term: string) => {
    addTerm(term);
    navigate(buildPath(`/search?q=${encodeURIComponent(term)}`));
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  // Show loading state
  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If store not found, show generic 404
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center px-4">
          <h1 className="text-6xl font-bold text-muted-foreground/30 mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-6">Loja não encontrada</p>
          <Button onClick={() => navigate("/")} variant="default">
            <Home className="h-4 w-4 mr-2" />
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StoreThemeProvider 
      primaryColor={store.theme_primary_color} 
      secondaryColor={store.theme_secondary_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      faviconUrl={store.favicon_url}
      fontFamily={(store as any).font_family}
    >
      <Helmet><title>Página não encontrada | {store.name}</title></Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <StorefrontHeader 
          storeName={store.name}
          storeSlug={storeSlug}
          storeId={store.id}
          logoUrl={store.logo_url}
          headerBgColor={store.header_bg_color}
          headerTextColor={store.header_text_color}
          headerLayout={store.header_layout}
          headerShowFavorites={store.header_show_favorites}
          headerShowSearch={store.header_show_search}
          headerMobileLogoPosition={store.header_mobile_logo_position}
        />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-12 md:py-20 px-4">
            <div className="container mx-auto max-w-4xl text-center">
              {/* 404 Visual */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-6">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
                  Ops! Página não encontrada
                </h1>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  A página que você está procurando não existe ou foi movida. 
                  Mas não se preocupe, temos muito mais para você explorar!
                </p>
              </div>

              {/* Search Bar */}
              <div className="max-w-lg mx-auto mb-8 relative">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="search"
                    placeholder="O que você está procurando?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    className="pl-10 pr-10 h-12 text-sm"
                  />
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </form>
                {store?.id && (
                  <SearchDropdown
                    storeId={store.id}
                    storeSlug={storeSlug}
                    isFocused={isSearchFocused}
                    query={searchQuery}
                    onClose={() => setIsSearchFocused(false)}
                    onSearch={handleSearchFromDropdown}
                  />
                )}
              </div>

              {/* Quick Action */}
              <div className="flex justify-center mb-12">
                <Button 
                  onClick={() => navigate(buildPath("/"))}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Ir para a loja
                </Button>
              </div>
            </div>
          </section>


          {/* Recently Viewed Products */}
          {recentAsCategoryProducts.length > 0 && (
            <section className="py-12">
              <div className="container mx-auto px-4">
                <h2 className="text-xl font-semibold text-center mb-8">
                  Produtos que você viu recentemente
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {recentAsCategoryProducts.map((product) => (
                    <CategoryProductCard
                      key={product.id}
                      product={product}
                      onQuickAdd={handleQuickAdd}
                      onProductClick={handleProductClick}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Popular / Featured Products */}
          {filteredPopular.length > 0 && (
            <section className="py-12">
              <div className="container mx-auto px-4">
                <h2 className="text-xl font-semibold text-center mb-8">
                  Produtos em destaque
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {filteredPopular.map((product) => (
                    <CategoryProductCard
                      key={product.id}
                      product={product}
                      onQuickAdd={handleQuickAdd}
                      onProductClick={handleProductClick}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Continue Shopping CTA */}
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-4xl text-center">
              <div className="bg-primary/5 rounded-2xl p-8 md:p-12">
                <ShoppingBag className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-bold mb-3">
                  Continue comprando
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Descubra nossos produtos incríveis e aproveite as melhores ofertas.
                </p>
                <Button 
                  size="lg" 
                  onClick={() => navigate(buildPath("/"))}
                >
                  Ver todos os produtos
                </Button>
              </div>
            </div>
          </section>
        </main>

        <StorefrontFooter store={{
          id: store.id,
          name: store.name,
          slug: store.slug,
          logo_url: store.logo_url,
          instagram: store.instagram,
          facebook: store.facebook,
          whatsapp: store.whatsapp,
          tiktok: store.tiktok,
          email: store.email,
          phone: store.phone,
          footer_bg_color: store.footer_bg_color,
          footer_text_color: store.footer_text_color,
          footer_newsletter_enabled: store.footer_newsletter_enabled,
          footer_newsletter_title: store.footer_newsletter_title,
          footer_newsletter_subtitle: store.footer_newsletter_subtitle,
          footer_show_payment_methods: store.footer_show_payment_methods,
          footer_show_social_links: store.footer_show_social_links,
          footer_copyright_text: store.footer_copyright_text,
        }} />
      </div>

      {/* Quick Add Dialog */}
      {selectedProduct && (
        <Suspense fallback={null}>
          <CategoryQuickAddDialog
            product={selectedProduct}
            storeSlug={storeSlug}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onViewDetails={handleViewDetails}
          />
        </Suspense>
      )}
    </StoreThemeProvider>
  );
};

export default StorefrontNotFound;
