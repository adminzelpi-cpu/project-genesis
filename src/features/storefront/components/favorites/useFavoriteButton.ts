import { useCallback, useEffect, useRef, useState } from "react";
import { useFavorites } from "@/features/customers/hooks/useFavorites";
import { useCustomerAuth } from "@/features/auth/hooks/useCustomerAuth";

interface UseFavoriteButtonOptions {
  productId: string;
  colorValueId?: string | null;
  productName?: string;
  onAuthRequired?: (productName?: string) => void;
}

export function useFavoriteButton({
  productId,
  colorValueId,
  productName,
  onAuthRequired,
}: UseFavoriteButtonOptions) {
  const { isAuthenticated, loading } = useCustomerAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingFavoriteRef = useRef(false);
  const wasAuthenticatedRef = useRef(isAuthenticated);
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  // When auth flips from false → true and there's a pending favorite intent,
  // auto-add it. Covers signup-from-favorite-modal flow.
  useEffect(() => {
    if (loading) return;
    const justAuthenticated = !wasAuthenticatedRef.current && isAuthenticated;
    wasAuthenticatedRef.current = isAuthenticated;

    if (justAuthenticated && pendingFavoriteRef.current) {
      pendingFavoriteRef.current = false;
      (async () => {
        try {
          await addFavorite.mutateAsync({
            productId,
            colorValueId: colorValueId || undefined,
          });
        } catch (err) {
          console.error("[useFavoriteButton] Failed to auto-add favorite after auth:", err);
        }
      })();
    }
  }, [isAuthenticated, loading, productId, colorValueId, addFavorite]);

  const isFavorited = isFavorite(productId, colorValueId);

  const toggleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      // Mark intent so it auto-adds after signup/login
      pendingFavoriteRef.current = true;
      onAuthRequired?.(productName);
      return;
    }

    setIsProcessing(true);
    try {
      const params = { productId, colorValueId: colorValueId || undefined };
      if (isFavorited) {
        await removeFavorite.mutateAsync(params);
      } else {
        await addFavorite.mutateAsync(params);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isAuthenticated, isFavorited, productId, colorValueId, productName, onAuthRequired, addFavorite, removeFavorite]);

  return {
    isFavorited,
    isProcessing,
    isAuthenticated: !!isAuthenticated,
    toggleFavorite,
  };
}
