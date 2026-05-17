import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, MapPin, CreditCard, Loader2, ExternalLink } from "lucide-react";
import { OrderStatusBadge } from "@/features/customer-portal/components/OrderStatusBadge";
import { OrderProgressBar } from "@/features/customer-portal/components/OrderProgressBar";
import { OrderPaymentDialog } from "@/features/customer-portal/components/OrderPaymentDialog";
import { useCustomerOrders, CustomerOrder } from "@/features/customers/hooks/useCustomerOrders";
import { getOrderItemVariant } from "@/features/orders/lib/getOrderItemVariant";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

type ComponentStatus = "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled" | "payment_pending" | "payment_failed" | "returned";

const mapStatusToComponent = (statusPedido: string, statusPagamento: string): ComponentStatus => {
  if (statusPagamento === 'pendente' || statusPagamento === 'expirado') return 'payment_pending';
  if (statusPagamento === 'recusado' || statusPagamento === 'rejeitado' || statusPagamento === 'falhou') return 'payment_failed';
  const statusMap: Record<string, ComponentStatus> = {
    novo: "confirmed",
    em_preparo: "preparing",
    enviado: "shipped",
    entregue: "delivered",
    cancelado: "cancelled",
    devolvido: "returned",
  };
  return statusMap[statusPedido] || "pending";
};

const hasPaymentIssue = (order: CustomerOrder) => {
  return ['pendente', 'expirado', 'recusado', 'rejeitado', 'falhou'].includes(order.status_pagamento);
};

export default function OrderStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: orders, isLoading } = useCustomerOrders();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const order = orders?.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">Pedido não encontrado</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const componentStatus = mapStatusToComponent(order.status_pedido, order.status_pagamento);
  const orderDate = format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground">
            Pedido #{order.order_number || order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground">{orderDate}</p>
        </div>
        <OrderStatusBadge status={componentStatus} />
      </div>

      {/* Progress Bar */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <OrderProgressBar status={componentStatus} />
        </CardContent>
      </Card>

      {/* Payment Issue Alert */}
      {hasPaymentIssue(order) && (
        <Card className={`shadow-soft border-2 ${
          order.status_pagamento === 'recusado' || order.status_pagamento === 'rejeitado' || order.status_pagamento === 'falhou'
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-warning/50 bg-warning/5'
        }`}>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-4">
              {order.status_pagamento === 'recusado' || order.status_pagamento === 'rejeitado' || order.status_pagamento === 'falhou'
                ? "O pagamento não foi aprovado. Tente novamente com outro cartão ou escolha outra forma de pagamento."
                : "Complete o pagamento para que possamos processar seu pedido."}
            </p>
            <Button
              variant="store"
              className="w-full"
              size="lg"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pagar Agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tracking */}
      {order.tracking_code && (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <p className="font-semibold text-foreground mb-3">Código de Rastreio</p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {order.tracking_code}
                </p>
                {order.tracking_carrier && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Transportadora: {order.tracking_carrier}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const url = order.tracking_url ||
                    `https://rastreamento.correios.com.br/app/index.php?objeto=${order.tracking_code}`;
                  window.open(url, '_blank');
                }}
                className="whitespace-nowrap w-full sm:w-auto"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Rastrear Pacote
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <p className="font-semibold text-foreground mb-4">
            Itens do Pedido ({order.products.length} {order.products.length === 1 ? 'item' : 'itens'})
          </p>
          <div className="space-y-4">
            {order.products.map((item, idx) => {
              const snapshot = order.product_snapshots?.[idx];
              const imageUrl = snapshot?.image_url || item.image_url;
              const variantLabel = getOrderItemVariant(item, snapshot);
              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={snapshot?.name || item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm line-clamp-2 leading-tight">{snapshot?.name || item.name}</p>
                    {variantLabel && (
                      <p className="text-xs text-muted-foreground mt-0.5">{variantLabel}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">Qtd: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-foreground text-sm whitespace-nowrap">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              );
            })}
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span className="text-foreground">{formatCurrency(order.frete)}</span>
            </div>
            {order.desconto > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-success">-{formatCurrency(order.desconto)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between pt-1">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-foreground">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address */}
      {order.endereco_entrega && (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground mb-2">Endereço de Entrega</p>
                <p className="text-sm text-muted-foreground">
                  {order.endereco_entrega.rua}, {order.endereco_entrega.numero}
                  {order.endereco_entrega.complemento && ` - ${order.endereco_entrega.complemento}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.endereco_entrega.bairro} - {order.endereco_entrega.cidade}/{order.endereco_entrega.estado}
                </p>
                <p className="text-sm text-muted-foreground">CEP: {order.endereco_entrega.cep}</p>
                {(order.endereco_entrega.metodo_envio || order.endereco_entrega.transportadora || order.endereco_entrega.prazo_entrega_dias) && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Forma de envio
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {order.endereco_entrega.metodo_envio || "Entrega"}
                      {order.endereco_entrega.transportadora &&
                      order.endereco_entrega.transportadora !== order.endereco_entrega.metodo_envio
                        ? ` · ${order.endereco_entrega.transportadora}`
                        : ""}
                    </p>
                    {order.endereco_entrega.prazo_entrega_dias != null && (
                      <p className="text-xs text-muted-foreground">
                        Prazo: {order.endereco_entrega.prazo_entrega_dias}{" "}
                        {order.endereco_entrega.prazo_entrega_dias === 1 ? "dia útil" : "dias úteis"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method */}
      {order.forma_pagamento && (
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-foreground">Forma de Pagamento</p>
                <p className="text-sm text-muted-foreground capitalize">{order.forma_pagamento}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <OrderPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={order}
        onSuccess={() => setPaymentDialogOpen(false)}
      />
    </div>
  );
}
