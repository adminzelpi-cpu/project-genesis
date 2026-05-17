import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CustomerSidebar } from "./CustomerSidebar";
import { useCustomerStore } from "@/features/customers/hooks/useCustomerStore";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";

export function CustomerLayout() {
  const { data: store } = useCustomerStore();

  const content = (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Full storefront header */}
      {store && (
        <StorefrontHeader
          storeName={store.name || ""}
          storeSlug={store.slug || ""}
          storeId={store.id || ""}
          logoUrl={store.logo_url}
          headerBgColor={(store as any).header_bg_color}
          headerTextColor={(store as any).header_text_color}
          headerLayout={(store as any).header_layout}
          headerShowFavorites={(store as any).header_show_favorites}
          headerShowSearch={(store as any).header_show_search}
          headerMobileLogoPosition={(store as any).header_mobile_logo_position}
        />
      )}

      <SidebarProvider>
        <div className="flex flex-1 w-full customer-area-sidebar">
          <CustomerSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 border-b border-border flex items-center px-4 bg-card sticky top-0 z-10 lg:hidden">
              <SidebarTrigger className="mr-4" />
              <span className="text-sm font-medium text-foreground">Minha Conta</span>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>

      {/* Full storefront footer */}
      {store && (
        <StorefrontFooter
          store={store as any}
        />
      )}
    </div>
  );

  if (store) {
    return (
      <StoreThemeProvider
        primaryColor={store.theme_primary_color}
        secondaryColor={store.theme_secondary_color}
        buttonColor={store.button_color}
        buttonHoverColor={store.button_hover_color}
        buttonTextColor={(store as any).button_text_color}
        primaryTextColor={(store as any).primary_text_color}
        secondaryTextColor={(store as any).secondary_text_color}
        buttonBorderRadius={store.button_border_radius}
        elementBorderRadius={(store as any).element_border_radius}
        faviconUrl={store.favicon_url}
        fontFamily={(store as any).font_family}
      >
        {content}
      </StoreThemeProvider>
    );
  }

  return content;
}
