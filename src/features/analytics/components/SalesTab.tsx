import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, Bar, BarChart, Pie, PieChart, Cell, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SalesTabProps {
  last7DaysSales: { date: string; revenue: number; orders: number }[];
  salesByPaymentMethod: { name: string; value: number; revenue: number }[];
  ordersByStatus: { name: string; value: number; original: string }[];
  topProducts: { name: string; quantity: number; revenue: number; image?: string }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const STATUS_COLORS: Record<string, string> = {
  novo: "#3b82f6",
  em_preparo: "#8b5cf6",
  enviado: "#06b6d4",
  entregue: "#22c55e",
  cancelado: "#ef4444",
  devolvido: "#f97316",
  pendente: "#f59e0b",
  confirmado: "#3b82f6",
  preparando: "#8b5cf6",
};

export function SalesTab({ last7DaysSales, salesByPaymentMethod, ordersByStatus, topProducts }: SalesTabProps) {
  const chartConfig = {
    revenue: { label: "Receita", color: "hsl(var(--primary))" },
    orders: { label: "Pedidos", color: "hsl(var(--chart-2))" },
  };

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas por Período</CardTitle>
          <CardDescription>Receita e pedidos dos últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <AreaChart data={last7DaysSales}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
              <ChartTooltip
                content={<ChartTooltipContent
                  formatter={(value, name) => (
                    <span>
                      {name === "revenue" ? `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : value}
                    </span>
                  )}
                />}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#revenueGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
            <CardDescription>Distribuição por método</CardDescription>
          </CardHeader>
          <CardContent>
            {salesByPaymentMethod.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={salesByPaymentMethod}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {salesByPaymentMethod.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} />
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-medium">{data.name}</p>
                              <p>{data.value} pedidos</p>
                              <p>R$ {data.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos Pedidos</CardTitle>
            <CardDescription>Quantidade por status</CardDescription>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ordersByStatus} layout="vertical">
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={100} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-lg text-xs">
                            <p className="font-medium">{payload[0].payload.name}</p>
                            <p>{payload[0].value} pedidos</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.original] || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhum dado disponível</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos Mais Vendidos</CardTitle>
          <CardDescription>Top 10 por receita</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {product.image && (
                        <img src={product.image} alt="" className="w-8 h-8 rounded object-cover" />
                      )}
                      <span className="truncate max-w-[200px]">{product.name}</span>
                    </TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-right">
                      R$ {product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">Nenhuma venda registrada ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
