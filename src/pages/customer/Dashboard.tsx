import { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Package, User, MapPin, CreditCard, Heart, ChevronRight, AlertCircle, Truck, Loader2, ShoppingBag, CheckCircle, RotateCcw, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/features/customer-portal/components/OrderStatusBadge";
import { OrderProgressBar } from "@/features/customer-portal/components/OrderProgressBar";
import { OrderPaymentDialog } from "@/features/customer-portal/components/OrderPaymentDialog";
import { useCustomerOrders, useOrdersWithPaymentIssues, CustomerOrder } from "@/features/customers/hooks/useCustomerOrders";
import { getOrderItemVariant } from "@/features/orders/lib/getOrderItemVariant";
import { useCustomerStore } from "@/features/customers/hooks/useCustomerStore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// menuItems moved inside component to use dynamic basePath

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const getPaymentStatusText = (status: string) => {
  switch (status) {
    case "pendente": return "Aguardando Pagamento";
    case "expirado": return "PIX/Boleto Expirado";
    case "recusado": return "Pagamento Recusado";
    case "rejeitado": return "Pagamento Recusado";
    case "falhou": return "Falha no Pagamento";
    default: return "Problema com Pagamento";
  }
};

const getOrderStatusText = (status: string) => {
  switch (status) {
    case "enviado": return "A caminho";
    case "em_preparo": return "Em preparação";
    case "novo": return "Pedido Confirmado";
    case "entregue": return "Entregue";
    default: return status;
  }
};

const mapStatusToComponent = (statusPedido: string, statusPagamento: string): "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled" | "payment_pending" | "payment_failed" | "returned" => {
  // Check payment status first
  if (statusPagamento === 'pendente' || statusPagamento === 'expirado') {
    return 'payment_pending';
  }
  if (statusPagamento === 'recusado' || statusPagamento === 'rejeitado' || statusPagamento === 'falhou') {
    return 'payment_failed';
  }
  
  // Then check order status
  const statusMap: Record<string, "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled" | "returned"> = {
    novo: "confirmed",
    em_preparo: "preparing",
    enviado: "shipped",
    entregue: "delivered",
    cancelado: "cancelled",
    devolvido: "returned",
  };
  return statusMap[statusPedido] || "pending";
};

export default function Dashboard() {
  const navigate = useNavigate();
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [orderToPay, setOrderToPay] = useState<CustomerOrder | null>(null);

  const { data: allOrders, isLoading } = useCustomerOrders();
  const { orders: ordersWithPaymentIssues } = useOrdersWithPaymentIssues();
  const { data: store } = useCustomerStore();

  const basePath = buildPath("/customer");

  const menuItems = useMemo(() => [
    { title: "Meus Pedidos", icon: Package, url: `${basePath}/orders`, badge: null },
    { title: "Favoritos", icon: Heart, url: `${basePath}/favorites`, badge: null },
    { title: "Minha Conta", icon: User, url: `${basePath}/profile`, badge: null },
    { title: "Endereços", icon: MapPin, url: `${basePath}/addresses`, badge: null },
    { title: "Pagamentos", icon: CreditCard, url: `${basePath}/payments`, badge: null },
    
  ], [basePath]);

  // Determine the single most important "highlight" order based on priority
  const highlightOrder = useMemo(() => {
    if (!allOrders || allOrders.length === 0) return null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Priority 1: Payment issues (pendente, expirado, recusado, falhou)
    const paymentIssue = allOrders.find(o => 
      ["pendente", "expirado", "recusado", "rejeitado", "falhou"].includes(o.status_pagamento)
      && o.status_pedido !== "cancelado"
    );
    if (paymentIssue) {
      const isFailure = paymentIssue.status_pagamento === "recusado" || paymentIssue.status_pagamento === "rejeitado" || paymentIssue.status_pagamento === "falhou";
      return { order: paymentIssue, type: isFailure ? "payment_failed" as const : "payment_pending" as const };
    }

    // Priority 2: Shipped (aprovado)
    const shipped = allOrders.find(o => o.status_pedido === "enviado" && o.status_pagamento === "aprovado");
    if (shipped) return { order: shipped, type: "shipped" as const };

    // Priority 3: Preparing (aprovado)
    const preparing = allOrders.find(o => o.status_pedido === "em_preparo" && o.status_pagamento === "aprovado");
    if (preparing) return { order: preparing, type: "preparing" as const };

    // Priority 4: New + Paid
    const newPaid = allOrders.find(o => o.status_pedido === "novo" && o.status_pagamento === "aprovado");
    if (newPaid) return { order: newPaid, type: "confirmed" as const };

    // Priority 5: Delivered within last 7 days
    const recentDelivered = allOrders.find(o => 
      o.status_pedido === "entregue" && new Date(o.updated_at) >= sevenDaysAgo
    );
    if (recentDelivered) return { order: recentDelivered, type: "delivered_recent" as const };

    return null;
  }, [allOrders]);

  // Count remaining payment issues for "ver mais" link
  const remainingPaymentIssues = (ordersWithPaymentIssues.length > 1) ? ordersWithPaymentIssues.length - 1 : 0;

  const handlePayNow = (order: CustomerOrder) => {
    setOrderToPay(order);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    setOrderToPay(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasNoOrders = !allOrders || allOrders.length === 0;

  // Helper to render the order image thumbnail
  const renderOrderImage = (order: CustomerOrder) => {
    const firstSnapshot = order.product_snapshots?.[0];
    const imageUrl = firstSnapshot?.image_url || order.products[0]?.image_url;
    return (
      <div className="relative w-16 h-16 md:w-24 md:h-24 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Produto" className="w-full h-full object-cover" />
        ) : (
          <Package className="h-8 w-8 text-muted-foreground" />
        )}
        {order.products.length > 1 && (
          <Badge className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-background/90 text-foreground border border-border text-xs" variant="secondary">
            +{order.products.length - 1}
          </Badge>
        )}
      </div>
    );
  };

  const renderOrderInfo = (order: CustomerOrder) => {
    const orderDate = format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR });
    return (
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-bold text-foreground text-base md:text-lg">
          #{order.order_number || order.id.slice(0, 8).toUpperCase()}
        </p>
        <p className="text-xs md:text-sm text-muted-foreground">{orderDate}</p>
        <p className="text-lg md:text-xl font-bold text-foreground mt-2">
          {formatCurrency(order.total)}
        </p>
      </div>
    );
  };

  // Render the highlight card
  const renderHighlightCard = () => {
    if (!highlightOrder) return null;
    const { order, type } = highlightOrder;

    // Payment issues (pending or failed)
    if (type === "payment_pending" || type === "payment_failed") {
      const isFailure = type === "payment_failed";
      return (
        <Card className={`shadow-medium border-2 overflow-hidden ${
          isFailure ? "border-destructive/50 bg-destructive/5" : "border-warning/50 bg-warning/5"
        }`}>
          <CardContent className="p-0">
            <div className={`p-3 md:p-4 border-b flex items-center gap-2 ${
              isFailure ? "bg-destructive/10 border-destructive/20" : "bg-warning/10 border-warning/20"
            }`}>
              <AlertCircle className={`h-4 w-4 md:h-5 md:w-5 ${isFailure ? "text-destructive" : "text-warning"}`} />
              <h2 className={`text-base md:text-lg font-semibold ${isFailure ? "text-destructive" : "text-warning"}`}>
                {getPaymentStatusText(order.status_pagamento)}
              </h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 mb-4">
                {renderOrderInfo(order)}
                {renderOrderImage(order)}
              </div>
              <div className="bg-background/50 p-2.5 md:p-3 rounded-lg mb-3 md:mb-4 border border-border">
                <p className="text-xs md:text-sm text-muted-foreground">
                  {isFailure
                    ? "O pagamento não foi aprovado. Tente novamente com outro cartão ou escolha outra forma de pagamento."
                    : "Complete o pagamento para que possamos processar seu pedido."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="store" className="w-full sm:flex-1" size="lg" onClick={() => handlePayNow(order)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isFailure ? "Tentar Novamente" : "Pagar Agora"}
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate(`${basePath}/orders/${order.id}`)} className="w-full sm:w-auto">
                  Detalhes
                </Button>
              </div>
            </div>
          </CardContent>
          {remainingPaymentIssues > 0 && (
            <div className="px-4 pb-4 md:px-6 md:pb-6">
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate(`${basePath}/orders?filter=payment`)}>
                Ver mais {remainingPaymentIssues} pedido(s) com pagamento pendente
              </Button>
            </div>
          )}
        </Card>
      );
    }

    // Shipped
    if (type === "shipped") {
      return (
        <Card className="shadow-soft border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-border flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="text-base md:text-lg font-semibold text-foreground">A caminho</h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 mb-4">
                {renderOrderInfo(order)}
                {renderOrderImage(order)}
              </div>
              {order.tracking_code && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span>Rastreio:</span>
                  <span className="font-mono font-medium text-foreground">{order.tracking_code}</span>
                </div>
              )}
              <Button variant="store" className="w-full" size="lg" onClick={() => navigate(`${basePath}/orders/${order.id}`)}>
                <Truck className="h-4 w-4 mr-2" />
                Rastrear Entrega
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Preparing
    if (type === "preparing") {
      return (
        <Card className="shadow-soft border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-border flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-base md:text-lg font-semibold text-foreground">Em preparação</h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 mb-4">
                {renderOrderInfo(order)}
                {renderOrderImage(order)}
              </div>
              <Button variant="secondary" className="w-full" size="lg" onClick={() => navigate(`${basePath}/orders/${order.id}`)}>
                <Package className="h-4 w-4 mr-2" />
                Acompanhar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Confirmed (new + paid)
    if (type === "confirmed") {
      return (
        <Card className="shadow-soft border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/10 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-green-500/20 bg-green-500/10 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-base md:text-lg font-semibold text-green-700 dark:text-green-400">Pedido Confirmado</h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 mb-4">
                {renderOrderInfo(order)}
                {renderOrderImage(order)}
              </div>
              <div className="bg-background/50 p-2.5 md:p-3 rounded-lg mb-3 md:mb-4 border border-border">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Pagamento aprovado! Seu pedido está sendo processado.
                </p>
              </div>
              <Button variant="store" className="w-full" size="lg" onClick={() => navigate(`${basePath}/orders/${order.id}`)}>
                <Package className="h-4 w-4 mr-2" />
                Acompanhar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Delivered recently
    if (type === "delivered_recent") {
      const storeUrl = buildPath("/");
      return (
        <Card className="shadow-soft border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 md:p-4 border-b border-border flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h2 className="text-base md:text-lg font-semibold text-foreground">Pedido Entregue</h2>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-3 md:gap-4 mb-4">
                {renderOrderInfo(order)}
                {renderOrderImage(order)}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="store" className="w-full sm:flex-1" size="lg" onClick={() => navigate(storeUrl)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Comprar Novamente
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate(`${basePath}/orders/${order.id}`)} className="w-full sm:w-auto">
                  Ver Pedido
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <Helmet><title>Minha Conta</title></Helmet>
      <div className="text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Área do Cliente</h1>
      </div>

      {/* Priority-based highlight card */}
      {renderHighlightCard()}

      {/* Empty State - No orders yet */}
      {hasNoOrders && ordersWithPaymentIssues.length === 0 && (
        <Card className="shadow-soft border-border">
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum pedido ainda</h2>
            <p className="text-muted-foreground mb-6">
              Explore nossa loja e faça seu primeiro pedido!
            </p>
            <Button variant="store" onClick={() => navigate(buildPath("/"))}>
              Explorar Produtos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Menu Items */}
      <div className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Add badge for payment issues on Pedidos menu item
          const showBadge = item.url === "/customer/orders" && ordersWithPaymentIssues.length > 0;
          
          return (
            <Card 
              key={item.title}
              className="shadow-soft hover:shadow-medium transition-all cursor-pointer border-border"
              onClick={() => navigate(item.url)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className="h-6 w-6 text-foreground" />
                </div>
                <span className="text-base font-medium text-foreground flex-1">
                  {item.title}
                </span>
                {showBadge && (
                  <Badge variant="destructive" className="mr-2">
                    {ordersWithPaymentIssues.length}
                  </Badge>
                )}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Pedido #{selectedOrder?.order_number || selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status do Pedido */}
              <div className="flex flex-col items-center justify-center py-6 px-0 sm:px-6 rounded-lg bg-muted/50 space-y-4">
                <OrderStatusBadge status={mapStatusToComponent(selectedOrder.status_pedido, selectedOrder.status_pagamento)} />
                <div className="w-full px-4 sm:px-0">
                  <OrderProgressBar status={mapStatusToComponent(selectedOrder.status_pedido, selectedOrder.status_pagamento)} />
                </div>
              </div>
              
              {/* Itens do Pedido */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Resumo dos Itens</h3>
                {selectedOrder.products.map((item, idx) => {
                  const snapshot = selectedOrder.product_snapshots?.[idx];
                  const imageUrl = snapshot?.image_url || item.image_url;
                  const variantLabel = getOrderItemVariant(item, snapshot);
                  
                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-lg border border-border">
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={snapshot?.name || item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{snapshot?.name || item.name}</p>
                        {variantLabel && (
                          <p className="text-sm text-muted-foreground">{variantLabel}</p>
                        )}
                        <p className="text-sm text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-foreground whitespace-nowrap">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Tracking */}
              {selectedOrder.tracking_code && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-medium text-foreground mb-3">Código de Rastreio</p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground font-mono break-all">
                        {selectedOrder.tracking_code}
                      </p>
                      {selectedOrder.tracking_carrier && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Transportadora: {selectedOrder.tracking_carrier}
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const url = selectedOrder.tracking_url || 
                          `https://rastreamento.correios.com.br/app/index.php?objeto=${selectedOrder.tracking_code}`;
                        window.open(url, '_blank');
                      }}
                      className="whitespace-nowrap w-full sm:w-auto"
                    >
                      Rastrear Pacote
                    </Button>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="text-foreground">{formatCurrency(selectedOrder.frete)}</span>
                </div>
                {selectedOrder.desconto > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="text-success">-{formatCurrency(selectedOrder.desconto)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-lg font-medium text-foreground">Total do Pedido</span>
                  <span className="text-2xl font-bold text-foreground">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              {/* Botão de Pagamento se necessário */}
              {(selectedOrder.status_pagamento === "pendente" || 
                selectedOrder.status_pagamento === "expirado" ||
                selectedOrder.status_pagamento === "recusado" ||
                selectedOrder.status_pagamento === "rejeitado" ||
                selectedOrder.status_pagamento === "falhou") && (
                <Button 
                  variant="store"
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    handlePayNow(selectedOrder);
                    setSelectedOrder(null);
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar Agora
                </Button>
              )}

              {/* Endereço de Entrega - abaixo do botão de pagar */}
              {selectedOrder.endereco_entrega && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-2">Endereço de Entrega</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.endereco_entrega.rua}, {selectedOrder.endereco_entrega.numero}
                        {selectedOrder.endereco_entrega.complemento && ` - ${selectedOrder.endereco_entrega.complemento}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.endereco_entrega.bairro} - {selectedOrder.endereco_entrega.cidade}/{selectedOrder.endereco_entrega.estado}
                      </p>
                      <p className="text-sm text-muted-foreground">CEP: {selectedOrder.endereco_entrega.cep}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <OrderPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={orderToPay}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
