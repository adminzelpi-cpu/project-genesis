import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { Search, Loader2 } from "lucide-react";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { useProductSearchFull } from "@/features/storefront/hooks/useProductSearch";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { CategoryProductCard } from "@/features/storefront/components/category/CategoryProductCard";
import { CategoryQuickAddDialog } from "@/features/storefront/components/category/CategoryQuickAddDialog";
import { AuthModal } from "@/features/storefront/components/favorites";

import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { buildStorefrontProductLink } from "@/features/storefront/lib/buildStorefrontProductLink";
import { interleaveByParent } from "@/features/storefront/lib/interleaveByParent";
import { useListStatePersistence } from "@/features/storefront/hooks/useListStatePersistence";
import { ProductCardSkeleton } from "@/features/storefront/components/skeletons";
import type { CategoryProduct } from "@/features/storefront/types/category";
import { Helmet } from "react-helmet";

export default function SearchPage() {
  const paramSlug = useParams<{ storeSlug: string }>().storeSlug;
  const contextSlug = useStoreSlug();
  const storeSlug = paramSlug || contextSlug;
  const { buildPath } = useStorePath();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const { store, isLoading: storeLoading } = useStorefront(storeSlug);
  const { data: products = [], isLoading: productsLoading } = useProductSearchFull(store?.id, query);

  const [quickAddProduct, setQuickAddProduct] = useState<CategoryProduct | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Persist list state (count + scroll) per query so returning from a product
  // restores the user where they left off.
  const listState = useListStatePersistence(`search:${query}`, 8);
  const [displayedCount, setDisplayedCount] = useState(listState.initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listState.setCount(displayedCount);
  }, [displayedCount, listState]);

  const categoryProducts: CategoryProduct[] = useMemo(() => {
    const mapped = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      sale_price: p.sale_price,
      images: p.images,
      _productCode: p._productCode ?? p.product_code ?? undefined,
      _colorCode: p._colorCode,
      _colorValueId: p._colorValueId,
      _colorAttributeId: p._colorAttributeId,
      _colorName: p._colorName,
      is_active: true,
      stock_quantity: null,
    }));
    return interleaveByParent(mapped, { seedKey: `search-${query}` });
  }, [products, query]);

  const displayedProducts = categoryProducts.slice(0, displayedCount);
  const hasMore = displayedCount < categoryProducts.length;

  // Reset count when products change
  useEffect(() => {
    setDisplayedCount(8);
  }, [query, store?.id]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          // Small delay for smooth UX
          setTimeout(() => {
            setDisplayedCount(prev => Math.min(prev + 8, categoryProducts.length));
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, isLoadingMore, categoryProducts.length]);

  const handleQuickAdd = (product: CategoryProduct) => {
    setQuickAddProduct(product);
    setQuickAddOpen(true);
  };

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <div className="h-7 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!store) return null;

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
      elementBorderRadius={store.element_border_radius}
      faviconUrl={store.favicon_url}
      fontFamily={store.font_family}
    >
      <Helmet><title>{query ? `Busca: ${query}` : 'Todos os Produtos'} | {store.name}</title></Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <StorefrontHeader
          storeName={store.name}
          storeSlug={storeSlug}
          storeId={store.id}
          logoUrl={store.logo_url}
          headerBgColor={store.header_bg_color}
          headerTextColor={store.header_text_color}
          headerLayout={store.header_layout}
          headerShowFavorites={store.header_show_favorites ?? true}
          headerShowSearch={store.header_show_search ?? true}
        />

        <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
          <div className="mb-6">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Search className="h-5 w-5" />
              {query ? `Resultados para "${query}"` : 'Todos os Produtos'}
            </h1>
            {!productsLoading && (
              <p className="text-sm text-muted-foreground mt-1">
                {products.length} {products.length === 1 ? "produto encontrado" : "produtos encontrados"}
              </p>
            )}
          </div>

          {productsLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!productsLoading && products.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedProducts.map((product, index) => (
                  <CategoryProductCard
                    key={`${product.id}-${product._colorValueId || ''}`}
                    product={product}
                    onQuickAdd={handleQuickAdd}
                    onProductClick={(p) => {
                      const link = buildStorefrontProductLink({
                        storeSlug,
                        productSlug: p.slug,
                        productCode: p._productCode ?? null,
                        colorCode: p._colorCode ?? null,
                        buildPath,
                      });
                      window.location.href = link;
                    }}
                    onAuthRequired={() => setAuthModalOpen(true)}
                    priority={index < 4}
                    storeId={store?.id}
                  />
                ))}
              </div>
              <div ref={loaderRef} className="flex justify-center items-center py-8 mt-4">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground bg-background border border-border rounded-lg px-6 py-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Carregando mais produtos...</span>
                  </div>
                )}
              </div>
            </>
          )}

          {!productsLoading && products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">Nenhum produto encontrado</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                {query 
                  ? `Não encontramos produtos para "${query}". Tente buscar com outros termos.`
                  : 'Nenhum produto disponível no momento.'
                }
              </p>
              <Link
                to={buildPath(`/`)}
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                Voltar para a loja
              </Link>
            </div>
          )}
        </main>

        <StorefrontFooter store={{
          id: store.id,
          name: store.name,
          slug: storeSlug,
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

        <CategoryQuickAddDialog
          product={quickAddProduct}
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          onViewDetails={() => {
            if (quickAddProduct) {
              const link = buildStorefrontProductLink({
                storeSlug,
                productSlug: quickAddProduct.slug,
                productCode: quickAddProduct._productCode ?? null,
                buildPath,
              });
              window.location.href = link;
            }
          }}
          storeSlug={storeSlug}
        />
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {}}
          storeId={store?.id}
        />
      </div>
    </StoreThemeProvider>
  );
}
