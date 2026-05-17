import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { toast } from "sonner";

export interface StoreMenu {
  id: string;
  store_id: string;
  name: string;
  location: "header" | "footer" | "sidebar";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreMenuItem {
  id: string;
  menu_id: string;
  parent_id: string | null;
  title: string;
  url: string | null;
  link_type: "custom" | "page" | "category" | "product";
  link_reference_id: string | null;
  position: number;
  is_active: boolean;
  open_in_new_tab: boolean;
  is_system: boolean;
  footer_section: "help" | "institutional" | null;
  created_at: string;
  updated_at: string;
}

export interface MenuWithItems extends StoreMenu {
  items: StoreMenuItem[];
}

export interface CreateMenuItemData {
  menu_id: string;
  parent_id?: string | null;
  title: string;
  url?: string;
  link_type?: "custom" | "page" | "category" | "product";
  link_reference_id?: string;
  position?: number;
  is_active?: boolean;
  open_in_new_tab?: boolean;
  footer_section?: "help" | "institutional" | null;
}

export interface UpdateMenuItemData extends Partial<Omit<CreateMenuItemData, "menu_id">> {
  id: string;
}

export const useStoreMenus = () => {
  const { store } = useActiveStore();
  const queryClient = useQueryClient();

  // Fetch menus with their items
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["store-menus", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      const { data: menusData, error: menusError } = await supabase
        .from("store_menus")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: true });

      if (menusError) throw menusError;

      // Fetch items for each menu
      const menusWithItems: MenuWithItems[] = await Promise.all(
        (menusData as StoreMenu[]).map(async (menu) => {
          const { data: items, error: itemsError } = await supabase
            .from("store_menu_items")
            .select("*")
            .eq("menu_id", menu.id)
            .order("position", { ascending: true });

          if (itemsError) throw itemsError;

          return {
            ...menu,
            items: (items as StoreMenuItem[]) || [],
          };
        })
      );

      return menusWithItems;
    },
    enabled: !!store?.id,
  });

  // Create default menus if none exist
  const createDefaultMenus = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error("Loja não encontrada");

      const defaultMenus = [
        { name: "Menu Principal", location: "header" },
        { name: "Menu Rodapé", location: "footer" },
      ];

      for (const menu of defaultMenus) {
        await supabase.from("store_menus").upsert(
          { store_id: store.id, ...menu },
          { onConflict: "store_id,location" }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-menus", store?.id] });
    },
  });

  // Create menu item
  const createMenuItem = useMutation({
    mutationFn: async (data: CreateMenuItemData) => {
      // Get max position for this menu
      let query = supabase
        .from("store_menu_items")
        .select("position")
        .eq("menu_id", data.menu_id)
        .order("position", { ascending: false })
        .limit(1);
      
      if (data.parent_id) {
        query = query.eq("parent_id", data.parent_id);
      } else {
        query = query.is("parent_id", null);
      }
      
      const { data: maxPosData } = await query.single();

      const newPosition = (maxPosData?.position ?? -1) + 1;

      const { data: newItem, error } = await supabase
        .from("store_menu_items")
        .insert({ ...data, position: data.position ?? newPosition })
        .select()
        .single();

      if (error) throw error;
      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-menus", store?.id] });
      toast.success("Item adicionado ao menu!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`);
    },
  });

  // Update menu item
  const updateMenuItem = useMutation({
    mutationFn: async ({ id, ...data }: UpdateMenuItemData) => {
      const { data: updated, error } = await supabase
        .from("store_menu_items")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-menus", store?.id] });
      toast.success("Item atualizado!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  // Delete menu item
  const deleteMenuItem = useMutation({
    mutationFn: async (itemId: string) => {
      // Check if item is a system item (auto-generated legal links)
      const { data: item } = await supabase
        .from("store_menu_items")
        .select("is_system")
        .eq("id", itemId)
        .single();

      if (item?.is_system) {
        throw new Error("Este item é gerado automaticamente e não pode ser removido.");
      }

      const { error } = await supabase
        .from("store_menu_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-menus", store?.id] });
      toast.success("Item removido do menu!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover item: ${error.message}`);
    },
  });

  // Reorder menu items
  const reorderItems = useMutation({
    mutationFn: async (items: { id: string; position: number }[]) => {
      for (const item of items) {
        await supabase
          .from("store_menu_items")
          .update({ position: item.position })
          .eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-menus", store?.id] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reordenar: ${error.message}`);
    },
  });

  return {
    menus,
    isLoading,
    createDefaultMenus,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    reorderItems,
  };
};
