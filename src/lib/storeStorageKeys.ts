import { detectAppMode } from '@/hooks/useHostDetection';

/**
 * Derives the current store slug from URL/hostname.
 * Used to namespace localStorage/sessionStorage keys per store.
 */
export function getCurrentStoreSlug(): string | null {
  const hostname = window.location.hostname;
  const detection = detectAppMode(hostname);

  // Subdomain mode: slug comes from hostname
  if (detection.storeSlug) {
    return detection.storeSlug;
  }

  // Path-based mode: extract slug from /store/:slug/
  const pathMatch = window.location.pathname.match(/^\/store\/([^/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  return null;
}

/**
 * Builds a store-scoped localStorage/sessionStorage key.
 * If no store context is found, returns the base key unchanged.
 */
export function storeKey(baseKey: string): string {
  const slug = getCurrentStoreSlug();
  return slug ? `${baseKey}_${slug}` : baseKey;
}
