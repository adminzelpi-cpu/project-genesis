import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Store } from "../types";

export const useActiveStore = () => {
  const { data: store, isLoading, refetch } = useQuery({
    queryKey: ["active-store"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("merchant_id", user.id)
        .order("is_active", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Se não encontrar nenhuma loja, retorna null ao invés de erro
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data as Store;
    },
  });

  return { store, isLoading, refreshStore: refetch };
};
