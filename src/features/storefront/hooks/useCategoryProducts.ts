import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryProduct } from "../types/category";
import type { StoreAttribute, StoreAttributeValue } from "./useStoreFilters";

interface UseCategoryProductsParams {
  storeSlug: string;
  categorySlug: string;
}

interface ProductWithSettings {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  images: any[];
  stock_quantity: number | null;
  is_active: boolean;
  display_variations_separately: boolean;
  hide_parent_product: boolean;
  product_code: number | null;
}

interface VariationData {
  id: string;
  product_id: string;
  image_url: string | null;
  images: any[] | null;
  price: number;
  sale_price: number | null;
  attributes: Record<string, string>;
}

export function useCategoryProducts({ storeSlug, categorySlug }: UseCategoryProductsParams) {
  return useQuery({
    queryKey: ["category-products", storeSlug, categorySlug],
    queryFn: async () => {
      // First get the store
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", storeSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (storeError) throw storeError;
      if (!store) throw new Error("Loja não encontrada");

      // Get the category
      const { data: category, error: categoryError } = await supabase
        .from("product_categories")
        .select("id, name, slug, description, seo_title, seo_description, parent_id")
        .eq("slug", categorySlug)
        .eq("store_id", store.id)
        .eq("is_active", true)
        .maybeSingle();

      if (categoryError) throw categoryError;
      if (!category) throw new Error("Categoria não encontrada");

      // Get products in this category - including display settings
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, slug, price, sale_price, images, stock_quantity, is_active, display_variations_separately, hide_parent_product, product_code")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .contains("category_ids", [category.id])
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;

      // Get all product IDs to fetch their variations
      const productIds = (products || []).map(p => p.id);

      // Fetch variations for all products at once (including attributes for separation)
      const { data: variations } = await supabase
        .from("product_variations_v2")
        .select("id, product_id, image_url, images, price, sale_price, attributes")
        .in("product_id", productIds)
        .eq("is_active", true);

      // Get attributes for name resolution
      const { data: attributes } = await supabase
        .from("attributes")
        .select("id, name, type")
        .eq("store_id", store.id);

      // Get attribute values filtered by store's attributes
      const attrIds = (attributes || []).map(a => a.id);
      const { data: attributeValues } = attrIds.length > 0
        ? await supabase.from("attribute_values").select("id, value, attribute_id, color_hex, value_code").in("attribute_id", attrIds)
        : { data: [] as { id: string; value: string; attribute_id: string; color_hex: string | null; value_code: number | null }[] };

      // Create maps for quick lookups
      const attributeMap = new Map((attributes || []).map(a => [a.id, a]));
      const valueMap = new Map((attributeValues || []).map(v => [v.id, v]));

      // Function to get visual attribute ID (color or visual custom)
      const { findVisualAttributeId } = await import('@/features/storefront/lib/visualAttributeUtils');
      const colorAttributeId = findVisualAttributeId((attributes || []).map(a => ({ id: a.id, type: a.type, name: a.name })));

      // Function to extract images from variation
      const getVariationImages = (v: VariationData): string[] => {
        const varImages: string[] = [];
        if (v.images && Array.isArray(v.images)) {
          const imgs = v.images as Array<{ url?: string; is_primary?: boolean }>;
          imgs.forEach(img => {
            if (img?.url) varImages.push(img.url);
          });
        }
        if (varImages.length === 0 && v.image_url) {
          varImages.push(v.image_url);
        }
        return varImages;
      };

      // Function to get color name from variation
      const getColorName = (v: VariationData): string | null => {
        if (!colorAttributeId || !v.attributes) return null;
        const colorValueId = v.attributes[colorAttributeId];
        if (!colorValueId) return null;
        return valueMap.get(colorValueId)?.value || null;
      };

      // Create maps for product_id -> images and prices (for products NOT separated)
      const variationImagesMap = new Map<string, string[]>();
      const variationPricesMap = new Map<string, { minPrice: number; minSalePrice: number | null }>();

      (variations || []).forEach(v => {
        // Handle images for non-separated products
        if (!variationImagesMap.has(v.product_id)) {
          const varImages = getVariationImages(v as VariationData);
          if (varImages.length > 0) {
            variationImagesMap.set(v.product_id, varImages);
          }
        }

        // Handle prices - track minimum price per product
        const currentPrices = variationPricesMap.get(v.product_id);
        const varPrice = Number(v.price) || 0;
        const varSalePrice = v.sale_price ? Number(v.sale_price) : null;

        if (!currentPrices) {
          variationPricesMap.set(v.product_id, { 
            minPrice: varPrice, 
            minSalePrice: varSalePrice 
          });
        } else {
          if (varPrice > 0 && varPrice < currentPrices.minPrice) {
            currentPrices.minPrice = varPrice;
          }
          if (varSalePrice !== null && (currentPrices.minSalePrice === null || varSalePrice < currentPrices.minSalePrice)) {
            currentPrices.minSalePrice = varSalePrice;
          }
        }
      });

      // Transform products - handle separated variations
      const transformedProducts: CategoryProduct[] = [];

      (products || []).forEach((p: ProductWithSettings) => {
        const shouldSeparate = p.display_variations_separately && colorAttributeId;
        const hideParent = p.hide_parent_product ?? true;

        if (shouldSeparate) {
          // Get variations for this product grouped by color
          const productVariations = (variations || []).filter(v => v.product_id === p.id) as VariationData[];
          const colorGroups = new Map<string, VariationData[]>();

          productVariations.forEach(v => {
            const colorValueId = v.attributes?.[colorAttributeId];
            if (colorValueId) {
              if (!colorGroups.has(colorValueId)) {
                colorGroups.set(colorValueId, []);
              }
              colorGroups.get(colorValueId)!.push(v);
            }
          });

          // Create a product entry for each color
          colorGroups.forEach((colorVariations, colorValueId) => {
            const colorValue = valueMap.get(colorValueId);
            const colorName = colorValue?.value || 'Variação';
            const firstVariation = colorVariations[0];

            // Get images from first variation of this color
            const varImages = getVariationImages(firstVariation);

            // Get min price from variations of this color
            let minPrice = Infinity;
            let minSalePrice: number | null = null;
            colorVariations.forEach(v => {
              const vPrice = Number(v.price) || 0;
              if (vPrice > 0 && vPrice < minPrice) minPrice = vPrice;
              const vSalePrice = v.sale_price ? Number(v.sale_price) : null;
              if (vSalePrice !== null && (minSalePrice === null || vSalePrice < minSalePrice)) {
                minSalePrice = vSalePrice;
              }
            });

            // Fallback to product price if no variation price
            if (minPrice === Infinity) minPrice = Number(p.price);

            transformedProducts.push({
              id: p.id,
              name: colorName ? `${p.name} - ${colorName}` : p.name,
              slug: p.slug,
              price: minPrice,
              sale_price: minSalePrice,
              images: varImages.length > 0 ? varImages : (Array.isArray(p.images) 
                ? (p.images as Array<{ url?: string }>).map(img => img?.url).filter(Boolean) as string[]
                : []),
              stock_quantity: colorVariations.reduce((sum, v) => sum + ((v as any).stock_quantity || 0), 0) || p.stock_quantity,
              is_active: p.is_active,
              _colorValueId: colorValueId,
              _colorAttributeId: colorAttributeId,
              _colorName: colorName,
              _colorCode: (colorValue as any)?.value_code as number | undefined,
              _productCode: (p as any).product_code as number | undefined,
            } as CategoryProduct);
          });

          // Add parent product if not hidden
          if (!hideParent) {
            transformedProducts.push(transformProductToCard(p, variationImagesMap, variationPricesMap));
          }
        } else {
          // Regular product display
          transformedProducts.push(transformProductToCard(p, variationImagesMap, variationPricesMap));
        }
      });

      // Build category-relevant attributes: only values actually used in this category's variations
      const usedValueIds = new Set<string>();
      (variations || []).forEach(v => {
        const attrs = v.attributes;
        if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
          Object.values(attrs as Record<string, unknown>).forEach(valId => {
            if (typeof valId === 'string') usedValueIds.add(valId);
          });
        }
      });

      const categoryAttributes: StoreAttribute[] = (attributes || [])
        .map(a => {
          const relevantValues: StoreAttributeValue[] = (attributeValues || [])
            .filter(v => v.attribute_id === a.id && usedValueIds.has(v.id))
            .map(v => ({
              id: v.id,
              value: v.value,
              color_hex: v.color_hex,
              value_code: v.value_code,
              size_category: (v as any).size_category ?? null,
            }));
          return {
            id: a.id,
            name: a.name,
            type: a.type,
            values: relevantValues,
          };
        })
        .filter(a => a.values.length > 0);

      return {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          seoTitle: category.seo_title,
          seoDescription: category.seo_description,
          parentId: category.parent_id,
        },
        products: transformedProducts,
        categoryAttributes,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Helper function to transform a product to a category card
function transformProductToCard(
  p: any,
  variationImagesMap: Map<string, string[]>,
  variationPricesMap: Map<string, { minPrice: number; minSalePrice: number | null }>
): CategoryProduct {
  // Extract image URLs from the images array
  let imageUrls: string[] = Array.isArray(p.images) 
    ? (p.images as Array<{ url?: string; alt?: string; isPrimary?: boolean }>)
        .map(img => typeof img === 'string' ? img : img?.url)
        .filter((url): url is string => !!url)
    : [];

  // If no product images, use variation images as fallback
  if (imageUrls.length === 0) {
    imageUrls = variationImagesMap.get(p.id) || [];
  }

  // Get variation prices if available
  const variationPrices = variationPricesMap.get(p.id);
  const productPrice = Number(p.price);
  const productSalePrice = p.sale_price ? Number(p.sale_price) : null;

  // Use variation prices if product price is 0 or if variations have lower prices
  let finalPrice = productPrice;
  let finalSalePrice = productSalePrice;

  if (variationPrices) {
    if (productPrice === 0) {
      finalPrice = variationPrices.minPrice;
      finalSalePrice = variationPrices.minSalePrice;
    } else {
      finalPrice = Math.min(productPrice, variationPrices.minPrice);
      if (variationPrices.minSalePrice !== null) {
        finalSalePrice = productSalePrice !== null 
          ? Math.min(productSalePrice, variationPrices.minSalePrice)
          : variationPrices.minSalePrice;
      }
    }
  }

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: finalPrice,
    sale_price: finalSalePrice,
    images: imageUrls,
    stock_quantity: p.stock_quantity,
    is_active: p.is_active,
    _productCode: p.product_code as number | undefined,
  };
}
