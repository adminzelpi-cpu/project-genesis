import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Product {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  price: number;
  sale_price: number | null;
  images: Array<{ url: string; is_primary?: boolean }> | string[] | null;
  brand: string | null;
  stock_quantity: number | null;
  category_id: string | null;
  gender: string | null;
  age_group: string | null;
  material: string | null;
  product_code: number | null;
  display_variations_separately: boolean | null;
}

interface Variation {
  id: string;
  product_id: string;
  price: number;
  sale_price: number | null;
  stock_quantity: number | null;
  images: Array<{ url: string; is_primary?: boolean }> | string[] | null;
  image_url: string | null;
  attributes: Record<string, string>;
  gtin: string | null;
  mpn: string | null;
  ean: string | null;
}

interface Store {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  google_category: string | null;
  parent_id: string | null;
}

interface AttributeDef {
  id: string;
  name: string;
  type: string; // 'color' | 'size' | etc.
}

interface AttributeValue {
  id: string;
  value: string;
  color_hex: string | null;
  attribute_id: string;
}

// ── Helpers ──

function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatPrice(price: number, currency: string = 'BRL'): string {
  return `${price.toFixed(2)} ${currency}`;
}

function getAvailability(stock: number | null): string {
  if (stock === null) return 'in_stock';
  return stock > 0 ? 'in_stock' : 'out_of_stock';
}

/** Returns the quantity to send in feeds. NULL stock = infinite → use a high fixed number. */
function getQuantity(stock: number | null): number {
  if (stock === null) return 9999;
  return Math.max(0, stock);
}

/** Extract URL strings from images field (handles both [{url}] objects and plain strings) */
function extractImageUrls(images: Product['images'] | Variation['images']): string[] {
  if (!images || !Array.isArray(images) || images.length === 0) return [];

  return images.map(img => {
    if (typeof img === 'string') return img;
    if (img && typeof img === 'object' && 'url' in img) return (img as { url: string }).url;
    return '';
  }).filter(u => typeof u === 'string' && u.trim().length > 0);
}

/** Get primary image URL, preferring is_primary flag */
function getPrimaryImageUrl(images: Product['images'] | Variation['images']): string | null {
  if (!images || !Array.isArray(images) || images.length === 0) return null;

  for (const img of images) {
    if (typeof img === 'object' && img && 'is_primary' in img && img.is_primary && 'url' in img) {
      const u = (img as { url: string }).url;
      if (u && u.trim()) return u;
    }
  }

  const urls = extractImageUrls(images);
  return urls[0] || null;
}

function getProductMainImage(product: Product, variations: Variation[]): string {
  const primary = getPrimaryImageUrl(product.images);
  if (primary) return primary;

  for (const v of variations) {
    const vPrimary = getPrimaryImageUrl(v.images);
    if (vPrimary) return vPrimary;
    if (v.image_url && v.image_url.trim()) return v.image_url;
  }
  return '';
}

/** Find first non-empty image among variations sharing the same color as `variation`. */
function getSameColorFallbackImage(
  variation: Variation,
  variations: Variation[],
  attributeDefs: Record<string, AttributeDef>
): string | null {
  const colorAttrEntry = Object.entries(variation.attributes || {}).find(
    ([attrId]) => attributeDefs[attrId]?.type === 'color'
  );
  if (!colorAttrEntry) return null;
  const [colorAttrId, colorValueId] = colorAttrEntry;
  for (const v of variations) {
    if (v.id === variation.id) continue;
    if (v.attributes?.[colorAttrId] !== colorValueId) continue;
    const urls = extractImageUrls(v.images);
    if (urls.length > 0) return urls[0];
    if (v.image_url && v.image_url.trim()) return v.image_url;
  }
  return null;
}

function getVariationImageUrls(
  variation: Variation,
  product: Product,
  variations: Variation[] = [],
  attributeDefs: Record<string, AttributeDef> = {}
): string[] {
  const varUrls = extractImageUrls(variation.images);
  if (varUrls.length > 0) return varUrls;

  if (variation.image_url && variation.image_url.trim()) return [variation.image_url];

  const sameColor = getSameColorFallbackImage(variation, variations, attributeDefs);
  if (sameColor) return [sameColor];

  return extractImageUrls(product.images);
}


