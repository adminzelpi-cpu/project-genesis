import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StorefrontCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children?: StorefrontCategory[];
}

export const useStorefrontCategories = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ["storefront-categories", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from("product_categories")
        .select("id, name, slug, parent_id")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      // Build tree structure
      const categoriesMap = new Map<string, StorefrontCategory>();
      const rootCategories: StorefrontCategory[] = [];

      (data || []).forEach((cat) => {
        categoriesMap.set(cat.id, { ...cat, children: [] });
      });

      (data || []).forEach((cat) => {
        const category = categoriesMap.get(cat.id)!;
        if (cat.parent_id && categoriesMap.has(cat.parent_id)) {
          categoriesMap.get(cat.parent_id)!.children!.push(category);
        } else {
          rootCategories.push(category);
        }
      });

      return rootCategories;
    },
    enabled: !!storeId,
  });
};
