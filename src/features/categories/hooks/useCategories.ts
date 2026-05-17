import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { ProductCategory } from '../types';

export const useCategories = () => {
  const [loading, setLoading] = useState(false);

  const getStoreCategories = async (
    storeId: string,
    options: { includeInactive?: boolean } = {}
  ): Promise<ProductCategory[]> => {
    try {
      let query = supabase
        .from('product_categories')
        .select('*')
        .eq('store_id', storeId)
        .order('name');

      if (!options.includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar categorias',
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
      return [];
    }
  };

  /**
   * Deletes a category. Products are NOT deleted — they only lose the link
   * to this category. We also detach the category from its children
   * (they become root categories) to avoid orphan references.
   */
  const deleteCategory = async (categoryId: string, storeId: string) => {
    setLoading(true);
    try {
      // 1. Detach this category from all products that reference it via category_id
      const { error: e1 } = await supabase
        .from('products')
        .update({ category_id: null })
        .eq('store_id', storeId)
        .eq('category_id', categoryId);
      if (e1) throw e1;

      // 2. Promote children to root (parent_id = null)
      const { error: e2 } = await supabase
        .from('product_categories')
        .update({ parent_id: null })
        .eq('store_id', storeId)
        .eq('parent_id', categoryId);
      if (e2) throw e2;

      // 3. Delete the category itself
      const { error: e3 } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', categoryId)
        .eq('store_id', storeId);
      if (e3) throw e3;

      toast({ title: 'Categoria excluída', description: 'Os produtos foram preservados.' });
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir categoria',
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Counts products linked to a category, including products that reference
   * it via the legacy single category_id column or the multi-category category_ids array.
   */
  const getProductCountByCategory = async (
    storeId: string,
    categoryIds: string[]
  ): Promise<Record<string, number>> => {
    if (categoryIds.length === 0) return {};
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, category_id, category_ids')
        .eq('store_id', storeId);

      if (error) throw error;

      const counts: Record<string, number> = {};
      categoryIds.forEach((id) => (counts[id] = 0));

      (data || []).forEach((p: any) => {
        const ids = new Set<string>();
        if (p.category_id) ids.add(p.category_id);
        if (Array.isArray(p.category_ids)) {
          p.category_ids.forEach((cid: string) => cid && ids.add(cid));
        }
        ids.forEach((cid) => {
          if (cid in counts) counts[cid] += 1;
        });
      });

      return counts;
    } catch (error) {
      console.error('Erro ao contar produtos por categoria:', error);
      return {};
    }
  };

  const createCategory = async (category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .insert([category])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Categoria criada!',
        description: 'A categoria foi adicionada com sucesso.',
      });

      return data;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar categoria',
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCategoryName = async (categoryId: string, newName: string) => {
    setLoading(true);
    try {
      const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { data, error } = await supabase
        .from('product_categories')
        .update({ name: newName, slug })
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Categoria renomeada!',
      });

      return data;
    } catch (error) {
      console.error('Erro ao renomear categoria:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao renomear categoria',
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    getStoreCategories,
    createCategory,
    updateCategoryName,
    deleteCategory,
    getProductCountByCategory,
    loading,
  };
};