/**
 * Resolve variation attributes to human-readable color/size values.
 * attributes = { "attr_uuid": "value_uuid" }
 * We match attr_uuid → AttributeDef (by type) and value_uuid → AttributeValue (by id).
 */
function resolveVariationAttributes(
  attributes: Record<string, string>,
  attributeDefs: Record<string, AttributeDef>,
  attributeValues: Record<string, AttributeValue>
): { color: string | null; size: string | null; pattern: string | null; others: Record<string, string> } {
  let color: string | null = null;
  let size: string | null = null;
  let pattern: string | null = null;
  const others: Record<string, string> = {};

  for (const [attrId, valueId] of Object.entries(attributes)) {
    const attrDef = attributeDefs[attrId];
    const attrVal = attributeValues[valueId];
    if (!attrVal) continue;
    
    const resolvedValue = attrVal.value;
    const attrName = attrDef?.name?.toLowerCase() || '';
    
    if (attrDef?.type === 'color') {
      color = resolvedValue;
    } else if (attrDef?.type === 'size') {
      size = resolvedValue;
    } else if (attrName.includes('estampa') || attrName.includes('pattern') || attrName.includes('padrao') || attrName.includes('padrão')) {
      pattern = resolvedValue;
    } else {
      others[attrDef?.name || attrId] = resolvedValue;
    }
  }

  return { color, size, pattern, others };
}

/** Build variant title suffix. Size is intentionally excluded — sizes are conveyed via <g:size>
 *  and grouped under the same item_group_id, so showing them in the title is redundant and noisy
 *  (e.g., "Polo Preta - P" when there's already a size selector). */
function buildVariantTitleSuffix(color: string | null, _size: string | null, pattern: string | null, others: Record<string, string>): string {
  const parts: string[] = [];
  if (color) parts.push(color);
  if (pattern) parts.push(pattern);
  // Add custom attributes (e.g., "128GB", "220V") — these usually identify a distinct SKU
  for (const [, value] of Object.entries(others)) {
    parts.push(value);
  }
  return parts.length > 0 ? ` - ${parts.join(' - ')}` : '';
}

/** Build custom_label XML tags from non-standard attributes (up to 5 labels: 0-4) */
function buildCustomLabelsXml(others: Record<string, string>, indent: string, prefix: string = 'g:'): string {
  const entries = Object.entries(others);
  if (entries.length === 0) return '';
  return entries.slice(0, 5).map(([name, value], i) => 
    `${indent}<${prefix}custom_label_${i}>${escapeXml(`${name}: ${value}`)}</${prefix}custom_label_${i}>`
  ).join('\n');
}

/** Short, deterministic 6-char fallback ID derived from a UUID (no external deps). */
function shortHash(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 6).toUpperCase();
}

/** Stable short product code: "P42" when product_code exists, else "P" + 6-char hash. */
function getShortProductCode(product: Product): string {
  return product.product_code ? `P${product.product_code}` : `P${shortHash(product.id)}`;
}

/** Build a short, human-readable retailer ID for a variation.
 *  Format: P{code}[-C{colorCode}][-S{sizeCode}] (e.g. "P42-C1-S3").
 *  Falls back to short hash of variation.id when codes are missing. */
function getVariationRetailerId(
  product: Product,
  variation: Variation,
  attributeDefs: Record<string, AttributeDef>,
  valueCodeMap: Record<string, number | null>
): string {
  const parts: string[] = [getShortProductCode(product)];
  let colorCode: number | null = null;
  let sizeCode: number | null = null;
  for (const [attrId, valueId] of Object.entries(variation.attributes || {})) {
    const t = attributeDefs[attrId]?.type;
    const code = valueCodeMap[valueId];
    if (t === 'color' && code != null) colorCode = code;
    else if (t === 'size' && code != null) sizeCode = code;
  }
  if (colorCode != null) parts.push(`C${colorCode}`);
  if (sizeCode != null) parts.push(`S${sizeCode}`);
  // If no readable codes were found, append a short hash to keep uniqueness
  if (parts.length === 1) parts.push(shortHash(variation.id));
  return parts.join('-');
}

