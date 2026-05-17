import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SectionType = 'banner_carousel' | 'featured_categories' | 'featured_products' | 'new_arrivals';

export interface HomeSection {
  id: string;
  store_id: string;
  section_type: SectionType;
  title: string | null;
  subtitle: string | null;
  position: number;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface HomeBanner {
  id: string;
  section_id: string;
  image_url: string;
  image_url_mobile: string | null;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  position: number;
  is_active: boolean;
  title_color: string | null;
  subtitle_color: string | null;
  button_bg_color: string | null;
  button_text_color: string | null;
  button_style: string | null;
  button_border_color: string | null;
  text_position: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeItem {
  id: string;
  section_id: string;
  item_type: 'category' | 'product';
  item_id: string;
  color_value_id?: string | null;
  position: number;
  is_active: boolean;
  custom_image_url?: string | null;
  custom_title?: string | null;
  custom_subtitle?: string | null;
  custom_button_text?: string | null;
  custom_button_link?: string | null;
  title_color?: string | null;
  subtitle_color?: string | null;
  button_style?: string | null;
  button_border_color?: string | null;
  button_bg_color?: string | null;
  button_text_color?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionWithDetails extends HomeSection {
  banners?: HomeBanner[];
  items?: HomeItem[];
}

export function useHomeSections(storeId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Single query that fetches sections, banners and items in parallel
  const { data, isLoading } = useQuery({
    queryKey: ['home-sections-full', storeId],
    queryFn: async () => {
      if (!storeId) return { sections: [] as HomeSection[], banners: [] as HomeBanner[], items: [] as HomeItem[] };
      
      // Fetch sections first to get IDs
      const { data: sections, error: sectionsError } = await supabase
        .from('store_home_sections')
        .select('*')
        .eq('store_id', storeId)
        .order('position');

      if (sectionsError) throw sectionsError;
      if (!sections || sections.length === 0) return { sections: [] as HomeSection[], banners: [] as HomeBanner[], items: [] as HomeItem[] };

      const bannerSectionIds = sections.filter(s => s.section_type === 'banner_carousel').map(s => s.id);
      const itemSectionIds = sections
        .filter(s => ['featured_categories', 'featured_products', 'new_arrivals'].includes(s.section_type))
        .map(s => s.id);

      // Fetch banners and items in parallel
      const [bannersResult, itemsResult] = await Promise.all([
        bannerSectionIds.length > 0
          ? supabase.from('store_home_banners').select('*').in('section_id', bannerSectionIds).order('position')
          : { data: [] as HomeBanner[], error: null },
        itemSectionIds.length > 0
          ? supabase.from('store_home_items').select('*').in('section_id', itemSectionIds).order('position')
          : { data: [] as HomeItem[], error: null },
      ]);

      return {
        sections: sections as HomeSection[],
        banners: (bannersResult.data || []) as HomeBanner[],
        items: (itemsResult.data || []) as HomeItem[],
      };
    },
    enabled: !!storeId,
  });

  const sections = data?.sections || [];
  const banners = data?.banners || [];
  const items = data?.items || [];

  // Combine sections with their details
  const sectionsWithDetails: SectionWithDetails[] = sections.map(section => ({
    ...section,
    banners: banners.filter(b => b.section_id === section.id),
    items: items.filter(i => i.section_id === section.id),
  }));

  // Create section mutation
  const createSection = useMutation({
    mutationFn: async (data: { section_type: SectionType; title?: string; subtitle?: string }) => {
      if (!storeId) throw new Error('Store ID required');
      
      const maxPosition = Math.max(0, ...(sections?.map(s => s.position) || []));
      
      const { data: newSection, error } = await supabase
        .from('store_home_sections')
        .insert({
          store_id: storeId,
          section_type: data.section_type,
          title: data.title || null,
          subtitle: data.subtitle || null,
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return newSection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections-full', storeId] });
      toast({ title: "Seção criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar seção", description: error.message, variant: "destructive" });
    },
  });

  // Update section mutation
  const updateSection = useMutation({
    mutationFn: async (data: { id: string; title?: string; subtitle?: string; is_active?: boolean; position?: number }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('store_home_sections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections-full', storeId] });
    },
  });

  // Delete section mutation
  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_home_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections-full', storeId] });
      toast({ title: "Seção removida" });
    },
  });

