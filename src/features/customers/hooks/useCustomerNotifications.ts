import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { invokeCustomerFn, hasCustomerToken } from "@/features/customers/lib/customerApi";

interface CustomerNotification {
  id: string;
  type: string;
  title: string;
  description: string | null;
  order_id: string | null;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export function useCustomerNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["customer-notifications"],
    queryFn: async () => {
      if (!hasCustomerToken()) return [];
      const res = await invokeCustomerFn<{ notifications: CustomerNotification[] }>(
        "customer-notifications",
        { body: { action: "list" } }
      );
      return res.notifications || [];
    },
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!hasCustomerToken()) throw new Error("Usuário não autenticado");
      await invokeCustomerFn("customer-notifications", {
        body: { action: "mark_read", notification_id: notificationId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!hasCustomerToken()) throw new Error("Usuário não autenticado");
      await invokeCustomerFn("customer-notifications", {
        body: { action: "mark_all_read" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-notifications"] });
      toast.success("Todas as notificações marcadas como lidas");
    },
    onError: () => {
      toast.error("Erro ao marcar notificações");
    },
  });

  return { notifications, isLoading, unreadCount, markAsRead, markAllAsRead };
}
