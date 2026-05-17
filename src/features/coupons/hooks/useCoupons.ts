import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Coupon {
  id: string;
  store_id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount_value: number | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponInput {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value?: number;
  max_discount_value?: number | null;
  usage_limit?: number | null;
  is_active?: boolean;
  starts_at?: string;
  expires_at?: string | null;
}

export function useCoupons(storeId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading, error } = useQuery({
    queryKey: ['coupons', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!storeId,
  });

  const createCoupon = useMutation({
    mutationFn: async (input: CouponInput) => {
      if (!storeId) throw new Error('Store ID é obrigatório');

      const { data, error } = await supabase
        .from('coupons')
        .insert({
          store_id: storeId,
          code: input.code.toUpperCase(),
          description: input.description,
          discount_type: input.discount_type,
          discount_value: input.discount_value,
          min_order_value: input.min_order_value || 0,
          max_discount_value: input.max_discount_value,
          usage_limit: input.usage_limit,
          is_active: input.is_active ?? true,
          starts_at: input.starts_at || new Date().toISOString(),
          expires_at: input.expires_at,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', storeId] });
      toast.success('Cupom criado com sucesso!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Já existe um cupom com esse código');
      } else {
        toast.error('Erro ao criar cupom');
      }
    },
  });

  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CouponInput> & { id: string }) => {
      const updateData: any = { ...input };
      if (input.code) {
        updateData.code = input.code.toUpperCase();
      }

      const { data, error } = await supabase
        .from('coupons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', storeId] });
      toast.success('Cupom atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar cupom');
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', storeId] });
      toast.success('Cupom excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir cupom');
    },
  });

  return {
    coupons,
    isLoading,
    error,
    createCoupon,
    updateCoupon,
    deleteCoupon,
  };
}
