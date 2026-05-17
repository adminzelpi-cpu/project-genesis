import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SizeGuide {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  template_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SizeGuideDimension {
  id: string;
  size_guide_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  position: number;
  measurement_type: 'piece' | 'body';
  created_at: string;
}

export interface SizeGuideSize {
  id: string;
  size_guide_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface SizeGuideValue {
  id: string;
  size_guide_id: string;
  dimension_id: string;
  size_id: string;
  value: string;
  created_at: string;
}

export interface SizeGuideCategory {
  id: string;
  size_guide_id: string;
  category_id: string;
  created_at: string;
}

export interface SizeGuideWithDetails extends SizeGuide {
  dimensions: SizeGuideDimension[];
  sizes: SizeGuideSize[];
  values: SizeGuideValue[];
  categories: SizeGuideCategory[];
}

export const useSizeGuides = (storeId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ['size-guides', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      
      const { data, error } = await supabase
        .from('size_guides')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SizeGuide[];
    },
    enabled: !!storeId,
  });

  const createGuide = useMutation({
    mutationFn: async (guide: Partial<SizeGuide>) => {
      const { data, error } = await supabase
        .from('size_guides')
        .insert({
          store_id: storeId!,
          name: guide.name!,
          description: guide.description,
          template_type: guide.template_type || 'custom',
          is_active: guide.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guides', storeId] });
      toast({ title: 'Guia criado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar guia', description: error.message, variant: 'destructive' });
    },
  });

  const updateGuide = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SizeGuide> & { id: string }) => {
      const { data, error } = await supabase
        .from('size_guides')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guides', storeId] });
      toast({ title: 'Guia atualizado!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar guia', description: error.message, variant: 'destructive' });
    },
  });

  const deleteGuide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('size_guides')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guides', storeId] });
      toast({ title: 'Guia excluído!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao excluir guia', description: error.message, variant: 'destructive' });
    },
  });

  const duplicateGuide = useMutation({
    mutationFn: async (sourceGuideId: string) => {
      // 1. Fetch source guide with all details
      const [guideRes, dimensionsRes, sizesRes, valuesRes] = await Promise.all([
        supabase.from('size_guides').select('*').eq('id', sourceGuideId).single(),
        supabase.from('size_guide_dimensions').select('*').eq('size_guide_id', sourceGuideId).order('position'),
        supabase.from('size_guide_sizes').select('*').eq('size_guide_id', sourceGuideId).order('position'),
        supabase.from('size_guide_values').select('*').eq('size_guide_id', sourceGuideId),
      ]);

      if (guideRes.error) throw guideRes.error;
      const source = guideRes.data;

      // 2. Create new guide with "(cópia)" suffix
      const { data: newGuide, error: createError } = await supabase
        .from('size_guides')
        .insert({
          store_id: storeId!,
          name: `${source.name} (cópia)`,
          description: source.description,
          template_type: source.template_type,
          is_active: source.is_active,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 3. Duplicate dimensions (WITHOUT images)
      const dimensions = dimensionsRes.data || [];
      const dimIdMap: Record<string, string> = {};

      if (dimensions.length > 0) {
        const { data: newDims, error: dimError } = await supabase
          .from('size_guide_dimensions')
          .insert(dimensions.map(d => ({
            size_guide_id: newGuide.id,
            name: d.name,
            description: d.description,
            image_url: null, // Don't copy images
            position: d.position,
            measurement_type: d.measurement_type,
          })))
          .select();

        if (dimError) throw dimError;
        // Map old dimension IDs to new ones (by position order)
        dimensions.forEach((oldDim, idx) => {
          dimIdMap[oldDim.id] = newDims![idx].id;
        });
      }

      // 4. Duplicate sizes
      const sizes = sizesRes.data || [];
      const sizeIdMap: Record<string, string> = {};

      if (sizes.length > 0) {
        const { data: newSizes, error: sizeError } = await supabase
          .from('size_guide_sizes')
          .insert(sizes.map(s => ({
            size_guide_id: newGuide.id,
            name: s.name,
            position: s.position,
          })))
          .select();

        if (sizeError) throw sizeError;
        sizes.forEach((oldSize, idx) => {
          sizeIdMap[oldSize.id] = newSizes![idx].id;
        });
      }

      // 5. Duplicate values with mapped IDs
      const values = valuesRes.data || [];
      if (values.length > 0) {
        const mappedValues = values
          .filter(v => dimIdMap[v.dimension_id] && sizeIdMap[v.size_id])
          .map(v => ({
            size_guide_id: newGuide.id,
            dimension_id: dimIdMap[v.dimension_id],
            size_id: sizeIdMap[v.size_id],
            value: v.value,
          }));

        if (mappedValues.length > 0) {
          const { error: valError } = await supabase
            .from('size_guide_values')
            .insert(mappedValues);

          if (valError) throw valError;
        }
      }

      return newGuide;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guides', storeId] });
      toast({ title: 'Guia duplicado com sucesso!' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao duplicar guia', description: error.message, variant: 'destructive' });
    },
  });

  return {
    guides,
    isLoading,
    createGuide,
    updateGuide,
    deleteGuide,
    duplicateGuide,
  };
};

export const useSizeGuideDetails = (guideId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: guide, isLoading } = useQuery({
    queryKey: ['size-guide-details', guideId],
    queryFn: async () => {
      if (!guideId) return null;

      const [guideRes, dimensionsRes, sizesRes, valuesRes, categoriesRes] = await Promise.all([
        supabase.from('size_guides').select('*').eq('id', guideId).single(),
        supabase.from('size_guide_dimensions').select('*').eq('size_guide_id', guideId).order('position'),
        supabase.from('size_guide_sizes').select('*').eq('size_guide_id', guideId).order('position'),
        supabase.from('size_guide_values').select('*').eq('size_guide_id', guideId),
        supabase.from('size_guide_categories').select('*').eq('size_guide_id', guideId),
      ]);

      if (guideRes.error) throw guideRes.error;

      return {
        ...guideRes.data,
        dimensions: dimensionsRes.data || [],
        sizes: sizesRes.data || [],
        values: valuesRes.data || [],
        categories: categoriesRes.data || [],
      } as SizeGuideWithDetails;
    },
    enabled: !!guideId,
  });

  const addDimension = useMutation({
    mutationFn: async (dimension: Partial<SizeGuideDimension>) => {
      const { data, error } = await supabase
        .from('size_guide_dimensions')
        .insert({
          size_guide_id: guideId!,
          name: dimension.name!,
          description: dimension.description,
          image_url: dimension.image_url,
          position: dimension.position ?? 0,
          measurement_type: dimension.measurement_type || 'piece',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guide-details', guideId] });
    },
  });

  const updateDimension = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SizeGuideDimension> & { id: string }) => {
      const { error } = await supabase
        .from('size_guide_dimensions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guide-details', guideId] });
    },
  });

  const deleteDimension = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('size_guide_dimensions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guide-details', guideId] });
    },
  });

  const addSize = useMutation({
    mutationFn: async (size: Partial<SizeGuideSize>) => {
      const { data, error } = await supabase
        .from('size_guide_sizes')
        .insert({
          size_guide_id: guideId!,
          name: size.name!,
          position: size.position ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guide-details', guideId] });
    },
  });

  const deleteSize = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('size_guide_sizes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guide-details', guideId] });
    },
  });

  const upsertValue = useMutation({
    mutationFn: async (value: { dimension_id: string; size_id: string; value: string }) => {
      const { error } = await supabase
        .from('size_guide_values')
        .upsert({
          size_guide_id: guideId!,
          dimension_id: value.dimension_id,
          size_id: value.size_id,
          value: value.value,
        }, {
          onConflict: 'dimension_id,size_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guide-details', guideId] });
    },
  });

  const updateCategories = useMutation({
    mutationFn: async (categoryIds: string[]) => {
      // Remove existing
      await supabase
        .from('size_guide_categories')
        .delete()
        .eq('size_guide_id', guideId!);

      // Add new
      if (categoryIds.length > 0) {
        const { error } = await supabase
          .from('size_guide_categories')
          .insert(categoryIds.map(categoryId => ({
            size_guide_id: guideId!,
            category_id: categoryId,
          })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['size-guide-details', guideId] });
      toast({ title: 'Categorias atualizadas!' });
    },
  });

  return {
    guide,
    isLoading,
    addDimension,
    updateDimension,
    deleteDimension,
    addSize,
    deleteSize,
    upsertValue,
    updateCategories,
  };
};