  // Reorder sections
  const reorderSections = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('store_home_sections')
          .update({ position: index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections-full', storeId] });
    },
  });

  // Banner mutations
  const createBanner = useMutation({
    mutationFn: async (data: { 
      section_id: string; 
      image_url: string; 
      image_url_mobile?: string | null; 
      title?: string | null; 
      subtitle?: string | null; 
      button_text?: string | null; 
      button_link?: string | null;
      title_color?: string | null;
      subtitle_color?: string | null;
      button_bg_color?: string | null;
      button_text_color?: string | null;
      button_style?: string | null;
      button_border_color?: string | null;
      text_position?: string | null;
    }) => {
      const sectionBanners = banners?.filter(b => b.section_id === data.section_id) || [];
      const maxPosition = Math.max(0, ...sectionBanners.map(b => b.position));
      
      const { error } = await supabase
        .from('store_home_banners')
        .insert({
          ...data,
          position: maxPosition + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners', storeId] });
      toast({ title: "Banner adicionado" });
    },
  });

  const updateBanner = useMutation({
    mutationFn: async (data: { 
      id: string; 
      image_url?: string; 
      image_url_mobile?: string | null; 
      title?: string | null; 
      subtitle?: string | null; 
      button_text?: string | null; 
      button_link?: string | null; 
      is_active?: boolean;
      title_color?: string | null;
      subtitle_color?: string | null;
      button_bg_color?: string | null;
      button_text_color?: string | null;
      button_style?: string | null;
      button_border_color?: string | null;
      text_position?: string | null;
    }) => {
      const { id, ...updates } = data;
      const { error } = await supabase
        .from('store_home_banners')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners', storeId] });
    },
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_home_banners')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-banners', storeId] });
      toast({ title: "Banner removido" });
    },
  });

  // Item mutations
  const addItem = useMutation({
    mutationFn: async (data: { section_id: string; item_type: 'category' | 'product'; item_id: string; color_value_id?: string | null }) => {
      const sectionItems = items?.filter(i => i.section_id === data.section_id) || [];
      const maxPosition = Math.max(0, ...sectionItems.map(i => i.position));
      
      const { error } = await supabase
        .from('store_home_items')
        .insert({
          section_id: data.section_id,
          item_type: data.item_type,
          item_id: data.item_id,
          color_value_id: data.color_value_id || null,
          position: maxPosition + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections-full', storeId] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_home_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections-full', storeId] });
    },
  });

  return {
    sections: sectionsWithDetails,
    isLoading,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    createBanner,
    updateBanner,
    deleteBanner,
    addItem,
    removeItem,
  };
}

// Hook for public storefront (read-only)
export function useStorefrontHome(storeId: string | undefined) {
  const { data, isLoading: sectionsLoading } = useQuery({
    queryKey: ['storefront-home-full', storeId],
    queryFn: async () => {
      if (!storeId) return { sections: [] as HomeSection[], banners: [] as HomeBanner[], items: [] as HomeItem[] };
      
      const { data: sections, error: sectionsError } = await supabase
        .from('store_home_sections')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('position');

      if (sectionsError) throw sectionsError;
      if (!sections || sections.length === 0) return { sections: [] as HomeSection[], banners: [] as HomeBanner[], items: [] as HomeItem[] };

      const bannerSectionIds = sections.filter(s => s.section_type === 'banner_carousel').map(s => s.id);
      const itemSectionIds = sections
        .filter(s => ['featured_categories', 'featured_products', 'new_arrivals'].includes(s.section_type))
        .map(s => s.id);

      const [bannersResult, itemsResult] = await Promise.all([
        bannerSectionIds.length > 0
          ? supabase.from('store_home_banners').select('*').in('section_id', bannerSectionIds).eq('is_active', true).order('position')
          : { data: [] as HomeBanner[], error: null },
        itemSectionIds.length > 0
          ? supabase.from('store_home_items').select('*').in('section_id', itemSectionIds).eq('is_active', true).order('position')
          : { data: [] as HomeItem[], error: null },
      ]);

      return {
        sections: sections as HomeSection[],
        banners: (bannersResult.data || []) as HomeBanner[],
        items: (itemsResult.data || []) as HomeItem[],
      };
    },
    enabled: !!storeId,
  });

  const sections = data?.sections || [];
  const banners = data?.banners || [];
  const items = data?.items || [];

  // Combine sections with their details
  const sectionsWithDetails: SectionWithDetails[] = sections.map(section => ({
    ...section,
    banners: banners.filter(b => b.section_id === section.id),
    items: items.filter(i => i.section_id === section.id),
  }));

  return {
    sections: sectionsWithDetails,
    isLoading: sectionsLoading,
  };
}