function buildProductUrl(storeUrl: string, product: Product, variation?: Variation, colorValueCode?: number | null): string {
  // Storefront route is `/product/:slug` and slug parser expects `slug-<code>` (no zero padding).
  // See src/features/storefront/lib/buildStorefrontProductLink.ts → extractProductCodeFromSlug.
  const slug = product.product_code 
    ? `${product.slug}-${product.product_code}`
    : product.slug;
  
  let url = `${storeUrl}/product/${slug}`;
  
  // Add color param for deep-linking if available
  if (variation && colorValueCode) {
    url += `?cor=${colorValueCode}`;
  }
  
  return url;
}

/**
 * Returns the item_group_id for a variation.
 * - When `display_variations_separately` is true AND the variation has a color:
 *   groups by color (each color = its own product card on Meta/TikTok feeds).
 * - Otherwise: groups all variations of the same product together (default behavior).
 */
function getItemGroupId(
  product: Product,
  variation: Variation,
  attributeDefs: Record<string, AttributeDef>,
  valueCodeMap: Record<string, number | null>
): string {
  const base = getShortProductCode(product); // e.g. "P42"
  if (product.display_variations_separately) {
    const colorEntry = Object.entries(variation.attributes || {}).find(
      ([attrId]) => attributeDefs[attrId]?.type === 'color'
    );
    if (colorEntry) {
      const colorCode = valueCodeMap[colorEntry[1]];
      return colorCode != null ? `${base}-C${colorCode}` : `${base}-${shortHash(colorEntry[1])}`;
    }
  }
  return base;
}

// ── Feed Generators ──

