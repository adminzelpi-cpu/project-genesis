import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enqueuePrefetch, isPrefetchAllowed } from "../lib/prefetchQueue";

interface PrefetchInput {
  productId: string;
  productSlug: string;
  productCode?: number | null;
  storeId?: string;
}

const HOVER_DEBOUNCE_MS = 100;

/**
 * Returns event handlers that prefetch a product's data when the user shows
 * intent to navigate to it.
 *
 *   Desktop  -> onMouseEnter (debounced ~100ms to ignore casual mouse passes)
 *   Mobile   -> onPointerDown (fires on touch start, ~100ms before click)
 *
 * Listings should additionally call `prefetch()` directly when a card enters
 * the viewport (IntersectionObserver) for the most aggressive lead time.
 *
 * Always safe: dedupes against React Query cache, caps concurrency to 3,
 * and skips on slow / save-data connections.
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();
  const timers = useRef<Map<string, number>>(new Map());

  const runPrefetch = useCallback(
    ({ productId, productSlug, productCode, storeId }: PrefetchInput) => {
      if (!storeId || !productSlug) return;
      if (!isPrefetchAllowed()) return;

      // Compose the slug key that the product page uses (slug-code).
      const slugWithCode = productCode ? `${productSlug}-${productCode}` : productSlug;
      const productKey = ["product", slugWithCode, storeId];

      // Skip if already cached / being fetched.
      if (queryClient.getQueryState(productKey)?.data) return;

      enqueuePrefetch(`product:${productId}:${storeId}`, async () => {
        await queryClient.prefetchQuery({
          queryKey: productKey,
          queryFn: async () => {
            if (productCode != null) {
              const { data } = await supabase
                .from("products")
                .select("*")
                .eq("product_code", productCode)
                .eq("store_id", storeId)
                .eq("is_active", true)
                .maybeSingle();
              if (data) return data;
            }
            const { data, error } = await supabase
              .from("products")
              .select("*")
              .eq("slug", productSlug)
              .eq("store_id", storeId)
              .eq("is_active", true)
              .single();
            if (error) throw error;
            return data;
          },
          staleTime: 60_000,
        });
      });

      // Variations are needed immediately on the product page — prefetch them too.
      enqueuePrefetch(`product-variations:${productId}`, async () => {
        if (queryClient.getQueryState(["product-variations", productId])?.data) return;
        await queryClient.prefetchQuery({
          queryKey: ["product-variations", productId],
          queryFn: async () => {
            const { data } = await supabase
              .from("product_variations_v2")
              .select("*")
              .eq("product_id", productId)
              .eq("is_active", true);
            return data || [];
          },
          staleTime: 60_000,
        });
      });
    },
    [queryClient]
  );

  /** Fire immediately (used by IntersectionObserver-based prefetch). */
  const prefetch = useCallback(
    (input: PrefetchInput) => runPrefetch(input),
    [runPrefetch]
  );

  /** Debounced — ideal for hover. Ignores quick mouse passes. */
  const onMouseEnter = useCallback(
    (input: PrefetchInput) => {
      const key = input.productId;
      const existing = timers.current.get(key);
      if (existing) window.clearTimeout(existing);
      const id = window.setTimeout(() => {
        timers.current.delete(key);
        runPrefetch(input);
      }, HOVER_DEBOUNCE_MS);
      timers.current.set(key, id);
    },
    [runPrefetch]
  );

  const onMouseLeave = useCallback((input: PrefetchInput) => {
    const id = timers.current.get(input.productId);
    if (id) {
      window.clearTimeout(id);
      timers.current.delete(input.productId);
    }
  }, []);

  /** Fires on touch start — last-moment guarantee on mobile. */
  const onPointerDown = useCallback(
    (input: PrefetchInput) => runPrefetch(input),
    [runPrefetch]
  );

  return { prefetch, onMouseEnter, onMouseLeave, onPointerDown };
}
