import { createContext, useContext, useCallback, ReactNode } from 'react';
import { useParams } from 'react-router-dom';

interface StoreSlugContextType {
  storeSlug: string;
  isSubdomain?: boolean;
}

const StoreSlugContext = createContext<StoreSlugContextType | null>(null);

/**
 * Provides a store slug to storefront pages.
 * Used in subdomain mode where the slug comes from the hostname
 * instead of URL params.
 */
export function StoreSlugProvider({ slug, children, forceSubdomainMode }: { slug: string; children: ReactNode; forceSubdomainMode?: boolean }) {
  return (
    <StoreSlugContext.Provider value={{ storeSlug: slug, isSubdomain: forceSubdomainMode ?? true }}>
      {children}
    </StoreSlugContext.Provider>
  );
}

/**
 * Returns the store slug from either:
 * 1. The StoreSlugContext (subdomain mode)
 * 2. URL params (development/path-based mode)
 */
export function useStoreSlug(): string {
  const context = useContext(StoreSlugContext);
  const params = useParams<{ storeSlug: string }>();
  if (context) return context.storeSlug;
  if (params.storeSlug) return params.storeSlug;
  return '';
}

/**
 * Returns a function to build store-relative paths.
 * In subdomain mode (context exists): returns "/checkout"
 * In path-based mode (no context): returns "/store/{slug}/checkout"
 */
export function useStorePath() {
  const context = useContext(StoreSlugContext);
  const params = useParams<{ storeSlug: string }>();
  const isSubdomainMode = context ? (context.isSubdomain !== false) : false;
  const slug = context?.storeSlug || params.storeSlug || '';

  const buildPath = useCallback((path: string) => {
    // In subdomain mode, routes are at root (e.g., /checkout)
    if (isSubdomainMode) return path;
    // In path-based mode, prefix with /store/{slug}
    return slug ? `/store/${slug}${path}` : path;
  }, [isSubdomainMode, slug]);

  return { buildPath, storeSlug: slug };
}
