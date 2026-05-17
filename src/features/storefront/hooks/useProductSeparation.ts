import { supabase } from '@/integrations/supabase/client';
import { findVisualAttributeId } from '@/features/storefront/lib/visualAttributeUtils';

interface ProductData {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  images: any;
  category_id?: string | null;
  display_variations_separately?: boolean;
  hide_parent_product?: boolean;
}

interface VariationData {
  id: string;
  product_id: string;
  image_url: string | null;
  images: any;
  price: number;
  sale_price: number | null;
  attributes: any;
}

interface SeparatedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  images: string[];
  category_id: string | null;
  _colorValueId?: string;
  _colorAttributeId?: string;
  _colorName?: string;
  _variationId?: string;
  _colorCode?: number;
  _productCode?: number;
}

/**
 * Fetches and separates products by color variations when display_variations_separately is enabled.
 * This creates "virtual products" for each color, treating them as unique products in listings.
 */
export async function fetchAndSeparateProducts(storeId: string, productIds: string[]): Promise<{
  products: SeparatedProduct[];
  attributeMap: Map<string, any>;
  valueMap: Map<string, any>;
}> {
  if (!storeId || productIds.length === 0) {
    return { products: [], attributeMap: new Map(), valueMap: new Map() };
  }

  // Fetch products with display settings
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, sale_price, images, category_id, display_variations_separately, hide_parent_product, product_code')
    .in('id', productIds)
    .eq('is_active', true);

  if (!products || products.length === 0) {
    return { products: [], attributeMap: new Map(), valueMap: new Map() };
  }

  // Fetch variations for all products
  const { data: variations } = await supabase
    .from('product_variations_v2')
    .select('id, product_id, image_url, images, price, sale_price, attributes')
    .in('product_id', productIds)
    .eq('is_active', true);

  // Fetch attributes to find color attribute
  const { data: attributes } = await supabase
    .from('attributes')
    .select('id, name, type')
    .eq('store_id', storeId);

  // Fetch attribute values filtered by store's attributes
  const attrIds = (attributes || []).map(a => a.id);
  const { data: attributeValues } = attrIds.length > 0
    ? await supabase.from('attribute_values').select('id, value, attribute_id, color_hex, value_code').in('attribute_id', attrIds)
    : { data: [] as { id: string; value: string; attribute_id: string; color_hex: string | null; value_code: number | null }[] };

  const attributeMap = new Map((attributes || []).map(a => [a.id, a]));
  const valueMap = new Map<string, any>((attributeValues || []).map(v => [v.id, v]));
  const colorAttributeId = findVisualAttributeId(attributes || []);

  // Helper to extract images from variation
  const getVariationImages = (v: VariationData): string[] => {
    const varImages: string[] = [];
    if (v.image_url) varImages.push(v.image_url);
    if (Array.isArray(v.images)) {
      for (const img of v.images as any[]) {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && !varImages.includes(url)) varImages.push(url);
      }
    }
    return varImages;
  };

  // Helper to get product images
  const getProductImages = (product: ProductData): string[] => {
    if (!Array.isArray(product.images)) return [];
    return product.images
      .map((img: any) => typeof img === 'string' ? img : img?.url)
      .filter(Boolean) as string[];
  };

  const separatedProducts: SeparatedProduct[] = [];

  for (const product of products) {
    const productVariations = variations?.filter(v => v.product_id === product.id) || [];
    const shouldSeparate = product.display_variations_separately && colorAttributeId;
    const hideParent = product.hide_parent_product !== false; // Default true

    if (shouldSeparate && productVariations.length > 0) {
      // Group variations by color
      const colorGroups = new Map<string, VariationData[]>();
      
      for (const variation of productVariations) {
        const attrs = variation.attributes as Record<string, string> || {};
        const colorValueId = attrs[colorAttributeId];
        
        if (colorValueId) {
          if (!colorGroups.has(colorValueId)) {
            colorGroups.set(colorValueId, []);
          }
          colorGroups.get(colorValueId)!.push(variation);
        }
      }

      // Create a "virtual product" for each color
      for (const [colorValueId, colorVariations] of colorGroups.entries()) {
        const colorValue = valueMap.get(colorValueId);
        const colorName = colorValue?.value || '';
        
        // Get images from this color's variations
        let images: string[] = [];
        for (const v of colorVariations) {
          const vImages = getVariationImages(v);
          images.push(...vImages);
        }
        // Fallback to product images if no variation images
        if (images.length === 0) {
          images = getProductImages(product);
        }
        // Remove duplicates
        images = [...new Set(images)];

        // Get the best price from this color's variations
        const prices = colorVariations.map(v => ({
          price: Number(v.price) || 0,
          salePrice: v.sale_price ? Number(v.sale_price) : null
        }));
        const lowestPrice = prices.reduce((lowest, current) => {
          const currentEffective = current.salePrice || current.price;
          const lowestEffective = lowest.salePrice || lowest.price;
          return currentEffective < lowestEffective ? current : lowest;
        }, prices[0]);

        separatedProducts.push({
          id: `${product.id}_color_${colorValueId}`,
          name: colorName ? `${product.name} - ${colorName}` : product.name,
          slug: product.slug,
          price: lowestPrice?.price || Number(product.price),
          sale_price: lowestPrice?.salePrice || (product.sale_price ? Number(product.sale_price) : null),
          images,
          category_id: product.category_id,
          _colorValueId: colorValueId,
          _colorAttributeId: colorAttributeId,
          _colorName: colorName,
          _variationId: colorVariations[0]?.id,
          _colorCode: (colorValue as any)?.value_code as number | undefined,
          _productCode: (product as any).product_code as number | undefined,
        });
      }

      // Add parent product if not hidden
      if (!hideParent) {
        separatedProducts.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          sale_price: product.sale_price ? Number(product.sale_price) : null,
          images: getProductImages(product),
          category_id: product.category_id,
          _productCode: (product as any).product_code as number | undefined,
        });
      }
    } else {
      // Product without separation - use variation prices as fallback
      let finalPrice = Number(product.price) || 0;
      let finalSalePrice = product.sale_price ? Number(product.sale_price) : null;
      let images = getProductImages(product);

      if (productVariations.length > 0) {
        // Get lowest variation price
        const variationPrices = productVariations.map(v => ({
          price: Number(v.price) || 0,
          salePrice: v.sale_price ? Number(v.sale_price) : null
        }));
        const lowestVariation = variationPrices.reduce((lowest, current) => {
          const currentEffective = current.salePrice || current.price;
          const lowestEffective = lowest.salePrice || lowest.price;
          return currentEffective < lowestEffective ? current : lowest;
        }, variationPrices[0]);

        // Use variation price if product has no price
        if (!finalPrice || finalPrice < 0.01) {
          finalPrice = lowestVariation.price;
          finalSalePrice = lowestVariation.salePrice;
        }

        // Use variation images if product has no images
        if (images.length === 0) {
          for (const v of productVariations) {
            const vImages = getVariationImages(v);
            if (vImages.length > 0) {
              images = vImages;
              break;
            }
          }
        }
      }

      separatedProducts.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: finalPrice,
        sale_price: finalSalePrice,
        images,
        category_id: product.category_id,
        _productCode: (product as any).product_code as number | undefined,
      });
    }
  }

  return { products: separatedProducts, attributeMap, valueMap };
}

