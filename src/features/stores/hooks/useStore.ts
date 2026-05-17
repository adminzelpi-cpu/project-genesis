import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Store } from '../types';

export const useStore = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createStore = async (data: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data: store, error } = await supabase
        .from('stores')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Loja criada com sucesso!',
        description: 'Sua loja está pronta para receber produtos.',
      });

      return { store, error: null };
    } catch (error: any) {
      toast({
        title: 'Erro ao criar loja',
        description: error.message,
        variant: 'destructive',
      });
      return { store: null, error };
    } finally {
      setLoading(false);
    }
  };

  const updateStore = async (id: string, data: Partial<Store>) => {
    setLoading(true);
    try {
      const { data: store, error } = await supabase
        .from('stores')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Loja atualizada!',
        description: 'Alterações salvas com sucesso.',
      });

      return { store, error: null };
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar loja',
        description: error.message,
        variant: 'destructive',
      });
      return { store: null, error };
    } finally {
      setLoading(false);
    }
  };

  const getMyStores = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: stores, error } = await supabase
        .from('stores')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { stores, error: null };
    } catch (error: any) {
      return { stores: null, error };
    } finally {
      setLoading(false);
    }
  };

  const getStoreBySlug = async (slug: string) => {
    try {
      const { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return { store, error: null };
    } catch (error: any) {
      return { store: null, error };
    }
  };

  return {
    loading,
    createStore,
    updateStore,
    getMyStores,
    getStoreBySlug,
  };
};