function generateMetaFeed(
  store: Store, products: Product[], variationsByProduct: Record<string, Variation[]>,
  categories: Record<string, Category>, attributeDefs: Record<string, AttributeDef>,
  attributeValues: Record<string, AttributeValue>, valueCodeMap: Record<string, number | null>,
  storeUrl: string
): string {
  const updatedAt = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
  <title>${escapeXml(store.name)} - Product Catalog</title>
  <link href="${storeUrl}"/>
  <updated>${updatedAt}</updated>
`;

  for (const product of products) {
    const variations = variationsByProduct[product.id] || [];
    const category = product.category_id ? categories[product.category_id] : null;
    
    if (variations.length > 0) {
      for (const variation of variations) {
        const varImages = getVariationImageUrls(variation, product, variations, attributeDefs);
        const varMainImage = varImages[0] || getProductMainImage(product, variations);
        if (!varMainImage || !varMainImage.trim()) continue; // skip: feeds reject items without image
        const varAdditionalImages = varImages.slice(1, 11);
        
        const { color, size, pattern, others } = resolveVariationAttributes(variation.attributes || {}, attributeDefs, attributeValues);
        const titleSuffix = buildVariantTitleSuffix(color, size, pattern, others);
        
        const effectivePrice = variation.price || product.price;
        const effectiveSalePrice = variation.sale_price || product.sale_price;
        
        // Find color value_code for URL
        const colorValueId = Object.entries(variation.attributes || {}).find(([attrId]) => attributeDefs[attrId]?.type === 'color')?.[1];
        const colorCode = colorValueId ? valueCodeMap[colorValueId] : null;
        const productUrl = buildProductUrl(storeUrl, product, variation, colorCode);
        const customLabels = buildCustomLabelsXml(others, '    ', 'g:');
        
        xml += `  <entry>
    <g:id>${escapeXml(getVariationRetailerId(product, variation, attributeDefs, valueCodeMap))}</g:id>
    <g:title>${escapeXml(product.name)}${escapeXml(titleSuffix)}</g:title>
    <g:description>${escapeXml(stripHtml(product.description))}</g:description>
    <g:link>${escapeXml(productUrl)}</g:link>
    <g:image_link>${escapeXml(varMainImage)}</g:image_link>
${varAdditionalImages.map(img => `    <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join('\n')}
    <g:availability>${getAvailability(variation.stock_quantity)}</g:availability>
    <g:quantity>${getQuantity(variation.stock_quantity)}</g:quantity>
    <g:quantity_to_sell_on_facebook>${getQuantity(variation.stock_quantity)}</g:quantity_to_sell_on_facebook>
    <g:inventory>${getQuantity(variation.stock_quantity)}</g:inventory>
    <g:price>${formatPrice(effectivePrice)}</g:price>
${effectiveSalePrice && effectiveSalePrice < effectivePrice ? `    <g:sale_price>${formatPrice(effectiveSalePrice)}</g:sale_price>` : ''}
    <g:brand>${escapeXml(product.brand || store.name)}</g:brand>
    <g:condition>new</g:condition>
    <g:item_group_id>${escapeXml(getItemGroupId(product, variation, attributeDefs, valueCodeMap))}</g:item_group_id>
${color ? `    <g:color>${escapeXml(color)}</g:color>` : ''}
${size ? `    <g:size>${escapeXml(size)}</g:size>` : ''}
${pattern ? `    <g:pattern>${escapeXml(pattern)}</g:pattern>` : ''}
${product.gender ? `    <g:gender>${escapeXml(product.gender)}</g:gender>` : ''}
${product.age_group ? `    <g:age_group>${escapeXml(product.age_group)}</g:age_group>` : ''}
${product.material ? `    <g:material>${escapeXml(product.material)}</g:material>` : ''}
${(variation.gtin || variation.ean) ? `    <g:gtin>${escapeXml(variation.gtin || variation.ean)}</g:gtin>` : ''}
${variation.mpn ? `    <g:mpn>${escapeXml(variation.mpn)}</g:mpn>` : ''}
${(!variation.gtin && !variation.ean && !variation.mpn && !product.brand) ? `    <g:identifier_exists>no</g:identifier_exists>` : ''}
${category?.google_category ? `    <g:google_product_category>${escapeXml(category.google_category)}</g:google_product_category>` : ''}
${category?.name ? `    <g:product_type>${escapeXml(category.name)}</g:product_type>` : ''}
${customLabels ? `\n${customLabels}` : ''}
  </entry>
`;
      }
    } else {
      // Product without variations
      const mainImage = getProductMainImage(product, []);
      const additionalImages = extractImageUrls(product.images).slice(1, 11);
      const productUrl = buildProductUrl(storeUrl, product);
      const effectiveSalePrice = product.sale_price;
      
      xml += `  <entry>
    <g:id>${escapeXml(getShortProductCode(product))}</g:id>
    <g:title>${escapeXml(product.name)}</g:title>
    <g:description>${escapeXml(stripHtml(product.description))}</g:description>
    <g:link>${escapeXml(productUrl)}</g:link>
    <g:image_link>${escapeXml(mainImage)}</g:image_link>
${additionalImages.map(img => `    <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join('\n')}
    <g:availability>${getAvailability(product.stock_quantity)}</g:availability>
    <g:quantity>${getQuantity(product.stock_quantity)}</g:quantity>
    <g:quantity_to_sell_on_facebook>${getQuantity(product.stock_quantity)}</g:quantity_to_sell_on_facebook>
    <g:inventory>${getQuantity(product.stock_quantity)}</g:inventory>
    <g:price>${formatPrice(product.price)}</g:price>
${effectiveSalePrice && effectiveSalePrice < product.price ? `    <g:sale_price>${formatPrice(effectiveSalePrice)}</g:sale_price>` : ''}
    <g:brand>${escapeXml(product.brand || store.name)}</g:brand>
    <g:condition>new</g:condition>
${product.gender ? `    <g:gender>${escapeXml(product.gender)}</g:gender>` : ''}
${product.age_group ? `    <g:age_group>${escapeXml(product.age_group)}</g:age_group>` : ''}
${product.material ? `    <g:material>${escapeXml(product.material)}</g:material>` : ''}
${!product.brand ? `    <g:identifier_exists>no</g:identifier_exists>` : ''}
${category?.google_category ? `    <g:google_product_category>${escapeXml(category.google_category)}</g:google_product_category>` : ''}
${category?.name ? `    <g:product_type>${escapeXml(category.name)}</g:product_type>` : ''}
  </entry>
`;
    }
  }

  xml += `</feed>`;
  return xml;
}

function generateGoogleFeed(
  store: Store, products: Product[], variationsByProduct: Record<string, Variation[]>,
  categories: Record<string, Category>, attributeDefs: Record<string, AttributeDef>,
  attributeValues: Record<string, AttributeValue>, valueCodeMap: Record<string, number | null>,
  storeUrl: string
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(store.name)}</title>
    <link>${storeUrl}</link>
    <description>Product feed for Google Merchant Center</description>
`;

  for (const product of products) {
    const variations = variationsByProduct[product.id] || [];
    const category = product.category_id ? categories[product.category_id] : null;
    const defaultCategory = category?.google_category || 'Apparel &amp; Accessories';
    
    if (variations.length > 0) {
      for (const variation of variations) {
        const varImages = getVariationImageUrls(variation, product, variations, attributeDefs);
        const varMainImage = varImages[0] || getProductMainImage(product, variations);
        if (!varMainImage || !varMainImage.trim()) continue;
        const varAdditionalImages = varImages.slice(1, 11);
        
        const { color, size, pattern, others } = resolveVariationAttributes(variation.attributes || {}, attributeDefs, attributeValues);
        const titleSuffix = buildVariantTitleSuffix(color, size, pattern, others);
        
        const effectivePrice = variation.price || product.price;
        const effectiveSalePrice = variation.sale_price || product.sale_price;
        
        const colorValueId = Object.entries(variation.attributes || {}).find(([attrId]) => attributeDefs[attrId]?.type === 'color')?.[1];
        const colorCode = colorValueId ? valueCodeMap[colorValueId] : null;
        const productUrl = buildProductUrl(storeUrl, product, variation, colorCode);
        const customLabels = buildCustomLabelsXml(others, '      ', 'g:');
        
        xml += `    <item>
      <g:id>${escapeXml(getVariationRetailerId(product, variation, attributeDefs, valueCodeMap))}</g:id>
      <g:title>${escapeXml(product.name)}${escapeXml(titleSuffix)}</g:title>
      <g:description>${escapeXml(stripHtml(product.description))}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(varMainImage)}</g:image_link>
${varAdditionalImages.map(img => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join('\n')}
      <g:availability>${getAvailability(variation.stock_quantity)}</g:availability>
      <g:quantity>${getQuantity(variation.stock_quantity)}</g:quantity>
      <g:quantity_to_sell_on_facebook>${getQuantity(variation.stock_quantity)}</g:quantity_to_sell_on_facebook>
      <g:inventory>${getQuantity(variation.stock_quantity)}</g:inventory>
      <g:price>${formatPrice(effectivePrice)}</g:price>
${effectiveSalePrice && effectiveSalePrice < effectivePrice ? `      <g:sale_price>${formatPrice(effectiveSalePrice)}</g:sale_price>` : ''}
      <g:brand>${escapeXml(product.brand || store.name)}</g:brand>
      <g:condition>new</g:condition>
      <g:item_group_id>${escapeXml(getItemGroupId(product, variation, attributeDefs, valueCodeMap))}</g:item_group_id>
      <g:google_product_category>${defaultCategory}</g:google_product_category>
${color ? `      <g:color>${escapeXml(color)}</g:color>` : ''}
${size ? `      <g:size>${escapeXml(size)}</g:size>` : ''}
${pattern ? `      <g:pattern>${escapeXml(pattern)}</g:pattern>` : ''}
${product.gender ? `      <g:gender>${escapeXml(product.gender)}</g:gender>` : ''}
${product.age_group ? `      <g:age_group>${escapeXml(product.age_group)}</g:age_group>` : ''}
${product.material ? `      <g:material>${escapeXml(product.material)}</g:material>` : ''}
${(variation.gtin || variation.ean) ? `      <g:gtin>${escapeXml(variation.gtin || variation.ean)}</g:gtin>` : ''}
${variation.mpn ? `      <g:mpn>${escapeXml(variation.mpn)}</g:mpn>` : ''}
${(!variation.gtin && !variation.ean && !variation.mpn && !product.brand) ? `      <g:identifier_exists>no</g:identifier_exists>` : ''}
${category?.name ? `      <g:product_type>${escapeXml(category.name)}</g:product_type>` : ''}
${customLabels ? `\n${customLabels}` : ''}
    </item>
`;
      }
    } else {
      const mainImage = getProductMainImage(product, []);
      const additionalImages = extractImageUrls(product.images).slice(1, 11);
      const productUrl = buildProductUrl(storeUrl, product);
      const effectiveSalePrice = product.sale_price;
      
      xml += `    <item>
      <g:id>${escapeXml(getShortProductCode(product))}</g:id>
      <g:title>${escapeXml(product.name)}</g:title>
      <g:description>${escapeXml(stripHtml(product.description))}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
${additionalImages.map(img => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join('\n')}
      <g:availability>${getAvailability(product.stock_quantity)}</g:availability>
      <g:quantity>${getQuantity(product.stock_quantity)}</g:quantity>
      <g:quantity_to_sell_on_facebook>${getQuantity(product.stock_quantity)}</g:quantity_to_sell_on_facebook>
      <g:inventory>${getQuantity(product.stock_quantity)}</g:inventory>
      <g:price>${formatPrice(product.price)}</g:price>
${effectiveSalePrice && effectiveSalePrice < product.price ? `      <g:sale_price>${formatPrice(effectiveSalePrice)}</g:sale_price>` : ''}
      <g:brand>${escapeXml(product.brand || store.name)}</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>${defaultCategory}</g:google_product_category>
${product.gender ? `      <g:gender>${escapeXml(product.gender)}</g:gender>` : ''}
${product.age_group ? `      <g:age_group>${escapeXml(product.age_group)}</g:age_group>` : ''}
${product.material ? `      <g:material>${escapeXml(product.material)}</g:material>` : ''}
${!product.brand ? `      <g:identifier_exists>no</g:identifier_exists>` : ''}
${category?.name ? `      <g:product_type>${escapeXml(category.name)}</g:product_type>` : ''}
    </item>
`;
    }
  }

  xml += `  </channel>
</rss>`;
  return xml;
}

