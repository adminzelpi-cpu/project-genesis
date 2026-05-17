/**
 * Generates the SAME retailer ID format used by the Meta/Google catalog feed
 * (see supabase/functions/generate-feed/index.ts → getVariationRetailerId).
 *
 * Format: P{product_code}[-C{colorCode}][-S{sizeCode}]
 * Falls back to P{shortHash(product.id)} when product_code is missing.
 *
 * IMPORTANT: This MUST stay in sync with the feed function. If the feed format
 * changes, change here too — otherwise Meta Pixel ↔ Catalog matching breaks
 * (Advantage+ Catalog Sales / DPA stop working).
 */

interface ProductLike {
  id: string;
  product_code?: number | null;
}

interface AttributeValueLike {
  id: string;
  attribute_id: string;
  value_code?: number | null;
}

interface AttributeDefLike {
  id: string;
  type?: string | null; // 'color' | 'size' | etc.
}

function shortHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}

export function getProductRetailerId(product: ProductLike): string {
  return product.product_code ? `P${product.product_code}` : `P${shortHash(product.id)}`;
}

/**
 * Build the variation retailer ID matching the feed format.
 * @param product   The product
 * @param variation Object with .id and .attributes (Record<attrId, valueId>)
 * @param attributeDefs Array of attribute definitions with type
 * @param attributeValues Array of attribute values with value_code
 */
export function getVariationRetailerId(
  product: ProductLike,
  variation: { id: string; attributes?: Record<string, string> | null },
  attributeDefs: AttributeDefLike[],
  attributeValues: AttributeValueLike[]
): string {
  const base = getProductRetailerId(product);
  if (!variation.attributes) return `${base}-${shortHash(variation.id)}`;

  const defMap = new Map(attributeDefs.map((d) => [d.id, d]));
  const valMap = new Map(attributeValues.map((v) => [v.id, v]));

  let colorCode: number | null = null;
  let sizeCode: number | null = null;
  for (const [attrId, valueId] of Object.entries(variation.attributes)) {
    const t = defMap.get(attrId)?.type;
    const code = valMap.get(valueId)?.value_code;
    if (t === 'color' && code != null) colorCode = code;
    else if (t === 'size' && code != null) sizeCode = code;
  }

  const parts: string[] = [base];
  if (colorCode != null) parts.push(`C${colorCode}`);
  if (sizeCode != null) parts.push(`S${sizeCode}`);
  if (parts.length === 1) parts.push(shortHash(variation.id));
  return parts.join('-');
}

/**
 * Build the retailer ID directly from a cart item that already carries the
 * resolved product/color/size codes. Used when persisting orders so the
 * Pixel/CAPI Purchase event matches the catalog feed without needing to
 * re-resolve attributes.
 */
export function buildRetailerIdFromCodes(params: {
  productCode?: number | null;
  productId?: string;
  colorCode?: number | null;
  sizeCode?: number | null;
  variationId?: string | null;
}): string {
  const base = params.productCode != null
    ? `P${params.productCode}`
    : `P${shortHash(params.productId || 'unknown')}`;
  const parts: string[] = [base];
  if (params.colorCode != null) parts.push(`C${params.colorCode}`);
  if (params.sizeCode != null) parts.push(`S${params.sizeCode}`);
  if (parts.length === 1 && params.variationId) {
    parts.push(shortHash(params.variationId));
  }
  return parts.join('-');
}
/**
 * Derive the Meta `content_ids` group from a feed-format retailer_id, mirroring
 * exactly the `item_group_id` produced by `generate-feed`.
 *
 * Rules (must match the feed):
 * - `display_variations_separately = true`  → group by product+color → strip the size suffix
 *     "P7-C3-S2" → "P7-C3"   |   "P7-C3" → "P7-C3"   |   "P7" → "P7"
 * - `display_variations_separately = false` → group by parent product → strip color & size
 *     "P7-C3-S2" → "P7"      |   "P7-C3" → "P7"      |   "P7" → "P7"
 *
 * If the input is not in the feed format (e.g. raw UUID legacy id), it's returned as-is.
 */
export function getContentGroupId(
  retailerId: string,
  displayVariationsSeparately?: boolean | null,
): string {
  if (!retailerId || typeof retailerId !== 'string') return retailerId;
  // Strip any -S{digits} suffix
  let out = retailerId.replace(/-S\d+$/i, '');
  // When NOT separating by color, also strip -C{digits}
  if (!displayVariationsSeparately) {
    out = out.replace(/-C\d+$/i, '');
  }
  return out;
}
