import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  id: string;
  quantity: number;
  variationId?: string;
}

export interface CartStockIssue {
  productId: string;
  variationId: string | null;
  productName: string;
  requested: number;
  available: number; // -1 means infinite stock
}

/**
 * Validates stock for cart items directly (no RPC needed).
 * Returns stock issues for items that are out of stock or have insufficient quantity.
 * Skips items with infinite stock (stock_quantity === null).
 */
export function useCartStockValidation(items: CartItem[], enabled = true) {
  const [stockIssues, setStockIssues] = useState<CartStockIssue[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const prevCartKey = useRef("");

  const cartKey = items.map(i => `${i.id}:${i.variationId || ''}:${i.quantity}`).join('|');

  const validate = useCallback(async () => {
    if (!enabled || items.length === 0) {
      setStockIssues([]);
      return;
    }

    setIsValidating(true);
    try {
      const issues: CartStockIssue[] = [];

      // Separate items with variations vs without
      const variationIds = items.filter(i => i.variationId).map(i => i.variationId!);
      const productOnlyIds = items.filter(i => !i.variationId).map(i => i.id);

      // Fetch variation stock
      if (variationIds.length > 0) {
        const { data: variations } = await supabase
          .from('product_variations_v2')
          .select('id, stock_quantity, product_id, attributes')
          .in('id', variationIds);

        if (variations) {
          for (const v of variations) {
            // null = infinite stock, skip
            if (v.stock_quantity === null) continue;
            const cartItem = items.find(i => i.variationId === v.id);
            if (!cartItem) continue;
            if (v.stock_quantity < cartItem.quantity) {
              // Get product name
              const attrs = v.attributes as Record<string, string> | null;
              const variantLabel = attrs ? Object.values(attrs).join(' / ') : '';
              issues.push({
                productId: v.product_id,
                variationId: v.id,
                productName: variantLabel,
                requested: cartItem.quantity,
                available: v.stock_quantity,
              });
            }
          }
        }
      }

      // Fetch product-only stock (items without variations)
      if (productOnlyIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, stock_quantity')
          .in('id', productOnlyIds);

        if (products) {
          for (const p of products) {
            if (p.stock_quantity === null) continue; // infinite
            const cartItem = items.find(i => i.id === p.id && !i.variationId);
            if (!cartItem) continue;
            if (p.stock_quantity < cartItem.quantity) {
              issues.push({
                productId: p.id,
                variationId: null,
                productName: p.name,
                requested: cartItem.quantity,
                available: p.stock_quantity,
              });
            }
          }
        }
      }

      // Enrich variation issues with product names
      if (issues.some(i => i.variationId)) {
        const productIds = [...new Set(issues.filter(i => i.variationId).map(i => i.productId))];
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds);
          if (products) {
            for (const issue of issues) {
              if (issue.variationId) {
                const product = products.find(p => p.id === issue.productId);
                if (product) {
                  issue.productName = issue.productName
                    ? `${product.name} (${issue.productName})`
                    : product.name;
                }
              }
            }
          }
        }
      }

      setStockIssues(issues);
    } catch (error) {
      console.error('[useCartStockValidation] Error:', error);
      setStockIssues([]);
    } finally {
      setIsValidating(false);
    }
  }, [items, enabled]);

  // Validate when cart changes
  useEffect(() => {
    if (cartKey !== prevCartKey.current) {
      prevCartKey.current = cartKey;
      validate();
    }
  }, [cartKey, validate]);

  const getItemStockIssue = useCallback((productId: string, variationId?: string) => {
    return stockIssues.find(i => 
      variationId 
        ? i.variationId === variationId 
        : i.productId === productId && !i.variationId
    );
  }, [stockIssues]);

  return {
    stockIssues,
    isValidating,
    hasStockIssues: stockIssues.length > 0,
    getItemStockIssue,
    validate,
  };
}
