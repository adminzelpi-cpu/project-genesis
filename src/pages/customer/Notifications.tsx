import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Tag, Bell, Loader2, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
import { useCustomerNotifications } from "@/features/customers/hooks/useCustomerNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";

const typeIcons: Record<string, any> = {
  order: Package,
  shipping: Truck,
  promotion: Tag,
  info: Bell,
  payment: CreditCard,
  success: CheckCircle,
  alert: AlertCircle,
};

const typeColors: Record<string, string> = {
  order: "bg-primary/10 text-primary",
  shipping: "bg-blue-500/10 text-blue-600",
  promotion: "bg-accent/10 text-accent-foreground",
  info: "bg-muted text-muted-foreground",
  payment: "bg-yellow-500/10 text-yellow-600",
  success: "bg-green-500/10 text-green-600",
  alert: "bg-destructive/10 text-destructive",
};

export default function Notifications() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useCustomerNotifications();
  const navigate = useNavigate();
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const basePath = buildPath("/customer");

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navigate to order if applicable
    if (notification.order_id) {
      navigate(`${basePath}/orders`);
    }
  };

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Helmet><title>Notificações</title></Helmet>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`
              : "Todas lidas"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {!notifications || notifications.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Nenhuma notificação
            </p>
            <p className="text-sm text-muted-foreground">
              Você será notificado sobre atualizações de pedidos e promoções
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colorClass = typeColors[notification.type] || typeColors.info;

            return (
              <Card
                key={notification.id}
                className={`shadow-soft hover:shadow-medium transition-all cursor-pointer ${
                  !notification.is_read ? "border-l-4 border-l-primary" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary border-primary/20 shrink-0"
                          >
                            Nova
                          </Badge>
                        )}
                      </div>
                      {notification.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
