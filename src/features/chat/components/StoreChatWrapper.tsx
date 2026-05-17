import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { StoreChatWidget } from "./StoreChatWidget";
import { useLocation } from "react-router-dom";

/**
 * Wrapper that resolves storeId from the current storefront context
 * and renders the chat widget. Placed once in StorefrontRoutes.
 */
export function StoreChatWrapper() {
  const storeSlug = useStoreSlug();
  const { store } = useStorefront(storeSlug);
  const location = useLocation();

  // Determine current page context
  const path = location.pathname;
  const isCheckout = path.includes("/checkout");
  const isThankYou = path.includes("/thank-you");

  // Hide chat on checkout and thank-you pages
  if (!store?.id || isCheckout || isThankYou) return null;

  const productMatch = path.match(/\/product\/([^/]+)/);
  const currentPage = path.includes("/cart")
    ? "carrinho"
    : path.includes("/category/")
    ? "categoria"
    : "home";

  return (
    <StoreChatWidget
      storeId={store.id}
      storeSlug={storeSlug}
      storeFaviconUrl={(store as any).favicon_url || null}
      currentProductId={productMatch?.[1] || null}
      currentPage={currentPage}
    />
  );
}
