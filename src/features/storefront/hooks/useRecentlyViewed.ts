import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'recently_viewed_products';
const MAX_ITEMS = 20;
const EXPIRATION_DAYS = 30;
const EXPIRATION_MS = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
/** How often we re-validate against the DB (30 seconds) */
const VALIDATION_INTERVAL_MS = 30 * 1000;
const VALIDATION_TS_KEY = 'recently_viewed_validated_at';

export interface RecentlyViewedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  images: string[];
  storeId: string;
  viewedAt: number;
  /** Color variant info – when present, links and images are color-specific */
  colorCode?: number | null;
  colorName?: string | null;
  productCode?: number | null;
  /** Attribute value ID for the color – needed by quick-add dialog */
  colorValueId?: string | null;
  /** Attribute ID for the color attribute – needed by quick-add dialog */
  colorAttributeId?: string | null;
}

function removeExpiredItems(items: RecentlyViewedProduct[]): RecentlyViewedProduct[] {
  const cutoff = Date.now() - EXPIRATION_MS;
  return items.filter(item => item.viewedAt > cutoff);
}

/**
 * Build a unique key for deduplication.
 * Products with different colors are stored as separate entries.
 */
function buildItemKey(item: { id: string; colorCode?: number | null }): string {
  return item.colorCode != null ? `${item.id}__color_${item.colorCode}` : item.id;
}

/**
 * Remove parent (no colorCode) entries when a color variant of the same product exists.
 * Then deduplicate by product+color key, keeping the most recent (assumes sorted desc).
 */
