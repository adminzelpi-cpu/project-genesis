import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StorefrontMenuItem {
  id: string;
  title: string;
  url: string | null;
  link_type: "custom" | "page" | "category" | "product";
  link_reference_id: string | null;
  position: number;
  is_active: boolean;
  open_in_new_tab: boolean;
  footer_section: "help" | "institutional" | null;
  children?: StorefrontMenuItem[];
}

export interface StorefrontMenu {
  id: string;
  name: string;
  location: "header" | "footer" | "sidebar";
  items: StorefrontMenuItem[];
  helpItems?: StorefrontMenuItem[];
  institutionalItems?: StorefrontMenuItem[];
}

export const useStorefrontMenus = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ["storefront-menus", storeId],
    queryFn: async () => {
      if (!storeId) return { header: null, footer: null };

      // Fetch menus
      const { data: menus, error: menusError } = await supabase
        .from("store_menus")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true);

      if (menusError) throw menusError;

      // Get header and footer menu IDs
      const headerMenu = (menus || []).find((m: any) => m.location === "header");
      const footerMenu = (menus || []).find((m: any) => m.location === "footer");

      const result: { header: StorefrontMenu | null; footer: StorefrontMenu | null } = {
        header: null,
        footer: null,
      };

      // Fetch items for each menu
      for (const menu of [headerMenu, footerMenu].filter(Boolean)) {
        if (!menu) continue;

        const { data: items } = await supabase
          .from("store_menu_items")
          .select("*")
          .eq("menu_id", menu.id)
          .eq("is_active", true)
          .order("position", { ascending: true });

        // Build tree structure
        const itemsMap = new Map<string, StorefrontMenuItem>();
        const rootItems: StorefrontMenuItem[] = [];

        (items || []).forEach((item: any) => {
          const menuItem: StorefrontMenuItem = {
            id: item.id,
            title: item.title,
            url: item.url,
            link_type: item.link_type,
            link_reference_id: item.link_reference_id,
            position: item.position,
            is_active: item.is_active,
            open_in_new_tab: item.open_in_new_tab,
            footer_section: item.footer_section,
            children: [],
          };
          itemsMap.set(item.id, menuItem);
        });

        (items || []).forEach((item: any) => {
          const menuItem = itemsMap.get(item.id)!;
          if (item.parent_id && itemsMap.has(item.parent_id)) {
            itemsMap.get(item.parent_id)!.children!.push(menuItem);
          } else {
            rootItems.push(menuItem);
          }
        });

        // For footer, separate items by section
        const helpItems = rootItems.filter(item => item.footer_section === "help");
        const institutionalItems = rootItems.filter(item => item.footer_section === "institutional" || !item.footer_section);

        const storefrontMenu: StorefrontMenu = {
          id: menu.id,
          name: menu.name,
          location: menu.location as "header" | "footer" | "sidebar",
          items: rootItems,
          helpItems: menu.location === "footer" ? helpItems : undefined,
          institutionalItems: menu.location === "footer" ? institutionalItems : undefined,
        };

        if (menu.location === "header") {
          result.header = storefrontMenu;
        } else if (menu.location === "footer") {
          result.footer = storefrontMenu;
        }
      }

      return result;
    },
    enabled: !!storeId,
  });
};
