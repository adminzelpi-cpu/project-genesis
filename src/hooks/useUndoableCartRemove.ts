import { useRef, useCallback } from "react";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "sonner";

const UNDO_DELAY_MS = 5000;

export function useUndoableCartRemove() {
  const { removeItem, addItem } = useCart();
  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const undoneKeys = useRef<Set<string>>(new Set());

  const getItemKey = (item: { id: string; variant?: string; variationId?: string }) =>
    item.variationId || `${item.id}-${item.variant || ""}`;

  const handleRemoveWithUndo = useCallback(
    (item: CartItem) => {
      const key = getItemKey(item);

      // Cancel any existing pending removal for this item
      const existing = pendingTimers.current.get(key);
      if (existing) clearTimeout(existing);

      // Reset undo state for this key
      undoneKeys.current.delete(key);

      // Save item data for potential undo
      const savedItem = { ...item };

      // Remove immediately from cart
      removeItem(item.id, item.variant, item.variationId);

      // Generate a unique toast id so we can dismiss it
      const toastId = `undo-${key}-${Date.now()}`;

      // Show toast with undo
      toast(savedItem.name, {
        id: toastId,
        description: "foi removido do carrinho",
        duration: UNDO_DELAY_MS,
        position: "top-center",
        className: "undo-remove-toast",
        action: {
          label: "Desfazer",
          onClick: (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Prevent multiple undos for the same removal
            if (undoneKeys.current.has(key)) return;
            undoneKeys.current.add(key);

            // Create a temporary invisible overlay to absorb any residual
            // click/pointerup events that would hit elements underneath
            // (e.g. the cart icon in the header) after Sonner auto-removes
            // the toast from the DOM mid-click-cycle.
            const shield = document.createElement("div");
            shield.style.cssText =
              "position:fixed;inset:0;z-index:9998;pointer-events:auto;background:transparent;";
            document.body.appendChild(shield);
            setTimeout(() => shield.remove(), 300);

            // Cancel the pending timer
            const timer = pendingTimers.current.get(key);
            if (timer) {
              clearTimeout(timer);
              pendingTimers.current.delete(key);
            }

            // Re-add the item with original quantity in one go
            for (let i = 0; i < savedItem.quantity; i++) {
              addItem({
                id: savedItem.id,
                name: savedItem.name,
                price: savedItem.price,
                image: savedItem.image,
                variant: savedItem.variant,
                variationId: savedItem.variationId,
                color: savedItem.color,
                size: savedItem.size,
                slug: savedItem.slug,
                productCode: savedItem.productCode,
                colorCode: savedItem.colorCode,
                sizeCode: savedItem.sizeCode,
              }, { skipCartOpen: true });
            }

            toast.dismiss(toastId);
          },
        },
      });

      // Set a cleanup timer
      const timer = setTimeout(() => {
        pendingTimers.current.delete(key);
        undoneKeys.current.delete(key);
      }, UNDO_DELAY_MS + 500);

      pendingTimers.current.set(key, timer);
    },
    [removeItem, addItem]
  );

  return { handleRemoveWithUndo };
}
