import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  variant?: string;
  variationId?: string;
}

interface StockError {
  product_id: string;
  variation_id: string | null;
  product_name: string;
  requested: number;
  available: number;
}

interface ValidationResult {
  valid: boolean;
  errors: StockError[];
}

export function useValidateStock() {
  const { toast } = useToast();

  const validateStock = async (items: CartItem[]): Promise<ValidationResult> => {
    try {
      // Preparar itens para validação
      const itemsForValidation = items.map(item => ({
        product_id: item.id,
        variation_id: item.variationId || null,
        quantity: item.quantity
      }));

      const { data, error } = await supabase.rpc('validate_stock_for_checkout', {
        items: itemsForValidation
      });

      if (error) {
        console.error('Error validating stock:', error);
        return { valid: true, errors: [] }; // Em caso de erro, permitir checkout
      }

      const result = data as unknown as ValidationResult;

      if (!result.valid && result.errors.length > 0) {
        // Mostrar toast com os produtos sem estoque
        const errorMessages = result.errors.map(err => {
          if (err.available === 0) {
            return `${err.product_name}: esgotado`;
          }
          return `${err.product_name}: apenas ${err.available} disponível(is)`;
        });

        toast({
          variant: "destructive",
          title: "Estoque insuficiente",
          description: errorMessages.join(', '),
        });
      }

      return result;
    } catch (error) {
      console.error('Error in stock validation:', error);
      return { valid: true, errors: [] }; // Em caso de erro, permitir checkout
    }
  };

  return { validateStock };
}
