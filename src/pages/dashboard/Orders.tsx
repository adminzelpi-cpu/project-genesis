import { useMemo, useState } from "react";
import { useOrders } from "@/features/orders/hooks/useOrders";
import { OrdersTable } from "@/features/orders/components/OrdersTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, AlertCircle } from "lucide-react";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";

// Statuses that hide an order from the main "Pedidos" view but make it
// available in the "Recuperáveis" tab so the merchant can still act on them.
const RECOVERABLE_PAYMENT_STATUSES = ["recusado", "rejeitado", "falhou", "expirado"];

export default function Orders() {
  const { store } = useActiveStore();
  const { orders, isLoading } = useOrders(store?.id);
  const [activeTab, setActiveTab] = useState<"main" | "recoverable">("main");

  const { mainOrders, recoverableOrders } = useMemo(() => {
    const all = orders || [];
    const recoverable = all.filter((o) =>
      RECOVERABLE_PAYMENT_STATUSES.includes(o.status_pagamento)
    );
    const main = all.filter(
      (o) => !RECOVERABLE_PAYMENT_STATUSES.includes(o.status_pagamento)
    );
    return { mainOrders: main, recoverableOrders: recoverable };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ShoppingCart className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os pedidos da sua loja
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Pedidos</CardDescription>
            <CardTitle className="text-3xl">{mainOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Novos</CardDescription>
            <CardTitle className="text-3xl">
              {mainOrders.filter((o) => o.status_pedido === "novo").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Em Preparo</CardDescription>
            <CardTitle className="text-3xl">
              {mainOrders.filter((o) => o.status_pedido === "em_preparo").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enviados</CardDescription>
            <CardTitle className="text-3xl">
              {mainOrders.filter((o) => o.status_pedido === "enviado").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "main" | "recoverable")}>
        <TabsList>
          <TabsTrigger value="main">
            Pedidos
            <Badge variant="secondary" className="ml-2">{mainOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="recoverable">
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            Recuperáveis
            {recoverableOrders.length > 0 && (
              <Badge variant="destructive" className="ml-2">{recoverableOrders.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Pedidos</CardTitle>
              <CardDescription>
                Pedidos pagos, aguardando pagamento (PIX/boleto) e em processamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrdersTable orders={mainOrders} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recoverable">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Recuperáveis</CardTitle>
              <CardDescription>
                Pagamentos recusados, falhos ou expirados. O cliente pode tentar novamente pela área dele — ou você pode entrar em contato para auxiliar a finalizar a compra.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrdersTable orders={recoverableOrders} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
