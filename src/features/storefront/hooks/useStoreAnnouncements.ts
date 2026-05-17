import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  text: string;
  link: string | null;
  position: number;
}

interface AnnouncementBarSettings {
  enabled: boolean;
  bgColor: string;
  textColor: string;
  speed: number;
  announcements: Announcement[];
}

export const useStoreAnnouncements = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ["store-announcements", storeId],
    queryFn: async (): Promise<AnnouncementBarSettings> => {
      if (!storeId) {
        return {
          enabled: false,
          bgColor: "#000000",
          textColor: "#FFFFFF",
          speed: 30,
          announcements: [],
        };
      }

      // Fetch store settings
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("announcement_bar_enabled, announcement_bar_bg_color, announcement_bar_text_color, announcement_bar_speed")
        .eq("id", storeId)
        .single();

      if (storeError || !store) {
        return {
          enabled: false,
          bgColor: "#000000",
          textColor: "#FFFFFF",
          speed: 30,
          announcements: [],
        };
      }

      // Fetch announcements
      const { data: announcements, error: announcementsError } = await supabase
        .from("store_announcements")
        .select("id, text, link, position")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("position", { ascending: true });

      if (announcementsError) {
        console.error("Error fetching announcements:", announcementsError);
      }

      return {
        enabled: store.announcement_bar_enabled ?? false,
        bgColor: store.announcement_bar_bg_color ?? "#000000",
        textColor: store.announcement_bar_text_color ?? "#FFFFFF",
        speed: store.announcement_bar_speed ?? 30,
        announcements: announcements ?? [],
      };
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
