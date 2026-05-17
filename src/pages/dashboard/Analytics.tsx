import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw, BarChart3 } from "lucide-react";
import { AbandonedCartReport } from "@/features/abandoned-carts";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { OverviewTab } from "@/features/analytics/components/OverviewTab";
import { SalesTab } from "@/features/analytics/components/SalesTab";
import { CustomersTab } from "@/features/analytics/components/CustomersTab";
import { ProductsTab } from "@/features/analytics/components/ProductsTab";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Analytics = () => {
  const { store } = useActiveStore();
  const navigate = useNavigate();
  const { 
    loading, 
    overviewStats, 
    last7DaysSales, 
    periodComparison,
    salesByPaymentMethod,
    ordersByStatus,
    topProducts,
    lowStockProducts,
    customersByPeriod,
    repurchaseRate
  } = useAnalyticsData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Acompanhe métricas detalhadas da sua loja</p>
        </div>
        <div className="h-64 flex items-center justify-center border rounded-lg bg-card text-muted-foreground">
          Carregando dados...
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Acompanhe métricas detalhadas da sua loja</p>
        </div>
        <div className="h-64 flex flex-col items-center justify-center border rounded-lg bg-card text-muted-foreground gap-3">
          <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
          <p>Configure e ative sua loja para visualizar os analytics</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/stores")}>
            Configurar Loja
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Acompanhe métricas detalhadas da sua loja
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto justify-start">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="recovery" className="flex items-center gap-1.5">
            <RefreshCcw className="h-3.5 w-3.5" />
            Carrinhos Abandonados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab 
            stats={overviewStats} 
            periodComparison={periodComparison}
            last7DaysSales={last7DaysSales}
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <SalesTab 
            last7DaysSales={last7DaysSales}
            salesByPaymentMethod={salesByPaymentMethod}
            ordersByStatus={ordersByStatus}
            topProducts={topProducts}
          />
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <ProductsTab 
            topProducts={topProducts}
            lowStockProducts={lowStockProducts}
          />
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <CustomersTab 
            customersByPeriod={customersByPeriod}
            repurchaseRate={repurchaseRate}
            totalCustomers={overviewStats.customers}
          />
        </TabsContent>
        
        <TabsContent value="recovery" className="space-y-4">
          <AbandonedCartReport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