function generatePinterestFeed(
  store: Store, products: Product[], variationsByProduct: Record<string, Variation[]>,
  categories: Record<string, Category>, attributeDefs: Record<string, AttributeDef>,
  attributeValues: Record<string, AttributeValue>, valueCodeMap: Record<string, number | null>,
  storeUrl: string
): string {
  // Pinterest uses same format as Google
  return generateGoogleFeed(store, products, variationsByProduct, categories, attributeDefs, attributeValues, valueCodeMap, storeUrl);
}

function generateTikTokFeed(
  store: Store, products: Product[], variationsByProduct: Record<string, Variation[]>,
  categories: Record<string, Category>, attributeDefs: Record<string, AttributeDef>,
  attributeValues: Record<string, AttributeValue>, valueCodeMap: Record<string, number | null>,
  storeUrl: string
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(store.name)}</title>
    <link>${storeUrl}</link>
    <description>Product catalog for TikTok</description>
`;

  for (const product of products) {
    const variations = variationsByProduct[product.id] || [];
    
    if (variations.length > 0) {
      for (const variation of variations) {
        const varImages = getVariationImageUrls(variation, product, variations, attributeDefs);
        const varMainImage = varImages[0] || getProductMainImage(product, variations);
        if (!varMainImage || !varMainImage.trim()) continue;
        const varAdditionalImages = varImages.slice(1, 11);
        
        const { color, size, pattern, others } = resolveVariationAttributes(variation.attributes || {}, attributeDefs, attributeValues);
        const titleSuffix = buildVariantTitleSuffix(color, size, pattern, others);
        
        const effectivePrice = variation.price || product.price;
        const effectiveSalePrice = variation.sale_price || product.sale_price;
        
        const colorValueId = Object.entries(variation.attributes || {}).find(([attrId]) => attributeDefs[attrId]?.type === 'color')?.[1];
        const colorCode = colorValueId ? valueCodeMap[colorValueId] : null;
        const productUrl = buildProductUrl(storeUrl, product, variation, colorCode);
        const customLabels = buildCustomLabelsXml(others, '      ', '');
        
        xml += `    <item>
      <sku_id>${escapeXml(getVariationRetailerId(product, variation, attributeDefs, valueCodeMap))}</sku_id>
      <title>${escapeXml(product.name)}${escapeXml(titleSuffix)}</title>
      <description>${escapeXml(stripHtml(product.description))}</description>
      <availability>${getAvailability(variation.stock_quantity)}</availability>
      <quantity>${getQuantity(variation.stock_quantity)}</quantity>
      <condition>new</condition>
      <price>${formatPrice(effectivePrice)}</price>