function deduplicateItems(items: RecentlyViewedProduct[]): RecentlyViewedProduct[] {
  const idsWithColors = new Set<string>();
  for (const item of items) {
    if (item.colorCode != null) idsWithColors.add(item.id);
  }

  const seen = new Set<string>();
  return items.filter(item => {
    // Skip parent if any color variant exists for the same product
    if (item.colorCode == null && idsWithColors.has(item.id)) return false;
    const key = buildItemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function persistItems(storeId: string, items: RecentlyViewedProduct[]) {
  localStorage.setItem(`${STORAGE_KEY}_${storeId}`, JSON.stringify(items));
}

export function useRecentlyViewed(storeId: string | undefined) {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);
  const validatingRef = useRef(false);

  /**
   * Check which product IDs still exist & are active in the DB.
   * For color-specific entries, also verifies that the viewed color still exists
   * in an active variation for that product.
   */
  const validateAgainstDb = useCallback(async (sid: string, items: RecentlyViewedProduct[]) => {
    if (validatingRef.current) return;
    if (items.length === 0) {
      localStorage.setItem(`${VALIDATION_TS_KEY}_${sid}`, String(Date.now()));
      return;
    }

    validatingRef.current = true;

    try {
      const uniqueProductIds = [...new Set(items.map(i => i.id))];
      const storedColorAttributeIds = [...new Set(items.map(i => i.colorAttributeId).filter(Boolean) as string[])];
      const hasColorEntries = items.some(item => item.colorCode != null || item.colorValueId != null);
      const hasColorCodeFallbackEntries = items.some(item => item.colorCode != null && !item.colorValueId);

      const [
        { data: productsData },
        { data: variationsData },
        { data: colorAttributesData },
      ] = await Promise.all([
        supabase
          .from('products')
          .select('id')
          .in('id', uniqueProductIds)
          .eq('store_id', sid)
          .eq('is_active', true),
        hasColorEntries
          ? supabase
              .from('product_variations_v2')
              .select('product_id, attributes')
              .in('product_id', uniqueProductIds)
              .eq('is_active', true)
          : Promise.resolve({ data: [] as Array<{ product_id: string; attributes: Record<string, string> | null }> }),
        hasColorEntries
          ? supabase
              .from('attributes')
              .select('id')
              .eq('store_id', sid)
              .eq('type', 'color')
          : Promise.resolve({ data: [] as Array<{ id: string }> }),
      ]);

      const activeIds = new Set((productsData || []).map(product => product.id));
      const colorAttributeIds = new Set<string>([
        ...(colorAttributesData || []).map(attribute => attribute.id),
        ...storedColorAttributeIds,
      ]);

      const activeColorValueIdsByProduct = new Map<string, Set<string>>();

      for (const variation of variationsData || []) {
        const attributes = variation.attributes && typeof variation.attributes === 'object'
          ? variation.attributes as Record<string, string>
          : {};

        for (const [attributeId, valueId] of Object.entries(attributes)) {
          if (!valueId || !colorAttributeIds.has(attributeId)) continue;

          if (!activeColorValueIdsByProduct.has(variation.product_id)) {
            activeColorValueIdsByProduct.set(variation.product_id, new Set<string>());
          }

          activeColorValueIdsByProduct.get(variation.product_id)!.add(valueId);
        }
      }

      const colorValueIdsByCode = new Map<number, Set<string>>();

      if (hasColorCodeFallbackEntries && colorAttributeIds.size > 0) {
        const { data: colorValuesData } = await supabase
          .from('attribute_values')
          .select('id, value_code, attribute_id')
          .in('attribute_id', Array.from(colorAttributeIds));

        for (const value of colorValuesData || []) {
          if (value.value_code == null) continue;

          if (!colorValueIdsByCode.has(value.value_code)) {
            colorValueIdsByCode.set(value.value_code, new Set<string>());
          }

          colorValueIdsByCode.get(value.value_code)!.add(value.id);
        }
      }

      const filtered = items.filter(item => {
        if (!activeIds.has(item.id)) return false;

        const isColorSpecific = item.colorCode != null || item.colorValueId != null;
        if (!isColorSpecific) return true;

        const activeColorValueIds = activeColorValueIdsByProduct.get(item.id);
        if (!activeColorValueIds || activeColorValueIds.size === 0) return false;

        if (item.colorValueId) {
          return activeColorValueIds.has(item.colorValueId);
        }

        if (item.colorCode != null) {
          const possibleValueIds = colorValueIdsByCode.get(item.colorCode);
          if (!possibleValueIds || possibleValueIds.size === 0) return false;

          for (const valueId of possibleValueIds) {
            if (activeColorValueIds.has(valueId)) return true;
          }

          return false;
        }

        return true;
      });

      const cleaned = deduplicateItems(
        removeExpiredItems(filtered).sort((a, b) => b.viewedAt - a.viewedAt)
      );

      if (JSON.stringify(cleaned) !== JSON.stringify(items)) {
        persistItems(sid, cleaned);
        setRecentlyViewed(cleaned);
      }

      localStorage.setItem(`${VALIDATION_TS_KEY}_${sid}`, String(Date.now()));
    } catch (err) {
      console.error('Error validating recently viewed products:', err);
    } finally {
      validatingRef.current = false;
    }
  }, []);

  // Load from localStorage on mount, then validate against DB
  useEffect(() => {
    if (!storeId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${storeId}`);
      if (stored) {
        let parsed = JSON.parse(stored) as RecentlyViewedProduct[];
        // Remove expired items
        parsed = removeExpiredItems(parsed);
        // Sort by most recent first, then deduplicate
        const sorted = parsed.sort((a, b) => b.viewedAt - a.viewedAt);
        const deduped = deduplicateItems(sorted);
        setRecentlyViewed(deduped);
        // Persist cleaned list
        persistItems(storeId, deduped);

        // Always validate on mount to catch deleted products quickly
        if (deduped.length > 0) {
          void validateAgainstDb(storeId, deduped);
        }
      }
    } catch (error) {
      console.error('Error loading recently viewed products:', error);
    }
  }, [storeId, validateAgainstDb]);

  useEffect(() => {
    if (!storeId || recentlyViewed.length === 0) return;

    const maybeValidate = () => {
      const lastValidatedAt = Number(localStorage.getItem(`${VALIDATION_TS_KEY}_${storeId}`) || 0);
      if (!lastValidatedAt || Date.now() - lastValidatedAt >= VALIDATION_INTERVAL_MS) {
        void validateAgainstDb(storeId, recentlyViewed);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        maybeValidate();
      }
    };

    const intervalId = window.setInterval(maybeValidate, VALIDATION_INTERVAL_MS);
    window.addEventListener('focus', maybeValidate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', maybeValidate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [storeId, recentlyViewed, validateAgainstDb]);

  // Add a product to recently viewed
  const addToRecentlyViewed = useCallback((product: Omit<RecentlyViewedProduct, 'viewedAt'>) => {
    if (!storeId) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${storeId}`);
      let items: RecentlyViewedProduct[] = stored ? JSON.parse(stored) : [];
      
      // Remove expired
      items = removeExpiredItems(items);
      
      // Remove if same product+color already exists
      const newKey = buildItemKey(product);
      items = items.filter(item => buildItemKey(item) !== newKey);
      
      // Add to beginning with timestamp
      items.unshift({
        ...product,
        viewedAt: Date.now(),
      });
      
      // Limit to MAX_ITEMS
      items = items.slice(0, MAX_ITEMS);

      // Deduplicate (remove parent entries when color variants exist)
      items = deduplicateItems(items);
      
       persistItems(storeId, items);
      setRecentlyViewed(items);
    } catch (error) {
      console.error('Error saving recently viewed product:', error);
    }
  }, [storeId]);

  // Get recently viewed products excluding specific IDs or composite keys
  // Supports both plain product IDs (excludes only entries without colorCode)
  // and composite keys like "productId__color_3" (excludes exact variant)
  const getRecentlyViewed = useCallback((excludeKeys: string[] = [], limit: number = 10) => {
    return recentlyViewed
      .filter(item => {
        const compositeKey = buildItemKey(item);
        // If the composite key is in the exclude list, exclude this item
        if (excludeKeys.includes(compositeKey)) return false;
        // If the plain ID is in the exclude list, only exclude if this item has NO colorCode
        // (i.e., don't exclude color variants when only the plain product ID is passed)
        if (item.colorCode == null && excludeKeys.includes(item.id)) return false;
        return true;
      })
      .slice(0, limit);
  }, [recentlyViewed]);

  return {
    recentlyViewed,
    addToRecentlyViewed,
    getRecentlyViewed,
    hasRecentlyViewed: recentlyViewed.length > 0,
  };
}
