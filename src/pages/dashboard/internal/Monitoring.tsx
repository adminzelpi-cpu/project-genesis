import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Mail, CreditCard, ShoppingCart, Bug, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

const severityColors: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-red-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white",
};

const statusColors: Record<string, string> = {
  new: "bg-red-500 text-white",
  acknowledged: "bg-yellow-500 text-white",
  investigating: "bg-blue-500 text-white",
  resolved: "bg-green-500 text-white",
};

export default function Monitoring() {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  // Recent errors
  const { data: recentErrors, isLoading: errorsLoading } = useQuery({
    queryKey: ["admin-monitoring-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // System alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["admin-monitoring-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_alerts")
        .select("*")
        .order("last_occurrence", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Email logs with failures
  const { data: emailLogs, isLoading: emailsLoading } = useQuery({
    queryKey: ["admin-monitoring-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Payment transactions
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin-monitoring-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Recent orders with issues
  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-monitoring-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  if (adminLoading) {
    return <div className="flex items-center justify-center h-96"><Activity className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  if (!isAdmin) return null;

  const failedEmails = emailLogs?.filter(e => e.status === "failed" || e.status === "error") || [];
  const failedPayments = payments?.filter(p => ["failed", "rejected", "cancelled"].includes(p.status)) || [];
  const pendingPayments = payments?.filter(p => p.status === "pending") || [];
  const criticalErrors = recentErrors?.filter(e => e.severity === "critical" || e.severity === "high") || [];
  const activeAlerts = alerts?.filter(a => a.status !== "resolved") || [];

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-monitoring-errors"] });
    queryClient.invalidateQueries({ queryKey: ["admin-monitoring-alerts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-monitoring-emails"] });
    queryClient.invalidateQueries({ queryKey: ["admin-monitoring-payments"] });
    queryClient.invalidateQueries({ queryKey: ["admin-monitoring-orders"] });
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd/MM HH:mm", { locale: ptBR });
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🔒 Monitoramento Interno</h1>
          <p className="text-muted-foreground text-sm">Visão geral de saúde da plataforma — apenas admins Zelpi</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={criticalErrors.length > 0 ? "border-red-500 border-2" : ""}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{criticalErrors.length}</p>
                <p className="text-xs text-muted-foreground">Erros Críticos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={activeAlerts.length > 0 ? "border-yellow-500 border-2" : ""}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{activeAlerts.length}</p>
                <p className="text-xs text-muted-foreground">Alertas Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={failedEmails.length > 0 ? "border-orange-500 border-2" : ""}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{failedEmails.length}</p>
                <p className="text-xs text-muted-foreground">Emails Falhados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={failedPayments.length > 0 ? "border-red-400 border-2" : ""}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-2xl font-bold">{failedPayments.length}</p>
                <p className="text-xs text-muted-foreground">Pagamentos Falhos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="errors">
        <TabsList>
          <TabsTrigger value="errors">
            <Bug className="h-4 w-4 mr-1" /> Erros ({recentErrors?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-1" /> Alertas ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-1" /> Emails ({emailLogs?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-1" /> Pagamentos ({payments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 mr-1" /> Pedidos ({recentOrders?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* ERRORS TAB */}
        <TabsContent value="errors" className="space-y-2">
          {errorsLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : recentErrors?.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">🎉 Nenhum erro registrado!</CardContent></Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {recentErrors?.map((error) => (
                <Card key={error.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={severityColors[error.severity] || "bg-gray-500"} variant="secondary">
                            {error.severity}
                          </Badge>
                          <Badge variant="outline">{error.category}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(error.created_at!)}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{error.message}</p>
                        {error.url && <p className="text-xs text-muted-foreground truncate">{error.url}</p>}
                        {error.store_id && <p className="text-xs text-muted-foreground">Store: {error.store_id.slice(0, 8)}...</p>}
                      </div>
                      {error.resolved && <Badge variant="secondary" className="bg-green-100 text-green-800">Resolvido</Badge>}
                    </div>
                    {error.stack_trace && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">Stack trace</summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-32">{error.stack_trace}</pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-2">
          {alertsLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : alerts?.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">✅ Nenhum alerta no sistema!</CardContent></Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {alerts?.map((alert) => (
                <Card key={alert.id} className={alert.status !== "resolved" ? "border-l-4 border-l-yellow-500" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={severityColors[alert.severity] || "bg-gray-500"} variant="secondary">
                            {alert.severity}
                          </Badge>
                          <Badge className={statusColors[alert.status] || "bg-gray-500"} variant="secondary">
                            {alert.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(alert.last_occurrence || alert.created_at!)}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                        {alert.error_count && alert.error_count > 1 && (
                          <p className="text-xs text-red-500 mt-1">Ocorrências: {alert.error_count}x</p>
                        )}
                        {alert.suggested_fix && (
                          <p className="text-xs text-green-600 mt-1">💡 {alert.suggested_fix}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* EMAILS TAB */}
        <TabsContent value="emails" className="space-y-2">
          {emailsLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : emailLogs?.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum email enviado.</CardContent></Card>
          ) : (
            <>
              {/* Email stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold text-green-600">{emailLogs?.filter(e => e.status === "sent").length || 0}</p>
                    <p className="text-xs text-muted-foreground">Enviados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold text-blue-600">{emailLogs?.filter(e => e.opened_at).length || 0}</p>
                    <p className="text-xs text-muted-foreground">Abertos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold text-red-600">{failedEmails.length}</p>
                    <p className="text-xs text-muted-foreground">Falhados</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {emailLogs?.map((email) => (
                  <Card key={email.id} className={email.status === "failed" || email.status === "error" ? "border-l-4 border-l-red-500" : ""}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={email.status === "sent" ? "default" : "destructive"}>
                              {email.status}
                            </Badge>
                            <Badge variant="outline">{email.email_type}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(email.created_at)}</span>
                          </div>
                          <p className="text-sm truncate">{email.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            Para: {email.recipient_name || "—"} ({email.recipient_email})
                          </p>
                          {email.error_message && (
                            <p className="text-xs text-red-500 mt-1">❌ {email.error_message}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {email.opened_at && <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">Aberto</Badge>}
                          {email.clicked_at && <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">Clicado</Badge>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-2">
          {paymentsLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : payments?.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma transação registrada.</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold text-green-600">{payments?.filter(p => p.status === "approved").length || 0}</p>
                    <p className="text-xs text-muted-foreground">Aprovados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold text-yellow-600">{pendingPayments.length}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold text-red-600">{failedPayments.length}</p>
                    <p className="text-xs text-muted-foreground">Falhos/Recusados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-3 text-center">
                    <p className="text-lg font-bold">{payments?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {payments?.map((payment) => (
                  <Card key={payment.id} className={["failed", "rejected", "cancelled"].includes(payment.status) ? "border-l-4 border-l-red-500" : ""}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={payment.status === "approved" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}>
                              {payment.status}
                            </Badge>
                            <Badge variant="outline">{payment.gateway_type}</Badge>
                            {payment.payment_type && <Badge variant="outline">{payment.payment_type}</Badge>}
                            <span className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</span>
                          </div>
                          <p className="text-sm font-medium">
                            R$ {Number(payment.amount).toFixed(2)}
                            {payment.installments && payment.installments > 1 ? ` (${payment.installments}x)` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Order: {payment.order_id.slice(0, 8)}... | Store: {payment.store_id.slice(0, 8)}...
                          </p>
                          {payment.status_detail && (
                            <p className="text-xs text-muted-foreground mt-1">{payment.status_detail}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-2">
          {ordersLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : recentOrders?.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum pedido encontrado.</CardContent></Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {recentOrders?.map((order) => (
                <Card key={order.id} className={
                  order.status_pagamento === "recusado" || order.status_pedido === "cancelado" 
                    ? "border-l-4 border-l-red-500" 
                    : order.status_pagamento === "pendente" 
                    ? "border-l-4 border-l-yellow-500" 
                    : ""
                }>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold">#{order.order_number || "—"}</span>
                          <Badge variant="outline">{order.status_pedido}</Badge>
                          <Badge variant={
                            order.status_pagamento === "aprovado" || order.status_pagamento === "pago" ? "default" 
                            : order.status_pagamento === "pendente" ? "secondary" 
                            : "destructive"
                          }>
                            {order.status_pagamento}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                        </div>
                        <p className="text-sm">
                          R$ {Number(order.total).toFixed(2)}
                          {order.forma_pagamento ? ` — ${order.forma_pagamento}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">Store: {order.store_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