${effectiveSalePrice && effectiveSalePrice < effectivePrice ? `      <sale_price>${formatPrice(effectiveSalePrice)}</sale_price>` : ''}
      <link>${escapeXml(productUrl)}</link>
      <image_link>${escapeXml(varMainImage)}</image_link>
${varAdditionalImages.map(img => `      <additional_image_link>${escapeXml(img)}</additional_image_link>`).join('\n')}
      <item_group_id>${escapeXml(getItemGroupId(product, variation, attributeDefs, valueCodeMap))}</item_group_id>
${product.brand ? `      <brand>${escapeXml(product.brand)}</brand>` : ''}
${color ? `      <color>${escapeXml(color)}</color>` : ''}
${size ? `      <size>${escapeXml(size)}</size>` : ''}
${pattern ? `      <pattern>${escapeXml(pattern)}</pattern>` : ''}
${product.gender ? `      <gender>${escapeXml(product.gender)}</gender>` : ''}
${product.age_group ? `      <age_group>${escapeXml(product.age_group)}</age_group>` : ''}
${product.material ? `      <material>${escapeXml(product.material)}</material>` : ''}
${variation.gtin ? `      <gtin>${escapeXml(variation.gtin)}</gtin>` : ''}
${variation.ean ? `      <gtin>${escapeXml(variation.ean)}</gtin>` : ''}
    </item>
