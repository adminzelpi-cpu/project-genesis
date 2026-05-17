import { supabase } from "@/integrations/supabase/client";

const FALLBACK_DOMAIN = "zelpi.com.br";

interface StoreRef {
  id: string;
  slug: string;
}

const cache = new Map<string, { url: string; ts: number }>();
const TTL_MS = 60_000;

/**
 * Resolves the public URL of a store, preferring a verified custom domain
 * and falling back to <slug>.zelpi.com.br. Returns the origin only (no path).
 *
 * Examples:
 *   "https://larrizi.com.br"            (custom domain set)
 *   "https://larrizi.zelpi.com.br"      (fallback)
 */
export async function getStorePublicUrl(store: StoreRef): Promise<string> {
  const cached = cache.get(store.id);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.url;

  let url = `https://${store.slug}.${FALLBACK_DOMAIN}`;

  try {
    const { data } = await supabase
      .from("custom_domains")
      .select("domain, is_primary, is_verified, updated_at")
      .eq("store_id", store.id)
      .eq("is_verified", true)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0 && data[0].domain) {
      url = `https://${data[0].domain.replace(/\/+$/, "")}`;
    }
  } catch (err) {
    console.error("[getStorePublicUrl] lookup failed, using fallback:", err);
  }

  cache.set(store.id, { url, ts: Date.now() });
  return url;
}

/**
 * Returns the storefront base URL based on the current browser context.
 *
 * - On a custom domain (anything that is NOT *.zelpi.com.br) → window.location.origin
 *   (no /store/slug prefix, since the custom domain serves the storefront at root)
 * - On *.zelpi.com.br subdomains → window.location.origin
 * - Anywhere else (dashboard, dev, preview) → falls back to /store/<slug>
 *
 * Use this for client-side links generated INSIDE the storefront (auth redirects,
 * password recovery, share links, etc.) where we want links that work on the
 * exact domain the customer is browsing.
 */
export function getCurrentStorefrontBase(storeSlug: string): string {
  if (typeof window === "undefined") return `/store/${storeSlug}`;
  const host = window.location.hostname.toLowerCase();
  const origin = window.location.origin;

  // Custom domain: storefront is at root
  if (!host.endsWith(".zelpi.com.br") && host !== "zelpi.com.br" && host !== "localhost") {
    return origin;
  }

  // *.zelpi.com.br storefront subdomain: also root
  if (host.endsWith(".zelpi.com.br") && host !== "zelpi.com.br" && host !== "www.zelpi.com.br" && host !== "admin.zelpi.com.br") {
    return origin;
  }

  // Dashboard / dev / preview: use /store/<slug> path
  return `${origin}/store/${storeSlug}`;
}
