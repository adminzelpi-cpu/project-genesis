// Universal store public URL resolver for Edge Functions.
// Priority: verified primary custom domain → fallback to <slug>.zelpi.com.br
//
// Usage:
//   const baseUrl = await getStorePublicUrl(supabase, { id: storeId, slug });
//   // → "https://larrizi.com.br" if custom domain set, else "https://larrizi.zelpi.com.br"

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const FALLBACK_DOMAIN = "zelpi.com.br";

interface StoreRef {
  id: string;
  slug: string;
}

const cache = new Map<string, { url: string; ts: number }>();
const TTL_MS = 60_000;

export async function getStorePublicUrl(
  supabase: SupabaseClient,
  store: StoreRef,
): Promise<string> {
  const cached = cache.get(store.id);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.url;

  let url = `https://${store.slug}.${FALLBACK_DOMAIN}`;

  try {
    // Prefer the primary verified domain; otherwise the most recently verified one.
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
