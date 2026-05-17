import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invokeCustomerFn, hasCustomerToken } from "@/features/customers/lib/customerApi";
import { getStoredCustomerSession } from "@/features/auth";

interface Favorite {
  id: string;
  product_id: string;
  color_value_id: string | null;
  created_at: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    sale_price: number | null;
    images: string[] | null;
    stock_quantity: number | null;
    is_active: boolean;
    store_id: string;
    store?: {
      slug: string;
    };
  };
}

export interface AddFavoriteParams {
  productId: string;
  colorValueId?: string | null;
}

export function useFavorites() {
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["customer-favorites", getStoredCustomerSession()?.customer_id ?? "anon"],
    queryFn: async () => {
      if (!hasCustomerToken()) return [];
      const res = await invokeCustomerFn<{ favorites: Favorite[] }>("customer-favorites", {
        body: { action: "list" },
      });
      return res.favorites || [];
    },
  });

  const addFavorite = useMutation({
    mutationFn: async (params: AddFavoriteParams) => {
      if (!hasCustomerToken()) throw new Error("Usuário não autenticado");
      await invokeCustomerFn("customer-favorites", {
        body: {
          action: "add",
          product_id: params.productId,
          color_value_id: params.colorValueId ?? null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });
      toast.success("Adicionado aos favoritos!");
    },
    onError: () => {
      toast.error("Erro ao adicionar aos favoritos");
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (params: AddFavoriteParams) => {
      if (!hasCustomerToken()) throw new Error("Usuário não autenticado");
      await invokeCustomerFn("customer-favorites", {
        body: {
          action: "remove",
          product_id: params.productId,
          color_value_id: params.colorValueId ?? null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });
      toast.success("Removido dos favoritos!");
    },
    onError: () => {
      toast.error("Erro ao remover dos favoritos");
    },
  });

  const isFavorite = (productId: string, colorValueId?: string | null) => {
    if (colorValueId) {
      return favorites?.some((f) => f.product_id === productId && f.color_value_id === colorValueId) || false;
    }
    return favorites?.some((f) => f.product_id === productId && !f.color_value_id) || false;
  };

  return {
    favorites,
    isLoading,
    addFavorite,
    removeFavorite,
    isFavorite,
  };
}
