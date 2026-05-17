import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CouponValidationResult {
  isValid: boolean;
  discount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  message: string;
  couponId?: string;
}

export function useValidateCoupon() {
  const [isValidating, setIsValidating] = useState(false);

  const validateCoupon = async (
    code: string,
    storeId: string,
    orderTotal: number
  ): Promise<CouponValidationResult> => {
    setIsValidating(true);

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', storeId)
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        return {
          isValid: false,
          discount: 0,
          discountType: 'fixed',
          discountValue: 0,
          message: 'Cupom não encontrado ou inválido',
        };
      }

      // Check if coupon has started
      if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
        return {
          isValid: false,
          discount: 0,
          discountType: 'fixed',
          discountValue: 0,
          message: 'Este cupom ainda não está ativo',
        };
      }

      // Check if coupon has expired
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return {
          isValid: false,
          discount: 0,
          discountType: 'fixed',
          discountValue: 0,
          message: 'Este cupom expirou',
        };
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return {
          isValid: false,
          discount: 0,
          discountType: 'fixed',
          discountValue: 0,
          message: 'Este cupom atingiu o limite de uso',
        };
      }

      // Check minimum order value
      if (coupon.min_order_value && orderTotal < coupon.min_order_value) {
        return {
          isValid: false,
          discount: 0,
          discountType: 'fixed',
          discountValue: 0,
          message: `Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2).replace('.', ',')}`,
        };
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = (orderTotal * coupon.discount_value) / 100;
        // Apply max discount if set
        if (coupon.max_discount_value && discount > coupon.max_discount_value) {
          discount = coupon.max_discount_value;
        }
      } else {
        discount = coupon.discount_value;
      }

      // Ensure discount doesn't exceed order total
      if (discount > orderTotal) {
        discount = orderTotal;
      }

      return {
        isValid: true,
        discount,
        discountType: coupon.discount_type as 'percentage' | 'fixed',
        discountValue: coupon.discount_value,
        message: coupon.discount_type === 'percentage'
          ? `Desconto de ${coupon.discount_value}% aplicado!`
          : `Desconto de R$ ${coupon.discount_value.toFixed(2).replace('.', ',')} aplicado!`,
        couponId: coupon.id,
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return {
        isValid: false,
        discount: 0,
        discountType: 'fixed',
        discountValue: 0,
        message: 'Erro ao validar cupom',
      };
    } finally {
      setIsValidating(false);
    }
  };

  const incrementCouponUsage = async (couponId: string) => {
    try {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('usage_count')
        .eq('id', couponId)
        .single();
      
      if (coupon) {
        await supabase
          .from('coupons')
          .update({ usage_count: (coupon.usage_count || 0) + 1 })
          .eq('id', couponId);
      }
    } catch (error) {
      console.error('Error incrementing coupon usage:', error);
    }
  };

  return {
    validateCoupon,
    incrementCouponUsage,
    isValidating,
  };
}
