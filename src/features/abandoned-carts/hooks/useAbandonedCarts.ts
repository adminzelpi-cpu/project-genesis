import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";

export type AbandonedCartStatus = "all" | "pending" | "recovered" | "lost";

export interface AbandonedCart {
  id: string;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  cart_items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
    variation_id?: string;
    variation_name?: string;
    image_url?: string;
  }>;
  cart_total: number;
  abandoned_at: string;
  recovered_at: string | null;
  emails_sent: number;
  recovery_token: string;
  customer_id: string | null;
  customer?: {
    telefone: string | null;
  } | null;
}

interface UseAbandonedCartsOptions {
  status?: AbandonedCartStatus;
  search?: string;
  page?: number;
  perPage?: number;
}

export function useAbandonedCarts(options: UseAbandonedCartsOptions = {}) {
  const { store } = useActiveStore();
  const { status = "all", search = "", page = 1, perPage = 10 } = options;

  return useQuery({
    queryKey: ["abandoned-carts", store?.id, status, search, page, perPage],
    queryFn: async () => {
      if (!store?.id) throw new Error("Store not found");

      let query = supabase
        .from("abandoned_carts")
        .select(`
          *,
          customer:customers(telefone)
        `, { count: "exact" })
        .eq("store_id", store.id)
        .order("abandoned_at", { ascending: false });

      // Exclude carts still in 15-minute grace period (not truly abandoned yet)
      const gracePeriodCutoff = new Date();
      gracePeriodCutoff.setMinutes(gracePeriodCutoff.getMinutes() - 15);
      query = query.lt("abandoned_at", gracePeriodCutoff.toISOString());

      // Filter by status
      if (status === "pending") {
        query = query.is("recovered_at", null);
      } else if (status === "recovered") {
        query = query.not("recovered_at", "is", null);
      } else if (status === "lost") {
        // Lost = abandoned more than 7 days ago and not recovered
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query
          .is("recovered_at", null)
          .lt("abandoned_at", sevenDaysAgo.toISOString());
      }

      // Search filter
      if (search) {
        query = query.or(`customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
      }

      // Pagination
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Map data to proper types
      const carts = (data || []).map((cart) => ({
        ...cart,
        cart_items: (cart.cart_items as AbandonedCart["cart_items"]) || [],
      })) as AbandonedCart[];

      return {
        carts,
        total: count ?? 0,
        page,
        perPage,
        totalPages: Math.ceil((count ?? 0) / perPage),
      };
    },
    enabled: !!store?.id,
  });
}
