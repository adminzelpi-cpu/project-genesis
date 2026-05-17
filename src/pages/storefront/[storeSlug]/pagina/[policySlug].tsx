import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { Loader2 } from "lucide-react";
import { StorefrontMeta } from "@/features/storefront/components/layout/StorefrontMeta";
import { sanitizeHTML } from "@/lib/sanitize";

export default function PolicyPage() {
  const storeSlug = useStoreSlug();
  const { policySlug } = useParams();
  const { store, isLoading: storeLoading } = useStorefront(storeSlug);

  const { data: policy, isLoading: policyLoading } = useQuery({
    queryKey: ["policy-page", store?.id, policySlug],
    queryFn: async () => {
      if (!store?.id || !policySlug) return null;

      const { data, error } = await supabase
        .from("store_policies")
        .select("*")
        .eq("store_id", store.id)
        .eq("slug", policySlug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!store?.id && !!policySlug,
  });

  const isLoading = storeLoading || policyLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loja não encontrada</p>
      </div>
    );
  }

  if (!policy) {
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
        <div className="min-h-screen flex flex-col">
          <StorefrontHeader 
            storeName={store.name}
            storeSlug={store.slug}
            storeId={store.id}
            logoUrl={store.logo_url}
            headerBgColor={store.header_bg_color}
            headerTextColor={store.header_text_color}
            headerLayout={store.header_layout}
            headerShowFavorites={store.header_show_favorites}
            headerShowSearch={store.header_show_search}
            headerMobileLogoPosition={store.header_mobile_logo_position}
          />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Página não encontrada</p>
          </main>
          <StorefrontFooter store={store} />
        </div>
      </StoreThemeProvider>
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
      <StorefrontMeta
        title={(policy as any).meta_title || policy.title}
        description={(policy as any).meta_description || undefined}
        storeName={store.name}
        faviconUrl={store.favicon_url}
      />
      <div className="min-h-screen flex flex-col">
        <StorefrontHeader 
          storeName={store.name}
          storeSlug={store.slug}
          storeId={store.id}
          logoUrl={store.logo_url}
          headerBgColor={store.header_bg_color}
          headerTextColor={store.header_text_color}
          headerLayout={store.header_layout}
          headerShowFavorites={store.header_show_favorites}
          headerShowSearch={store.header_show_search}
          headerMobileLogoPosition={store.header_mobile_logo_position}
        />
        
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">{policy.title}</h1>
            
            <div 
              className="prose prose-sm md:prose-base max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHTML(policy.content || "") }}
            />
          </div>
        </main>
        
        <StorefrontFooter store={store} />
      </div>
    </StoreThemeProvider>
  );
}
