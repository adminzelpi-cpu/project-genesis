import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store, ShoppingCart, Users, DollarSign, TrendingUp,
  AlertTriangle, ArrowRight, Loader2, RefreshCw
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminOverview() {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["admin-kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_platform_kpis");
      if (error) throw error;
      return data as {
        total_stores: number;
        active_stores: number;
        total_orders: number;
        total_gmv: number;
        total_customers: number;
        stores_last_7d: number;
        orders_last_7d: number;
        gmv_last_7d: number;
        unresolved_errors: number;
      };
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });

  const { data: recentStores, isLoading: storesLoading } = useQuery({
    queryKey: ["admin-recent-stores"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_stores", {
        p_search: "",
        p_status: "all",
        p_limit: 10,
        p_offset: 0,
      });
      if (error) throw error;
      return (data as any)?.stores || [];
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Lojas Totais", value: kpis?.total_stores ?? 0, sub: `${kpis?.active_stores ?? 0} ativas`, icon: Store, color: "text-primary" },
    { label: "Pedidos", value: kpis?.total_orders ?? 0, sub: `${kpis?.orders_last_7d ?? 0} últimos 7d`, icon: ShoppingCart, color: "text-blue-500" },
    { label: "GMV Total", value: formatCurrency(kpis?.total_gmv ?? 0), sub: `${formatCurrency(kpis?.gmv_last_7d ?? 0)} últimos 7d`, icon: DollarSign, color: "text-green-500" },
    { label: "Clientes", value: kpis?.total_customers ?? 0, sub: `${kpis?.stores_last_7d ?? 0} lojas novas (7d)`, icon: Users, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
          <p className="text-muted-foreground">Visão geral da plataforma Zelpi</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-kpis"] });
            queryClient.invalidateQueries({ queryKey: ["admin-recent-stores"] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpisLoading ? "..." : kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpisLoading ? "" : kpi.sub}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {kpis && kpis.unresolved_errors > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-foreground">
                    {kpis.unresolved_errors} erro{kpis.unresolved_errors > 1 ? "s" : ""} não resolvido{kpis.unresolved_errors > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">Verifique o monitor de erros</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard/internal/monitoring">
                  Ver Erros <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Stores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Lojas Recentes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/internal/stores">
              Ver todas <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {storesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !recentStores?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma loja encontrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Loja</th>
                    <th className="pb-2 font-medium">Lojista</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Produtos</th>
                    <th className="pb-2 font-medium text-right">Pedidos</th>
                    <th className="pb-2 font-medium text-right">Receita</th>
                    <th className="pb-2 font-medium">Criada em</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStores.map((store: any) => (
                    <tr key={store.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-foreground">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.slug}.zelpi.com.br</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-foreground">{store.merchant_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{store.merchant_email}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant={store.is_active ? "default" : "secondary"}>
                          {store.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">{store.product_count}</td>
                      <td className="py-3 text-right">{store.order_count}</td>
                      <td className="py-3 text-right">{formatCurrency(store.total_revenue)}</td>
                      <td className="py-3 text-muted-foreground">
                        {format(new Date(store.created_at), "dd/MM/yy", { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
