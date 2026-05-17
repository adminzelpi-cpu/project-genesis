import { AlertTriangle, Package, CheckCircle, Bell, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStockAlerts } from "../hooks/useStockAlerts";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface StockAlertsCardProps {
  storeId?: string;
}

export function StockAlertsCard({ storeId }: StockAlertsCardProps) {
  const { alerts, isLoading, acknowledgeAlert, resolveAlert } = useStockAlerts(storeId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum alerta de estoque no momento
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "high":
      case "critical":
        return {
          badge: "bg-red-100 text-red-700 border-red-200",
          icon: "text-red-500",
          bg: "bg-red-50 border-red-200",
        };
      case "medium":
        return {
          badge: "bg-amber-100 text-amber-700 border-amber-200",
          icon: "text-amber-500",
          bg: "bg-amber-50 border-amber-200",
        };
      default:
        return {
          badge: "bg-blue-100 text-blue-700 border-blue-200",
          icon: "text-blue-500",
          bg: "bg-blue-50 border-blue-200",
        };
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas de Estoque
            {alerts.filter(a => a.status === "new").length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {alerts.filter(a => a.status === "new").length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="space-y-2 p-4 pt-0">
            {alerts.slice(0, 5).map(alert => {
              const styles = getSeverityStyles(alert.severity);
              const isOutOfStock = alert.title.toLowerCase().includes("esgotado");

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    alert.status === "new" ? styles.bg : "bg-muted/30 border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5", styles.icon)}>
                      {isOutOfStock ? (
                        <Package className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {alert.title.replace("Estoque baixo: ", "").replace("Produto esgotado: ", "")}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-[10px] px-1.5 py-0 h-4", styles.badge)}
                        >
                          {isOutOfStock ? "Esgotado" : `${alert.metadata.current_stock} un.`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pl-7">
                    {alert.status === "new" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Reconhecer
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolver
                    </Button>
                    {alert.metadata.product_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs ml-auto"
                        onClick={() => navigate(`/dashboard/products/${alert.metadata.product_id}`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