`;
      }
    } else {
      const mainImage = getProductMainImage(product, []);
      const additionalImages = extractImageUrls(product.images).slice(1, 11);
      const productUrl = buildProductUrl(storeUrl, product);
      const effectiveSalePrice = product.sale_price;
      
      xml += `    <item>
      <sku_id>${escapeXml(getShortProductCode(product))}</sku_id>
      <title>${escapeXml(product.name)}</title>
      <description>${escapeXml(stripHtml(product.description))}</description>
      <availability>${getAvailability(product.stock_quantity)}</availability>
      <quantity>${getQuantity(product.stock_quantity)}</quantity>
      <condition>new</condition>
      <price>${formatPrice(product.price)}</price>
${effectiveSalePrice && effectiveSalePrice < product.price ? `      <sale_price>${formatPrice(effectiveSalePrice)}</sale_price>` : ''}
      <link>${escapeXml(productUrl)}</link>
      <image_link>${escapeXml(mainImage)}</image_link>
${additionalImages.map(img => `      <additional_image_link>${escapeXml(img)}</additional_image_link>`).join('\n')}
${product.brand ? `      <brand>${escapeXml(product.brand)}</brand>` : ''}
${product.gender ? `      <gender>${escapeXml(product.gender)}</gender>` : ''}
${product.age_group ? `      <age_group>${escapeXml(product.age_group)}</age_group>` : ''}
${product.material ? `      <material>${escapeXml(product.material)}</material>` : ''}
    </item>
`;
    }
  }

  xml += `  </channel>
