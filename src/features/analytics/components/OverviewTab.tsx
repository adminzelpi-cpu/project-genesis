import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingUp, Package, RefreshCcw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  stats: {
    revenue: number;
    orders: number;
    avgTicket: number;
    customers: number;
    products: number;
    abandonedCarts: number;
  };
  periodComparison: {
    revenueChange: number;
    ordersChange: number;
    customersChange: number;
    ticketChange: number;
  };
  last7DaysSales: { date: string; revenue: number; orders: number }[];
}

export function OverviewTab({ stats, periodComparison, last7DaysSales }: OverviewTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCardWithSparkline
        title="Receita Total"
        value={`R$ ${stats.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        icon={DollarSign}
        change={periodComparison.revenueChange}
        sparklineData={last7DaysSales}
        dataKey="revenue"
      />
      <StatCardWithSparkline
        title="Pedidos"
        value={stats.orders.toString()}
        icon={ShoppingCart}
        change={periodComparison.ordersChange}
        sparklineData={last7DaysSales}
        dataKey="orders"
      />
      <StatCard
        title="Ticket Médio"
        value={`R$ ${stats.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        icon={TrendingUp}
        change={periodComparison.ticketChange}
      />
      <StatCard
        title="Clientes"
        value={stats.customers.toString()}
        icon={Users}
        change={periodComparison.customersChange}
      />
      <StatCard
        title="Produtos"
        value={stats.products.toString()}
        icon={Package}
      />
      <StatCard
        title="Carrinhos Abandonados"
        value={stats.abandonedCarts.toString()}
        icon={RefreshCcw}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  change,
}: {
  title: string;
  value: string;
  icon: any;
  change?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && <ChangeIndicator change={change} />}
      </CardContent>
    </Card>
  );
}

function StatCardWithSparkline({
  title,
  value,
  icon: Icon,
  change,
  sparklineData,
  dataKey,
}: {
  title: string;
  value: string;
  icon: any;
  change?: number;
  sparklineData: any[];
  dataKey: string;
}) {
  const isPositive = (change ?? 0) >= 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {change !== undefined && <ChangeIndicator change={change} />}
          </div>
          <div className="h-12 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                  fill={`url(#gradient-${dataKey})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangeIndicator({ change }: { change: number }) {
  const isPositive = change >= 0;
  return (
    <p className={cn(
      "text-xs mt-1",
      isPositive ? "text-green-500" : "text-destructive"
    )}>
      {isPositive ? "+" : ""}{change.toFixed(1)}% vs últimos 30 dias
    </p>
  );
}
