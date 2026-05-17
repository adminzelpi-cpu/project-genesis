/**
 * Resolve the variation label for an order item, following the same priority
 * used across MiniCart / Checkout / Thank-you / Email so the customer sees
 * exactly the same variant text everywhere.
 *
 * Priority:
 *   1. snapshot.variation_name (when stored at order time)
 *   2. item.variation_name
 *   3. item.variation
 *   4. item.variant         (current useCreateOrder writes this)
 *   5. item.color / item.size (joined as "Color / Size")
 */
export function getOrderItemVariant(
  item: Record<string, any> | null | undefined,
  snapshot?: Record<string, any> | null,
): string | null {
  if (!item && !snapshot) return null;

  const direct =
    snapshot?.variation_name ||
    item?.variation_name ||
    item?.variation ||
    item?.variant;

  if (direct && typeof direct === "string" && direct.trim().length > 0) {
    return direct.trim();
  }

  const color = item?.color || snapshot?.color;
  const size = item?.size || snapshot?.size;
  const parts = [color, size].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  if (parts.length > 0) return parts.join(" / ");

  return null;
}