</rss>`;
  return xml;
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const storeSlug = url.searchParams.get('store');
    const platform = url.searchParams.get('platform') || 'meta';

    if (!storeSlug) {
      return new Response(
        JSON.stringify({ error: 'store parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, slug')
      .eq('slug', storeSlug)
      .eq('is_active', true)
      .single();

    if (storeError || !store) {
      console.error('Store not found:', storeError);
      return new Response(
        JSON.stringify({ error: 'Store not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if feed is configured and active
    const { data: feedConfig } = await supabase
      .from('feed_configurations')
      .select('*')
      .eq('store_id', store.id)
      .eq('platform', platform)
      .single();

    if (feedConfig && !feedConfig.is_active) {
      return new Response(
        JSON.stringify({ error: 'Feed is not active' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, description, slug, price, sale_price, images, brand, stock_quantity, category_id, gender, age_group, material, product_code, display_variations_separately')
      .eq('store_id', store.id)
      .eq('is_active', true);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching products' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch variations
    const productIds = (products || []).map(p => p.id);
    
    let variations: Variation[] = [];
    if (productIds.length > 0) {
      const { data: variationsData } = await supabase
        .from('product_variations_v2')
        .select('id, product_id, price, sale_price, stock_quantity, images, image_url, attributes, gtin, mpn, ean')
        .in('product_id', productIds)
        .eq('is_active', true);
      variations = (variationsData || []) as Variation[];
    }

    const variationsByProduct: Record<string, Variation[]> = {};
    variations.forEach(v => {
      if (!variationsByProduct[v.product_id]) {
        variationsByProduct[v.product_id] = [];
      }
      variationsByProduct[v.product_id].push(v);
    });

    // Fetch attribute definitions for this store (to know which UUID is 'color' vs 'size')
    const { data: attributeDefsData } = await supabase
      .from('attributes')
      .select('id, name, type')
      .eq('store_id', store.id);

    const attributeDefs: Record<string, AttributeDef> = {};
    (attributeDefsData || []).forEach(a => {
      attributeDefs[a.id] = a;
    });

    // Fetch categories
    const categoryIds = [...new Set((products || []).map(p => p.category_id).filter(Boolean))];
    let categories: Record<string, Category> = {};
    if (categoryIds.length > 0) {
      const { data: categoriesData } = await supabase
        .from('product_categories')
        .select('id, name, google_category, parent_id')
        .in('id', categoryIds);
      (categoriesData || []).forEach(c => {
        categories[c.id] = c;
      });
    }

    // Collect all attribute value UUIDs from variations
    const allAttributeValueIds = new Set<string>();
    variations.forEach(v => {
      if (v.attributes) {
        Object.values(v.attributes).forEach(val => {
          if (val && typeof val === 'string') {
            allAttributeValueIds.add(val);
          }
        });
      }
    });

    // Fetch attribute values (id → human-readable name + value_code for URL)
    const attributeValues: Record<string, AttributeValue> = {};
    const valueCodeMap: Record<string, number | null> = {};
    
    if (allAttributeValueIds.size > 0) {
      const { data: attrValuesData } = await supabase
        .from('attribute_values')
        .select('id, value, color_hex, attribute_id, value_code')
        .in('id', [...allAttributeValueIds]);
      
      (attrValuesData || []).forEach((av: any) => {
        attributeValues[av.id] = av;
        valueCodeMap[av.id] = av.value_code || null;
      });
    }

    // Build store URL - prefer custom domain if available
    let storeUrl = `https://${store.slug}.zelpi.com.br`;
    
    const { data: customDomainData } = await supabase
      .from('custom_domains')
      .select('domain')
      .eq('store_id', store.id)
      .eq('is_verified', true)
      .eq('is_primary', true)
      .maybeSingle();
    
    if (customDomainData?.domain) {
      storeUrl = `https://${customDomainData.domain}`;
    }

    // Generate feed
    let feedContent: string;
    const args = [store, products || [], variationsByProduct, categories, attributeDefs, attributeValues, valueCodeMap, storeUrl] as const;
    
    switch (platform.toLowerCase()) {
      case 'google':
        feedContent = generateGoogleFeed(...args);
        break;
      case 'pinterest':
        feedContent = generatePinterestFeed(...args);
        break;
      case 'tiktok':
        feedContent = generateTikTokFeed(...args);
        break;
      case 'meta':
      default:
        feedContent = generateMetaFeed(...args);
        break;
    }

    // Log access
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabase.from('feed_access_logs').insert({
      feed_config_id: feedConfig?.id || null,
      store_id: store.id,
      platform,
      ip_address: clientIp,
      user_agent: userAgent,
    });

    // Update access count
    if (feedConfig) {
      await supabase
        .from('feed_configurations')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: (feedConfig.access_count || 0) + 1,
        })
        .eq('id', feedConfig.id);
    }

    return new Response(feedContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating feed:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
