import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, DollarSign, ShoppingBag, TrendingUp, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useActiveStore } from "@/features/stores";
import { StockAlertsCard } from "@/features/alerts/components/StockAlertsCard";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";

export default function DashboardHome() {
  const { user } = useAuth();
  const { store: activeStore } = useActiveStore();
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    revenue: 0,
    abandonedCarts: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      if (!user || !activeStore) return;

      const storeId = activeStore.id;

      const [productsResult, ordersResult, abandonedResult] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase.from("orders").select("total", { count: "exact" }).eq("store_id", storeId).neq("status_pedido", "cancelado").in("status_pagamento", ["pago", "aprovado"]),
        supabase.from("abandoned_carts").select("id", { count: "exact", head: true }).eq("store_id", storeId).is("recovered_at", null),
      ]);

      let revenueAmount = 0;
      if (ordersResult.data) {
        revenueAmount = ordersResult.data.reduce((acc, order) => acc + (Number(order.total) || 0), 0);
      }

      setStats({
        products: productsResult.count || 0,
        orders: ordersResult.count || 0,
        revenue: revenueAmount,
        abandonedCarts: abandonedResult.count || 0,
      });
    };

    loadStats();
  }, [user, activeStore]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bem-vindo à Zelpi</h1>
          <p className="text-muted-foreground">Gerencie sua loja e acompanhe seus resultados</p>
        </div>
        {activeStore && (
          <Button
            variant="outline"
            onClick={() => window.open(`https://${activeStore.slug}.zelpi.com.br`, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Minha Loja
          </Button>
        )}
      </div>

      {/* Checklist de Configuração */}
      <SetupChecklist storeId={activeStore?.id} userId={user?.id} />

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.revenue.toFixed(2)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-500">+0%</span>
              <span className="ml-1">vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de pedidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastrados na loja</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carrinhos Abandonados</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.abandonedCarts}</div>
            <p className="text-xs text-muted-foreground mt-1">Oportunidades de recuperação</p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Secundárias e Alertas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats.orders > 0 ? stats.revenue / stats.orders : 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valor médio por pedido</p>
          </CardContent>
        </Card>

        <StockAlertsCard storeId={activeStore?.id} />
      </div>

      {/* Atividades Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma atividade recente</p>
            <p className="text-sm mt-1">Suas vendas e atualizações aparecerão aqui</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
