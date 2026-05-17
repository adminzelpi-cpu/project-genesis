import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Package, Truck, XCircle, CreditCard, AlertCircle, RotateCcw } from "lucide-react";

type OrderStatus = "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled" | "payment_pending" | "payment_failed" | "returned";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const statusConfig = {
  pending: {
    label: "Pendente",
    icon: Clock,
    variant: "secondary" as const,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle2,
    variant: "secondary" as const,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  preparing: {
    label: "Preparando",
    icon: Package,
    variant: "secondary" as const,
    className: "bg-accent/10 text-accent border-accent/20",
  },
  shipped: {
    label: "Em Transporte",
    icon: Truck,
    variant: "secondary" as const,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  delivered: {
    label: "Entregue",
    icon: CheckCircle2,
    variant: "secondary" as const,
    className: "bg-success/10 text-success border-success/20",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    variant: "secondary" as const,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  returned: {
    label: "Devolvido",
    icon: RotateCcw,
    variant: "secondary" as const,
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  payment_pending: {
    label: "Aguardando Pagamento",
    icon: CreditCard,
    variant: "secondary" as const,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  payment_failed: {
    label: "Pagamento Recusado",
    icon: AlertCircle,
    variant: "secondary" as const,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
