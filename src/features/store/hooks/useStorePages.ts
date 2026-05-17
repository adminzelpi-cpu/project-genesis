import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { toast } from "sonner";

export interface StorePage {
  id: string;
  store_id: string;
  title: string;
  slug: string;
  content: string | null;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePageData {
  title: string;
  slug: string;
  content?: string;
  is_published?: boolean;
  meta_title?: string;
  meta_description?: string;
}

export interface UpdatePageData extends Partial<CreatePageData> {
  id: string;
}

export const useStorePages = () => {
  const { store } = useActiveStore();
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["store-pages", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data, error } = await supabase
        .from("store_pages")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StorePage[];
    },
    enabled: !!store?.id,
  });

  const createPage = useMutation({
    mutationFn: async (pageData: CreatePageData) => {
      if (!store?.id) throw new Error("Loja não encontrada");

      const { data, error } = await supabase
        .from("store_pages")
        .insert({
          store_id: store.id,
          ...pageData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-pages", store?.id] });
      toast.success("Página criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar página: ${error.message}`);
    },
  });

  const updatePage = useMutation({
    mutationFn: async ({ id, ...pageData }: UpdatePageData) => {
      const { data, error } = await supabase
        .from("store_pages")
        .update(pageData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-pages", store?.id] });
      toast.success("Página atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar página: ${error.message}`);
    },
  });

  const deletePage = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase
        .from("store_pages")
        .delete()
        .eq("id", pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-pages", store?.id] });
      toast.success("Página excluída com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir página: ${error.message}`);
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { data, error } = await supabase
        .from("store_pages")
        .update({ is_published })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["store-pages", store?.id] });
      toast.success(data.is_published ? "Página publicada!" : "Página despublicada!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar publicação: ${error.message}`);
    },
  });

  return {
    pages,
    isLoading,
    createPage,
    updatePage,
    deletePage,
    togglePublish,
  };
};
