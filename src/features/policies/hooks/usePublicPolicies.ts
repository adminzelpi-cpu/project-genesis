import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicPolicy {
  id: string;
  policy_type: string;
  title: string;
  slug: string;
  content: string | null;
}

export const usePublicPolicies = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ["public-policies", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from("store_policies")
        .select("id, policy_type, title, slug, content")
        .eq("store_id", storeId)
        .eq("is_published", true)
        .order("policy_type", { ascending: true });

      if (error) throw error;
      return data as PublicPolicy[];
    },
    enabled: !!storeId,
  });
};
