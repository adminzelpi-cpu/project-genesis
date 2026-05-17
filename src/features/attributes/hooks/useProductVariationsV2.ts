import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductVariation } from "../types";
import { toast } from "@/hooks/use-toast";

export const useProductVariationsV2 = (productId?: string) => {
  const queryClient = useQueryClient();

  // Fetch variations
  const { data: variations = [], isLoading } = useQuery({
    queryKey: ["product-variations-v2", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_variations_v2")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        images: v.images as any as Array<{ url: string; is_primary: boolean }> || []
      })) as ProductVariation[];
    },
    enabled: !!productId,
  });

  // Save variations mutation
  const saveVariations = useMutation({
    mutationFn: async ({
      productId,
      variations,
    }: {
      productId: string;
      variations: ProductVariation[];
    }) => {
      // 0. Auto-replicar imagens entre variações "irmãs" que compartilhem o atributo agrupador
      //    (geralmente "cor", mas funciona com qualquer atributo: voltagem, capacidade, etc.)
      //    Garante que nenhuma variação fique sem foto se outra do mesmo grupo tiver.
      const replicated = await autoReplicateImagesByGroupingAttribute(variations);

      // 1. Deletar variações existentes
      const { error: deleteError } = await supabase
        .from("product_variations_v2")
        .delete()
        .eq("product_id", productId);

      if (deleteError) throw deleteError;

      // 2. Inserir novas variações
      if (replicated.length > 0) {
        const variationsToInsert = replicated.map(v => ({
          product_id: productId,
          sku: v.sku,
          price: v.price,
          sale_price: (v as any).sale_price ?? null,
          stock_quantity: v.stock_quantity,
          image_url: v.image_url,
          images: v.images || [],
          attributes: v.attributes,
          is_active: v.is_active ?? true,
          weight: (v as any).weight ?? null,
          length: (v as any).length ?? null,
          width: (v as any).width ?? null,
          height: (v as any).height ?? null,
          gtin: (v as any).gtin ?? null,
          ean: (v as any).ean ?? null,
          upc: (v as any).upc ?? null,
          mpn: (v as any).mpn ?? null,
        }));

        const { error: insertError } = await supabase
          .from("product_variations_v2")
          .insert(variationsToInsert);

        if (insertError) throw insertError;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["product-variations-v2", variables.productId] 
      });
      toast({
        title: "Variações salvas!",
        description: "As variações do produto foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao salvar variações:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar variações",
        description: error.message || "Ocorreu um erro ao salvar as variações.",
      });
    },
  });

  return {
    variations,
    isLoading,
    saveVariations: saveVariations.mutateAsync,
    isSaving: saveVariations.isPending,
  };
};

/**
 * Auto-replica imagens entre variações que compartilham o mesmo valor de um
 * "atributo agrupador". Prioriza atributos do tipo 'color' (típico em roupas:
 * todas as variações da cor "Preta" compartilham foto), mas funciona com
 * qualquer tipo (voltagem, capacidade, sabor, etc.).
 *
 * Regra: para cada variação SEM imagem, copia as imagens de uma "irmã" que
 * tenha o mesmo valor no atributo agrupador e que possua imagens.
 */
async function autoReplicateImagesByGroupingAttribute(
  variations: ProductVariation[]
): Promise<ProductVariation[]> {
  if (variations.length === 0) return variations;

  const attributeIds = Array.from(
    new Set(variations.flatMap(v => Object.keys(v.attributes || {})))
  );
  if (attributeIds.length === 0) return variations;

  const { data: attrs } = await supabase
    .from("attributes")
    .select("id, type")
    .in("id", attributeIds);

  // Preferir atributo 'color', senão usar o primeiro disponível
  const colorAttr = (attrs || []).find(a => a.type === "color");
  const groupingAttrId = colorAttr?.id || attributeIds[0];
  if (!groupingAttrId) return variations;

  // Mapear: valor_do_grupo -> primeira lista de imagens encontrada
  const groupImages = new Map<string, Array<{ url: string; is_primary: boolean }>>();
  for (const v of variations) {
    const groupValue = v.attributes?.[groupingAttrId];
    if (!groupValue) continue;
    const imgs = Array.isArray(v.images) ? v.images : [];
    if (imgs.length > 0 && !groupImages.has(groupValue)) {
      groupImages.set(groupValue, imgs);
    }
  }

  return variations.map(v => {
    const imgs = Array.isArray(v.images) ? v.images : [];
    if (imgs.length > 0) return v;

    const groupValue = v.attributes?.[groupingAttrId];
    if (!groupValue) return v;

    const fallback = groupImages.get(groupValue);
    if (!fallback || fallback.length === 0) return v;

    const imagesCopy = fallback.map(img => ({ ...img }));
    return {
      ...v,
      images: imagesCopy,
      image_url: v.image_url || imagesCopy.find(i => i.is_primary)?.url || imagesCopy[0]?.url,
    };
  });
}
