/**
 * Converts a color name to a URL-friendly slug.
 * "Azul Marinho" → "azul-marinho"
 * "Bege" → "bege"
 */
export function slugifyColor(colorName: string): string {
  return colorName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extracts the product_code from a slug-with-code URL segment.
 * "camisa-polo-3" → { baseSlug: "camisa-polo", productCode: 3 }
 * "camisa-polo" → { baseSlug: "camisa-polo", productCode: null }
 */
export function extractProductCodeFromSlug(slugParam: string): {
  baseSlug: string;
  productCode: number | null;
} {
  const match = slugParam.match(/^(.*)-(\d+)$/);
  if (match) {
    return { baseSlug: match[1], productCode: parseInt(match[2]) };
  }
  return { baseSlug: slugParam, productCode: null };
}

export interface StorefrontProductLinkOptions {
  storeSlug: string;
  productSlug: string;
  /** Numeric product code (auto-generated) */
  productCode?: number | null;
  /** Numeric color value_code */
  colorCode?: number | null;
  /** Legacy: color name (will be slugified as fallback) */
  color?: string;
  /** Optional path builder from useStorePath – handles subdomain vs path mode */
  buildPath?: (path: string) => string;
}

export function buildStorefrontProductLink({
  storeSlug,
  productSlug,
  productCode,
  colorCode,
  color,
  buildPath,
}: StorefrontProductLinkOptions) {
  // Build slug with product code appended (e.g., camisa-polo-3)
  const slugPart = productCode ? `${productSlug}-${productCode}` : productSlug;
  const relativePath = `/product/${slugPart}`;
  const base = buildPath ? buildPath(relativePath) : `/store/${storeSlug}/product/${slugPart}`;

  const params = new URLSearchParams();
  if (colorCode != null) {
    params.set("cor", String(colorCode));
  } else if (color) {
    // Legacy fallback: use slugified color name
    params.set("cor", slugifyColor(color));
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
