import { useState, useEffect, useCallback } from "react";
import { useValidateStock } from "./useValidateStock";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  variant?: string;
  variationId?: string;
}

interface StockError {
  product_id: string;
  variation_id: string | null;
  product_name: string;
  requested: number;
  available: number;
}

interface UseCheckoutStockValidationProps {
  items: CartItem[];
  enabled?: boolean;
}

export function useCheckoutStockValidation({ items, enabled = true }: UseCheckoutStockValidationProps) {
  const { validateStock } = useValidateStock();
  const [isValidating, setIsValidating] = useState(false);
  const [stockErrors, setStockErrors] = useState<StockError[]>([]);
  const [hasValidated, setHasValidated] = useState(false);

  // Create a stable key to detect cart changes
  const cartKey = items.map(i => `${i.id}:${i.variationId || ''}:${i.quantity}`).join('|');

  const validate = useCallback(async () => {
    if (!enabled || items.length === 0) {
      setStockErrors([]);
      return true;
    }

    setIsValidating(true);
    try {
      const result = await validateStock(items);
      setStockErrors(result.errors || []);
      setHasValidated(true);
      return result.valid;
    } catch (error) {
      console.error('Stock validation error:', error);
      setStockErrors([]);
      return true; // Allow checkout on error
    } finally {
      setIsValidating(false);
    }
  }, [items, enabled, validateStock]);

  // Validate on mount and when cart changes
  useEffect(() => {
    if (enabled && items.length > 0) {
      validate();
    }
  }, [cartKey, enabled]);

  // Reset validation when cart changes
  useEffect(() => {
    setHasValidated(false);
  }, [cartKey]);

  return {
    isValidating,
    stockErrors,
    hasValidated,
    validate,
    hasStockIssues: stockErrors.length > 0,
  };
}
