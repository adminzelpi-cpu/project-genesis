import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProductValidation {
  id: string;
  name: string;
  slug: string;
  missingFields: string[];
  recommendedFields: string[];
  isEligible: boolean;
  hasImage: boolean;
  hasStock: boolean;
  hasPrice: boolean;
  hasBrand: boolean;
  hasDescription: boolean;
  hasGender: boolean;
  hasAgeGroup: boolean;
  hasMaterial: boolean;
  hasCategory: boolean;
}

interface ValidationSummary {
  totalProducts: number;
  eligibleProducts: number;
  productsWithIssues: number;
  products: ProductValidation[];
  loading: boolean;
}

export const useFeedValidation = (storeId: string | undefined): ValidationSummary => {
  const [products, setProducts] = useState<ProductValidation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!storeId) return;

      setLoading(true);
      try {
        // Fetch all active products with new fields
        const { data: productData, error } = await supabase
          .from('products')
          .select('id, name, slug, description, price, images, brand, stock_quantity, category_id, gender, age_group, material')
          .eq('store_id', storeId)
          .eq('is_active', true);

        if (error) throw error;

        // Also fetch variations to check stock
        const productIds = (productData || []).map(p => p.id);
        const { data: variations } = await supabase
          .from('product_variations_v2')
          .select('product_id, stock_quantity, images, image_url, price')
          .in('product_id', productIds)
          .eq('is_active', true);

        const variationsByProduct: Record<string, typeof variations> = {};
        (variations || []).forEach(v => {
          if (!variationsByProduct[v.product_id]) {
            variationsByProduct[v.product_id] = [];
          }
          variationsByProduct[v.product_id]!.push(v);
        });

        // Validate each product
        const validated = (productData || []).map(product => {
          const productVariations = variationsByProduct[product.id] || [];
          const hasVariations = productVariations.length > 0;

          // Check image
          const productImages = product.images as string[] | null;
          const hasProductImage = productImages && productImages.length > 0;
          const hasVariationImage = productVariations.some(v => 
            v.image_url || (v.images && (v.images as string[]).length > 0)
          );
          const hasImage = hasProductImage || hasVariationImage;

          // Check stock - null stock_quantity means infinite stock
          const hasInfiniteProductStock = product.stock_quantity === null;
          const productStock = product.stock_quantity || 0;
          const hasInfiniteVariationStock = productVariations.some(v => v.stock_quantity === null);
          const variationStock = productVariations.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
          const hasStock = hasVariations 
            ? (hasInfiniteVariationStock || variationStock > 0) 
            : (hasInfiniteProductStock || productStock > 0);

          // Check price
          const hasPrice = product.price > 0 || productVariations.some(v => v.price > 0);

          // Check brand
          const hasBrand = !!product.brand && product.brand.trim() !== '';

          // Check description
          const hasDescription = !!product.description && product.description.trim().length > 10;

          // Check new catalog fields
          const hasGender = !!product.gender && product.gender.trim() !== '';
          const hasAgeGroup = !!product.age_group && product.age_group.trim() !== '';
          const hasMaterial = !!product.material && product.material.trim() !== '';
          const hasCategory = !!product.category_id;

          // Required fields (product won't work well in feeds without these)
          const missingFields: string[] = [];
          if (!hasImage) missingFields.push('Imagem');
          if (!hasStock) missingFields.push('Estoque');
          if (!hasPrice) missingFields.push('Preço');
          if (!hasBrand) missingFields.push('Marca');
          if (!hasDescription) missingFields.push('Descrição');

          // Recommended fields (improve ad performance)
          const recommendedFields: string[] = [];
          if (!hasGender) recommendedFields.push('Gênero');
          if (!hasAgeGroup) recommendedFields.push('Faixa Etária');
          if (!hasMaterial) recommendedFields.push('Material');
          if (!hasCategory) recommendedFields.push('Categoria');

          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            missingFields,
            recommendedFields,
            isEligible: missingFields.length === 0,
            hasImage,
            hasStock,
            hasPrice,
            hasBrand,
            hasDescription,
            hasGender,
            hasAgeGroup,
            hasMaterial,
            hasCategory,
          };
        });

        setProducts(validated);
      } catch (error) {
        console.error('Error fetching products for validation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeId]);

  const eligibleProducts = products.filter(p => p.isEligible).length;
  const productsWithIssues = products.filter(p => !p.isEligible).length;

  return {
    totalProducts: products.length,
    eligibleProducts,
    productsWithIssues,
    products,
    loading,
  };
};
