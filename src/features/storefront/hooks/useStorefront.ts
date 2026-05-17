import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStorefront = (storeSlug: string) => {
  const { data: store, isLoading: isLoadingStore } = useQuery({
    queryKey: ["storefront", storeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", storeSlug)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!storeSlug,
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["storefront-products", store?.id],
    queryFn: async () => {
      const { data: rawProducts, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", store!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!rawProducts || rawProducts.length === 0) return [];

      // Get all product IDs to fetch their variations
      const productIds = rawProducts.map(p => p.id);

      // Fetch variations for all products at once
      const { data: variations } = await supabase
        .from("product_variations_v2")
        .select("product_id, image_url, images, price, sale_price")
        .in("product_id", productIds)
        .eq("is_active", true);

      // Create maps for product_id -> images and prices
      const variationImagesMap = new Map<string, string[]>();
      const variationPricesMap = new Map<string, { minPrice: number; minSalePrice: number | null }>();

      (variations || []).forEach(v => {
        // Handle images
        if (!variationImagesMap.has(v.product_id)) {
          const varImages: string[] = [];
          
          // Check for images array first
          if (v.images && Array.isArray(v.images)) {
            const imgs = v.images as Array<{ url?: string; is_primary?: boolean }>;
            imgs.forEach(img => {
              if (img?.url) varImages.push(img.url);
            });
          }
          
          // Fallback to image_url
          if (varImages.length === 0 && v.image_url) {
            varImages.push(v.image_url);
          }
          
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
          // Update with minimum prices
          if (varPrice > 0 && varPrice < currentPrices.minPrice) {
            currentPrices.minPrice = varPrice;
          }
          if (varSalePrice !== null && (currentPrices.minSalePrice === null || varSalePrice < currentPrices.minSalePrice)) {
            currentPrices.minSalePrice = varSalePrice;
          }
        }
      });

      // Transform products with fallback images and prices from variations
      return rawProducts.map(p => {
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

        // Use variation prices if product price is 0
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
          ...p,
          images: imageUrls,
          price: finalPrice,
          sale_price: finalSalePrice,
        };
      });
    },
    enabled: !!store?.id,
  });

  return {
    store,
    products,
    isLoading: isLoadingStore || isLoadingProducts,
  };
};

import { useMemo } from 'react';

export const useProduct = (productSlugParam: string, storeId?: string) => {
  // Extract product_code from slug if present (e.g., "camisa-polo-3" → code=3)
  const parsed = useMemo(() => {
    const match = productSlugParam.match(/^(.*)-(\d+)$/);
    if (match) {
      return { baseSlug: match[1], productCode: parseInt(match[2]) };
    }
    return { baseSlug: productSlugParam, productCode: null as number | null };
  }, [productSlugParam]);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productSlugParam, storeId],
    queryFn: async () => {
      // Try by product_code first if extracted
      if (parsed.productCode !== null) {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("product_code", parsed.productCode)
          .eq("store_id", storeId!)
          .eq("is_active", true)
          .maybeSingle();
        if (data) return data;
      }

      // Fallback to exact slug match (backward compatibility)
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", productSlugParam)
        .eq("store_id", storeId!)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productSlugParam && !!storeId,
  });

  return { product, isLoading };
};
