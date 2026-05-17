import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '../types';

export const useProducts = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createProduct = async (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data: product, error } = await supabase
        .from('products')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Produto criado!',
        description: 'O produto foi adicionado à sua loja.',
      });

      return product;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar produto',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    setLoading(true);
    try {
      const { data: product, error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Produto atualizado!',
      });

      return product;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getStoreProducts = async (storeId: string) => {
    setLoading(true);
    try {
      // Buscar produtos
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Buscar variações para cada produto
      const productsWithVariations = await Promise.all(
        (products || []).map(async (product) => {
          const { data: variations } = await supabase
            .from('product_variations_v2')
            .select('price, sale_price, stock_quantity, images, image_url')
            .eq('product_id', product.id)
            .eq('is_active', true);

          return {
            ...product,
            variations: variations || []
          };
        })
      );

      return { products: productsWithVariations, error: null };
    } catch (error: any) {
      return { products: null, error };
    } finally {
      setLoading(false);
    }
  };

  const getProductBySlug = async (storeSlug: string, productSlug: string) => {
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', storeSlug)
        .eq('is_active', true)
        .single();

      if (!store) throw new Error('Loja não encontrada');

      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .eq('slug', productSlug)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return { product, error: null };
    } catch (error: any) {
      return { product: null, error };
    }
  };

  const getProduct = async (productId: string) => {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      return { product, error: null };
    } catch (error: any) {
      return { product: null, error };
    }
  };

  return {
    loading,
    createProduct,
    updateProduct,
    getStoreProducts,
    getProductBySlug,
    getProduct,
  };
};