// Hook para buscar guia de um produto (storefront)
export const useProductSizeGuide = (productId: string | undefined, categoryIds: string[] | undefined) => {
  return useQuery({
    queryKey: ['product-size-guide', productId, categoryIds],
    queryFn: async () => {
      if (!productId) return null;

      // Primeiro, buscar guia diretamente vinculado ao produto
      const { data: product } = await supabase
        .from('products')
        .select('size_guide_id')
        .eq('id', productId)
        .single();

      let guideId = product?.size_guide_id;

      // Se não tem guia direto, buscar por categoria
      if (!guideId && categoryIds && categoryIds.length > 0) {
        const { data: categoryGuide } = await supabase
          .from('size_guide_categories')
          .select('size_guide_id')
          .in('category_id', categoryIds)
          .limit(1)
          .single();

        guideId = categoryGuide?.size_guide_id;
      }

      if (!guideId) return null;

      // Buscar detalhes completos do guia
      const [guideRes, dimensionsRes, sizesRes, valuesRes] = await Promise.all([
        supabase.from('size_guides').select('*').eq('id', guideId).eq('is_active', true).single(),
        supabase.from('size_guide_dimensions').select('*').eq('size_guide_id', guideId).order('position'),
        supabase.from('size_guide_sizes').select('*').eq('size_guide_id', guideId).order('position'),
        supabase.from('size_guide_values').select('*').eq('size_guide_id', guideId),
      ]);

      if (guideRes.error || !guideRes.data) return null;

      return {
        ...guideRes.data,
        dimensions: dimensionsRes.data || [],
        sizes: sizesRes.data || [],
        values: valuesRes.data || [],
      } as SizeGuideWithDetails;
    },
    enabled: !!productId,
  });
};
