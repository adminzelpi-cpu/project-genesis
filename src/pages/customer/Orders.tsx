import { useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, List, Loader2, CreditCard, AlertCircle, Eye } from "lucide-react";
import { OrderStatusBadge } from "@/features/customer-portal/components/OrderStatusBadge";
import { OrderPaymentDialog } from "@/features/customer-portal/components/OrderPaymentDialog";
import { useCustomerOrders, useCustomerOrderStats, CustomerOrder } from "@/features/customers/hooks/useCustomerOrders";
import { getOrderItemVariant } from "@/features/orders/lib/getOrderItemVariant";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

type ComponentStatus = "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled" | "payment_pending" | "payment_failed" | "returned";

const mapStatusToComponent = (statusPedido: string, statusPagamento: string): ComponentStatus => {
  // Check payment status first
  if (statusPagamento === 'pendente' || statusPagamento === 'expirado') {
    return 'payment_pending';
  }
  if (statusPagamento === 'recusado' || statusPagamento === 'rejeitado' || statusPagamento === 'falhou') {
    return 'payment_failed';
  }
  
  // Then check order status
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

export default function Orders() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const initialTab = searchParams.get('filter') === 'payment' ? 'payment' : 'all';
  
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [orderToPay, setOrderToPay] = useState<CustomerOrder | null>(null);
  
  const basePath = buildPath("/customer");
  
  const { data: orders, isLoading } = useCustomerOrders();
  const { stats } = useCustomerOrderStats();

  const filteredOrders = (orders || []).filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filterByStatus = (status: string | null) => {
    if (!status || status === 'all') return filteredOrders;
    if (status === "payment") return filteredOrders.filter(o => hasPaymentIssue(o));
    if (status === "pending") return filteredOrders.filter(o => 
      (o.status_pedido === "novo" || o.status_pedido === "em_preparo") && !hasPaymentIssue(o)
    );
    if (status === "shipped") return filteredOrders.filter(o => o.status_pedido === "enviado");
    if (status === "delivered") return filteredOrders.filter(o => o.status_pedido === "entregue");
    if (status === "cancelled") return filteredOrders.filter(o => o.status_pedido === "cancelado");
    return filteredOrders;
  };

  const handlePayNow = (order: CustomerOrder) => {
    setOrderToPay(order);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    setOrderToPay(null);
  };

  const statsConfig = [
    {
      title: "Total de Pedidos",
      value: stats.total.toString(),
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pagamento Pendente",
      value: stats.paymentPending.toString(),
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
      highlight: stats.paymentPending > 0,
    },
    {
      title: "Em Transporte",
      value: stats.shipped.toString(),
      icon: Truck,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Entregues",
      value: stats.delivered.toString(),
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderOrdersList = (ordersToRender: CustomerOrder[]) => {
    if (ordersToRender.length === 0) {
      return (
        <Card className="shadow-soft">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground">Nenhum pedido encontrado</p>
            <p className="text-sm text-muted-foreground">Você ainda não realizou nenhum pedido</p>
          </CardContent>
        </Card>
      );
    }

    return ordersToRender.map((order) => {
      const orderDate = format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR });
      const productSnapshots = order.product_snapshots || [];
      const products = order.products || [];
      const showPaymentButton = hasPaymentIssue(order);
      const componentStatus = mapStatusToComponent(order.status_pedido, order.status_pagamento);

      return (
        <Card 
          key={order.id} 
          className={`shadow-soft hover:shadow-medium transition-all ${
            showPaymentButton ? 'border-warning/50' : ''
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-sm text-muted-foreground">Realizado em {orderDate}</p>
              </div>
              <OrderStatusBadge status={componentStatus} />
            </div>
            
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {products.slice(0, 3).map((item, idx) => {
                const snapshot = productSnapshots[idx];
                const imageUrl = snapshot?.image_url || item.image_url;
                const variantLabel = getOrderItemVariant(item, snapshot);
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                        {snapshot?.name || item.name}
                      </p>
                      {variantLabel && (
                        <p className="text-xs text-muted-foreground mt-0.5">{variantLabel}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">Qtd: {item.quantity}</p>
                    </div>
                  </div>
                );
              })}
              {products.length > 3 && (
                <p className="text-sm text-muted-foreground">+{products.length - 3} itens</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-lg font-bold text-foreground">{formatCurrency(order.total)}</p>
              <div className="flex gap-2">
                {showPaymentButton ? (
                  <>
                    <Button 
                      variant="store"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePayNow(order);
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pagar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`${basePath}/orders/${order.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                  </>
                ) : order.status_pedido === 'enviado' ? (
                  <Button 
                    variant="store"
                    size="sm"
                    onClick={() => navigate(`${basePath}/orders/${order.id}`)}
                  >
                    <Truck className="h-4 w-4 mr-1" />
                    Rastrear Pedido
                  </Button>
                ) : (order.status_pedido === 'novo' || order.status_pedido === 'em_preparo') ? (
                  <Button 
                    variant="store"
                    size="sm"
                    onClick={() => navigate(`${basePath}/orders/${order.id}`)}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Acompanhar Pedido
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`${basePath}/orders/${order.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Helmet><title>Meus Pedidos</title></Helmet>
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meus Pedidos</h1>
        <p className="text-muted-foreground mt-1">Acompanhe todos os seus pedidos</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title} 
              className={`shadow-soft hover:shadow-medium transition-shadow ${
                stat.highlight ? 'border-warning/50 bg-warning/5' : ''
              }`}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número do pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-full md:grid md:grid-cols-6 h-auto">
            <TabsTrigger value="all" className="flex items-center gap-2 px-4 py-2.5 whitespace-nowrap">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Todos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="payment" 
              className={`flex items-center gap-2 px-4 py-2.5 whitespace-nowrap ${
                stats.paymentPending > 0 ? 'text-warning' : ''
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Pagamento</span>
              {stats.paymentPending > 0 && (
                <span className="ml-1 text-xs bg-warning text-warning-foreground rounded-full px-1.5">
                  {stats.paymentPending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2 px-4 py-2.5 whitespace-nowrap">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Em Andamento</span>
            </TabsTrigger>
            <TabsTrigger value="shipped" className="flex items-center gap-2 px-4 py-2.5 whitespace-nowrap">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Em Transporte</span>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex items-center gap-2 px-4 py-2.5 whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Entregues</span>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2 px-4 py-2.5 whitespace-nowrap">
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Cancelados</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-4 mt-6">
          {renderOrdersList(filterByStatus(null))}
        </TabsContent>
        <TabsContent value="payment" className="space-y-4 mt-6">
          {renderOrdersList(filterByStatus("payment"))}
        </TabsContent>
        <TabsContent value="pending" className="space-y-4 mt-6">
          {renderOrdersList(filterByStatus("pending"))}
        </TabsContent>
        <TabsContent value="shipped" className="space-y-4 mt-6">
          {renderOrdersList(filterByStatus("shipped"))}
        </TabsContent>
        <TabsContent value="delivered" className="space-y-4 mt-6">
          {renderOrdersList(filterByStatus("delivered"))}
        </TabsContent>
        <TabsContent value="cancelled" className="space-y-4 mt-6">
          {renderOrdersList(filterByStatus("cancelled"))}
        </TabsContent>
      </Tabs>

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