/**
 * Processes already-fetched products data to separate by color variations.
 * Use this when you already have product data and just need to apply separation logic.
 */
export function separateProductsByColor(
  products: ProductData[],
  variations: VariationData[],
  colorAttributeId: string | undefined,
  valueMap: Map<string, any>
): SeparatedProduct[] {
  if (!products || products.length === 0) return [];

  const getVariationImages = (v: VariationData): string[] => {
    const varImages: string[] = [];
    if (v.image_url) varImages.push(v.image_url);
    if (Array.isArray(v.images)) {
      for (const img of v.images as any[]) {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && !varImages.includes(url)) varImages.push(url);
      }
    }
    return varImages;
  };

  const getProductImages = (product: ProductData): string[] => {
    if (!Array.isArray(product.images)) return [];
    return product.images
      .map((img: any) => typeof img === 'string' ? img : img?.url)
      .filter(Boolean) as string[];
  };

  const separatedProducts: SeparatedProduct[] = [];

  for (const product of products) {
    const productVariations = variations?.filter(v => v.product_id === product.id) || [];
    const shouldSeparate = product.display_variations_separately && colorAttributeId;
    const hideParent = product.hide_parent_product !== false;

    if (shouldSeparate && productVariations.length > 0) {
      const colorGroups = new Map<string, VariationData[]>();
      
      for (const variation of productVariations) {
        const attrs = variation.attributes as Record<string, string> || {};
        const colorValueId = attrs[colorAttributeId];
        
        if (colorValueId) {
          if (!colorGroups.has(colorValueId)) {
            colorGroups.set(colorValueId, []);
          }
          colorGroups.get(colorValueId)!.push(variation);
        }
      }

      for (const [colorValueId, colorVariations] of colorGroups.entries()) {
        const colorValue = valueMap.get(colorValueId);
        const colorName = colorValue?.value || '';
        
        let images: string[] = [];
        for (const v of colorVariations) {
          images.push(...getVariationImages(v));
        }
        if (images.length === 0) {
          images = getProductImages(product);
        }
        images = [...new Set(images)];

        const prices = colorVariations.map(v => ({
          price: Number(v.price) || 0,
          salePrice: v.sale_price ? Number(v.sale_price) : null
        }));
        const lowestPrice = prices.reduce((lowest, current) => {
          const currentEffective = current.salePrice || current.price;
          const lowestEffective = lowest.salePrice || lowest.price;
          return currentEffective < lowestEffective ? current : lowest;
        }, prices[0]);

        separatedProducts.push({
          id: `${product.id}_color_${colorValueId}`,
          name: colorName ? `${product.name} - ${colorName}` : product.name,
          slug: product.slug,
          price: lowestPrice?.price || Number(product.price),
          sale_price: lowestPrice?.salePrice || (product.sale_price ? Number(product.sale_price) : null),
          images,
          category_id: product.category_id,
          _colorValueId: colorValueId,
          _colorAttributeId: colorAttributeId,
          _colorName: colorName,
          _variationId: colorVariations[0]?.id,
          _colorCode: (colorValue as any)?.value_code as number | undefined,
          _productCode: (product as any).product_code as number | undefined,
        });
      }

      if (!hideParent) {
        separatedProducts.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.price),
          sale_price: product.sale_price ? Number(product.sale_price) : null,
          images: getProductImages(product),
          category_id: product.category_id,
          _productCode: (product as any).product_code as number | undefined,
        });
      }
    } else {
      let finalPrice = Number(product.price) || 0;
      let finalSalePrice = product.sale_price ? Number(product.sale_price) : null;
      let images = getProductImages(product);

      if (productVariations.length > 0) {
        const variationPrices = productVariations.map(v => ({
          price: Number(v.price) || 0,
          salePrice: v.sale_price ? Number(v.sale_price) : null
        }));
        const lowestVariation = variationPrices.reduce((lowest, current) => {
          const currentEffective = current.salePrice || current.price;
          const lowestEffective = lowest.salePrice || lowest.price;
          return currentEffective < lowestEffective ? current : lowest;
        }, variationPrices[0]);

        if (!finalPrice || finalPrice < 0.01) {
          finalPrice = lowestVariation.price;
          finalSalePrice = lowestVariation.salePrice;
        }

        if (images.length === 0) {
          for (const v of productVariations) {
            const vImages = getVariationImages(v);
            if (vImages.length > 0) {
              images = vImages;
              break;
            }
          }
        }
      }

      separatedProducts.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: finalPrice,
        sale_price: finalSalePrice,
        images,
        category_id: product.category_id,
        _productCode: (product as any).product_code as number | undefined,
      });
    }
  }

  return separatedProducts;
}
