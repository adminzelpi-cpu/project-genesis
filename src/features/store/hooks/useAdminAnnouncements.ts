import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Announcement {
  id: string;
  store_id: string;
  text: string;
  link: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AnnouncementBarSettings {
  enabled: boolean;
  bgColor: string;
  textColor: string;
  speed: number;
}

export const useAdminAnnouncements = (storeId: string | undefined) => {
  const queryClient = useQueryClient();

  const announcementsQuery = useQuery({
    queryKey: ["admin-announcements", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from("store_announcements")
        .select("*")
        .eq("store_id", storeId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!storeId,
  });

  const settingsQuery = useQuery({
    queryKey: ["admin-announcement-settings", storeId],
    queryFn: async (): Promise<AnnouncementBarSettings> => {
      if (!storeId) {
        return { enabled: false, bgColor: "#000000", textColor: "#FFFFFF", speed: 30 };
      }

      const { data, error } = await supabase
        .from("stores")
        .select("announcement_bar_enabled, announcement_bar_bg_color, announcement_bar_text_color, announcement_bar_speed")
        .eq("id", storeId)
        .single();

      if (error) throw error;

      return {
        enabled: data.announcement_bar_enabled ?? false,
        bgColor: data.announcement_bar_bg_color ?? "#000000",
        textColor: data.announcement_bar_text_color ?? "#FFFFFF",
        speed: data.announcement_bar_speed ?? 30,
      };
    },
    enabled: !!storeId,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AnnouncementBarSettings>) => {
      if (!storeId) throw new Error("Store ID not found");

      const updateData: Record<string, unknown> = {};
      if (settings.enabled !== undefined) updateData.announcement_bar_enabled = settings.enabled;
      if (settings.bgColor !== undefined) updateData.announcement_bar_bg_color = settings.bgColor;
      if (settings.textColor !== undefined) updateData.announcement_bar_text_color = settings.textColor;
      if (settings.speed !== undefined) updateData.announcement_bar_speed = settings.speed;

      const { error } = await supabase
        .from("stores")
        .update(updateData)
        .eq("id", storeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcement-settings", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-announcements", storeId] });
      toast.success("Configurações salvas!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações");
      console.error(error);
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: { text: string; link?: string }) => {
      if (!storeId) throw new Error("Store ID not found");

      // Get max position
      const currentAnnouncements = announcementsQuery.data || [];
      const maxPosition = currentAnnouncements.length > 0
        ? Math.max(...currentAnnouncements.map(a => a.position))
        : -1;

      const { error } = await supabase
        .from("store_announcements")
        .insert({
          store_id: storeId,
          text: data.text,
          link: data.link || null,
          position: maxPosition + 1,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-announcements", storeId] });
      toast.success("Anúncio adicionado!");
    },
    onError: (error) => {
      toast.error("Erro ao adicionar anúncio");
      console.error(error);
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Announcement> }) => {
      const { error } = await supabase
        .from("store_announcements")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-announcements", storeId] });
      toast.success("Anúncio atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar anúncio");
      console.error(error);
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("store_announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-announcements", storeId] });
      toast.success("Anúncio removido!");
    },
    onError: (error) => {
      toast.error("Erro ao remover anúncio");
      console.error(error);
    },
  });

  const reorderAnnouncementsMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from("store_announcements")
          .update({ position: index })
          .eq("id", id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements", storeId] });
      queryClient.invalidateQueries({ queryKey: ["store-announcements", storeId] });
    },
    onError: (error) => {
      toast.error("Erro ao reordenar anúncios");
      console.error(error);
    },
  });

  return {
    announcements: announcementsQuery.data || [],
    settings: settingsQuery.data,
    isLoading: announcementsQuery.isLoading || settingsQuery.isLoading,
    updateSettings: updateSettingsMutation.mutate,
    createAnnouncement: createAnnouncementMutation.mutate,
    updateAnnouncement: updateAnnouncementMutation.mutate,
    deleteAnnouncement: deleteAnnouncementMutation.mutate,
    reorderAnnouncements: reorderAnnouncementsMutation.mutate,
    isUpdating: updateSettingsMutation.isPending || createAnnouncementMutation.isPending || updateAnnouncementMutation.isPending || deleteAnnouncementMutation.isPending,
  };
};
