import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreAttribute {
  id: string;
  name: string;
  type: string; // 'color' | 'size' | 'text' etc
  values: StoreAttributeValue[];
}

export interface StoreAttributeValue {
  id: string;
  value: string;
  color_hex: string | null;
  value_code: number | null;
  size_category: string | null;
}

export function useStoreFilters(storeId: string | undefined) {
  return useQuery({
    queryKey: ["store-filters", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const [{ data: attributes }, { data: values }] = await Promise.all([
        supabase
          .from("attributes")
          .select("id, name, type")
          .eq("store_id", storeId),
        supabase
          .from("attribute_values")
          .select("id, value, attribute_id, color_hex, value_code, size_category"),
      ]);

      if (!attributes) return [];

      const valuesByAttr = new Map<string, StoreAttributeValue[]>();
      (values || []).forEach((v) => {
        const list = valuesByAttr.get(v.attribute_id) || [];
        list.push({
          id: v.id,
          value: v.value,
          color_hex: v.color_hex,
          value_code: v.value_code,
          size_category: v.size_category,
        });
        valuesByAttr.set(v.attribute_id, list);
      });

      return attributes
        .filter((a) => (valuesByAttr.get(a.id)?.length || 0) > 0)
        .map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          values: valuesByAttr.get(a.id) || [],
        })) as StoreAttribute[];
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 10,
  });
}
