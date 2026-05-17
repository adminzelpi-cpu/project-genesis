import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Mail, 
  MousePointer, 
  DollarSign, 
  Eye,
  TrendingUp,
  RefreshCcw,
  AlertCircle
} from "lucide-react";
import { useAbandonedCartAnalytics } from "../hooks/useAbandonedCartAnalytics";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function getEmailLabel(type: string): string {
  const labels: Record<string, string> = {
    abandoned_cart_1: "1º E-mail",
    abandoned_cart_2: "2º E-mail",
    abandoned_cart_3: "3º E-mail",
  };
  return labels[type] || type;
}

export function AbandonedCartReport() {
  const [period, setPeriod] = useState<number>(30);
  const { data, isLoading, error } = useAbandonedCartAnalytics(period);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex items-center gap-4 py-8">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium">Erro ao carregar analytics</p>
            <p className="text-sm text-muted-foreground">{String(error)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const analytics = data!;
  const openRate = analytics.total_emails_sent > 0 
    ? (analytics.total_opened / analytics.total_emails_sent) * 100 
    : 0;
  const clickRate = analytics.total_opened > 0 
    ? (analytics.total_clicked / analytics.total_opened) * 100 
    : 0;
  const conversionRate = analytics.total_abandoned_carts > 0 
    ? (analytics.total_recovered / analytics.total_abandoned_carts) * 100 
    : 0;

  // Prepare chart data
  const chartData = (analytics.daily_stats || []).map(stat => ({
    ...stat,
    date: formatDate(stat.date),
  }));

  const sequenceData = (analytics.by_email_sequence || []).map(seq => ({
    name: getEmailLabel(seq.email_type),
    Enviados: seq.sent,
    Abertos: seq.opened,
    Clicados: seq.clicked,
    taxaAbertura: seq.sent > 0 ? ((seq.opened / seq.sent) * 100).toFixed(1) : "0",
    taxaClique: seq.opened > 0 ? ((seq.clicked / seq.opened) * 100).toFixed(1) : "0",
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Recuperação de Carrinhos</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho dos e-mails de carrinho abandonado
          </p>
        </div>
        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="14">Últimos 14 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Carrinhos Abandonados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carrinhos Abandonados</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_abandoned_carts}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analytics.revenue_abandoned)} em valor
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Abertura */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.total_opened} de {analytics.total_emails_sent} e-mails
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Clique */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Clique</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.total_clicked} cliques no CTA
            </p>
          </CardContent>
        </Card>

        {/* Recuperados */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recuperados</CardTitle>
            <RefreshCcw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{analytics.total_recovered}</span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {conversionRate.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analytics.revenue_recovered)} recuperados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Highlight */}
      {analytics.revenue_recovered > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-primary/20 p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Recuperada</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(analytics.revenue_recovered)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-muted-foreground">Potencial Perdido</p>
              <p className="text-xl font-semibold text-muted-foreground">
                {formatCurrency(analytics.revenue_abandoned)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência Diária
            </CardTitle>
            <CardDescription>
              Carrinhos abandonados vs recuperados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAbandoned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="abandoned" 
                    name="Abandonados"
                    stroke="hsl(var(--muted-foreground))" 
                    fillOpacity={1} 
                    fill="url(#colorAbandoned)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="recovered" 
                    name="Recuperados"
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorRecovered)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhum dado no período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Sequence Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Desempenho por E-mail
            </CardTitle>
            <CardDescription>
              Comparativo entre os e-mails da sequência
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sequenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sequenceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number, name: string) => {
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Enviados" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Abertos" fill="hsl(var(--primary) / 0.6)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Clicados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhum e-mail enviado no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Sequence Details Table */}
      {sequenceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Sequência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left font-medium">E-mail</th>
                    <th className="py-3 text-center font-medium">Enviados</th>
                    <th className="py-3 text-center font-medium">Abertos</th>
                    <th className="py-3 text-center font-medium">Taxa Abertura</th>
                    <th className="py-3 text-center font-medium">Clicados</th>
                    <th className="py-3 text-center font-medium">Taxa Clique</th>
                  </tr>
                </thead>
                <tbody>
                  {sequenceData.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 font-medium">{row.name}</td>
                      <td className="py-3 text-center">{row.Enviados}</td>
                      <td className="py-3 text-center">{row.Abertos}</td>
                      <td className="py-3 text-center">
                        <Badge variant={Number(row.taxaAbertura) > 20 ? "default" : "secondary"}>
                          {row.taxaAbertura}%
                        </Badge>
                      </td>
                      <td className="py-3 text-center">{row.Clicados}</td>
                      <td className="py-3 text-center">
                        <Badge variant={Number(row.taxaClique) > 5 ? "default" : "secondary"}>
                          {row.taxaClique}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
