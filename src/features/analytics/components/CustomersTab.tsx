import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Users, RefreshCcw } from "lucide-react";

interface CustomersTabProps {
  customersByPeriod: { date: string; count: number }[];
  repurchaseRate: number;
  totalCustomers: number;
}

export function CustomersTab({ customersByPeriod, repurchaseRate, totalCustomers }: CustomersTabProps) {
  const chartConfig = {
    count: { label: "Novos clientes", color: "hsl(var(--primary))" },
  };

  // Last 7 days new customers
  const last7Days = customersByPeriod.slice(-7);
  const newCustomersLast7Days = last7Days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">cadastrados na loja</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos (7 dias)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newCustomersLast7Days}</div>
            <p className="text-xs text-muted-foreground">novos clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recompra</CardTitle>
            <RefreshCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repurchaseRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">clientes que voltaram a comprar</p>
          </CardContent>
        </Card>
      </div>

      {/* New Customers Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Novos Clientes por Período</CardTitle>
          <CardDescription>Cadastros nos últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <AreaChart data={customersByPeriod}>
              <defs>
                <linearGradient id="customersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => index % 5 === 0 ? value : ""}
              />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                fill="url(#customersGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Repurchase Rate Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre a Taxa de Recompra</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            A taxa de recompra indica a porcentagem de clientes que fizeram mais de um pedido na sua loja. 
            Uma taxa acima de <strong>20%</strong> é considerada boa para e-commerce. 
            Para aumentar essa taxa, considere:
          </p>
          <ul className="mt-3 text-sm text-muted-foreground list-disc list-inside space-y-1">
            <li>Programas de fidelidade</li>
            <li>E-mails de pós-venda</li>
            <li>Cupons de desconto para próxima compra</li>
            <li>Lembretes de reabastecimento</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
