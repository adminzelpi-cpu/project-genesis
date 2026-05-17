import { useParams, useNavigate } from "react-router-dom";
import { useOrder, useOrders, useRefundOrder } from "@/features/orders";
import { formatOrderNumber, getProductPrice, getProductSubtotal } from "@/features/orders/types";
import { getOrderItemVariant } from "@/features/orders/lib/getOrderItemVariant";
import { useUpdateTrackingCode, useSendTrackingEmail } from "@/features/orders/hooks/useUpdateTrackingCode";
import { useEmailSettings } from "@/features/emails";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  STATUS_PEDIDO_LABELS,
  STATUS_PEDIDO_COLORS,
  STATUS_PAGAMENTO_LABELS,
  STATUS_PAGAMENTO_COLORS,
  StatusPedido,
} from "@/features/orders/types";
import { ArrowLeft, Package, MapPin, CreditCard, FileText, Truck, Send, Loader2, Check, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { FrenetOrderActions } from "@/features/shipping";

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { order, isLoading } = useOrder(orderId || "");
  const { store } = useActiveStore();
  const { updateOrderStatus } = useOrders(store?.id);
  const { settings: emailSettings } = useEmailSettings();
  const updateTrackingCode = useUpdateTrackingCode();
  const sendTrackingEmail = useSendTrackingEmail();
  const refundOrder = useRefundOrder();
  
  const [selectedStatus, setSelectedStatus] = useState<StatusPedido>();
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [hasChangedTracking, setHasChangedTracking] = useState(false);

  useEffect(() => {
    if (order?.tracking_code) {
      setTrackingCode(order.tracking_code);
    }
    if (order?.tracking_carrier) {
      setTrackingCarrier(order.tracking_carrier);
    }
    if (order?.tracking_url) {
      setTrackingUrl(order.tracking_url);
    }
  }, [order?.tracking_code, order?.tracking_carrier, order?.tracking_url]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <Button onClick={() => navigate("/dashboard/orders")}>
          Voltar para pedidos
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleStatusChange = (status: StatusPedido) => {
    setSelectedStatus(status);
    updateOrderStatus({ orderId: order.id, status, notifyCustomer });
  };

  const handleTrackingCodeChange = (value: string) => {
    setTrackingCode(value);
    checkTrackingChanges(value, trackingCarrier, trackingUrl);
  };

  const handleCarrierChange = (value: string) => {
    setTrackingCarrier(value);
    checkTrackingChanges(trackingCode, value, trackingUrl);
  };

  const handleUrlChange = (value: string) => {
    setTrackingUrl(value);
    checkTrackingChanges(trackingCode, trackingCarrier, value);
  };

  const checkTrackingChanges = (code: string, carrier: string, url: string) => {
    const hasChanged = 
      code !== (order.tracking_code || "") || 
      carrier !== (order.tracking_carrier || "") ||
      url !== (order.tracking_url || "");
    setHasChangedTracking(hasChanged);
  };

  const handleSaveTrackingCode = () => {
    const autoSend = emailSettings?.tracking_code_auto_send_enabled ?? true;
    updateTrackingCode.mutate({
      orderId: order.id,
      trackingCode,
      trackingCarrier,
      trackingUrl,
      autoSendEmail: autoSend && trackingCode.trim() !== "",
    });
    setHasChangedTracking(false);
  };

  const handleManualSendEmail = () => {
    sendTrackingEmail.mutate(order.id);
  };

  const currentStatus = selectedStatus || order.status_pedido;
  const isTrackingEmailSent = !!order.tracking_code_sent_at;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Pedido {formatOrderNumber(order)}</h1>
          <p className="text-muted-foreground">
            Realizado em {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Status do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge className={STATUS_PEDIDO_COLORS[currentStatus]}>
                {STATUS_PEDIDO_LABELS[currentStatus]}
              </Badge>
              <Badge className={STATUS_PAGAMENTO_COLORS[order.status_pagamento]}>
                {STATUS_PAGAMENTO_LABELS[order.status_pagamento]}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Alterar Status do Pedido
              </label>
              <Select value={currentStatus} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_preparo">Em Preparo</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="devolvido">Devolvido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="notify-customer"
                  checked={notifyCustomer}
                  onCheckedChange={(v) => setNotifyCustomer(v === true)}
                />
                <Label htmlFor="notify-customer" className="text-sm font-normal cursor-pointer">
                  Notificar cliente por e-mail ao mudar o status
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Código de Rastreio
            </CardTitle>
            <CardDescription>
              {emailSettings?.tracking_code_auto_send_enabled 
                ? "E-mail enviado automaticamente ao salvar"
                : "Salve e envie manualmente o e-mail"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tracking_carrier">Transportadora</Label>
                <Select value={trackingCarrier} onValueChange={handleCarrierChange}>
                  <SelectTrigger id="tracking_carrier">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="correios">Correios</SelectItem>
                    <SelectItem value="jadlog">Jadlog</SelectItem>
                    <SelectItem value="azul_cargo">Azul Cargo</SelectItem>
                    <SelectItem value="latam_cargo">Latam Cargo</SelectItem>
                    <SelectItem value="total_express">Total Express</SelectItem>
                    <SelectItem value="sequoia">Sequoia</SelectItem>
                    <SelectItem value="loggi">Loggi</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking_code">Código de Rastreamento</Label>
                <Input
                  id="tracking_code"
                  placeholder="Ex: BR123456789BR"
                  value={trackingCode}
                  onChange={(e) => handleTrackingCodeChange(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tracking_url">Link de Rastreio (opcional)</Label>
              <Input
                id="tracking_url"
                placeholder="https://rastreamento.exemplo.com.br/..."
                value={trackingUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar o link padrão da transportadora
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveTrackingCode}
                disabled={!hasChangedTracking || updateTrackingCode.isPending}
                className="flex-1"
              >
                {updateTrackingCode.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Salvar
              </Button>
              
              <Button
                variant="outline"
                onClick={handleManualSendEmail}
                disabled={!trackingCode || sendTrackingEmail.isPending}
              >
                {sendTrackingEmail.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar E-mail
              </Button>
            </div>

            {isTrackingEmailSent && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                E-mail enviado em {format(new Date(order.tracking_code_sent_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FrenetOrderActions
        storeId={order.store_id}
        orderId={order.id}
        orderNumber={order.order_number}
        trackingCode={order.tracking_code}
        trackingCarrier={order.tracking_carrier}
        hasFrenet={!!(store as any)?.shipping_config?.frenet_token}
        enderecoEntrega={order.endereco_entrega}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Informações de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Forma de Pagamento</span>
            <span className="font-medium">{order.forma_pagamento || "Não informado"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge className={STATUS_PAGAMENTO_COLORS[order.status_pagamento]}>
              {STATUS_PAGAMENTO_LABELS[order.status_pagamento]}
            </Badge>
          </div>

          {(order.status_pagamento === "aprovado" || order.status_pagamento === "pago") && (
            <div className="pt-2 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={refundOrder.isPending}
                    className="w-full sm:w-auto"
                  >
                    {refundOrder.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Cancelar e Reembolsar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar reembolso</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação cancelará o pedido e devolverá {formatCurrency(order.total)} ao
                      cliente através do gateway de pagamento. Não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => refundOrder.mutate({ orderId: order.id })}
                    >
                      Confirmar reembolso
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground mt-2">
                O valor será devolvido ao cliente em até alguns dias úteis, conforme prazo do
                gateway.
              </p>
            </div>
          )}

          {order.status_pagamento === "reembolsado" && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-600" />
                Pedido reembolsado
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.products.map((product, index) => {
              const variant = getOrderItemVariant(product as any);
              const image = (product as any).image;
              return (
                <div key={index} className="flex gap-3 items-center border-b pb-4 last:border-0">
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 border">
                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    {variant && (
                      <p className="text-xs text-muted-foreground mt-0.5">{variant}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {product.quantity} × {formatCurrency(getProductPrice(product))}
                    </p>
                  </div>
                  <p className="font-semibold whitespace-nowrap">{formatCurrency(getProductSubtotal(product))}</p>
                </div>
              );
            })}
            
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span>{formatCurrency(order.frete)}</span>
              </div>
              {order.desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-green-600">-{formatCurrency(order.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {order.endereco_entrega && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p>{order.endereco_entrega.rua}, {order.endereco_entrega.numero}</p>
              {order.endereco_entrega.complemento && (
                <p className="text-sm text-muted-foreground">{order.endereco_entrega.complemento}</p>
              )}
              <p>{order.endereco_entrega.bairro}</p>
              <p>{order.endereco_entrega.cidade} - {order.endereco_entrega.estado}</p>
              <p className="text-sm text-muted-foreground">CEP: {order.endereco_entrega.cep}</p>
              {(order.endereco_entrega.metodo_envio || order.endereco_entrega.transportadora || order.endereco_entrega.prazo_entrega_dias) && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Forma de envio
                  </p>
                  <p className="text-sm font-medium">
                    {order.endereco_entrega.metodo_envio || "Entrega"}
                    {order.endereco_entrega.transportadora &&
                    order.endereco_entrega.transportadora !== order.endereco_entrega.metodo_envio
                      ? ` · ${order.endereco_entrega.transportadora}`
                      : ""}
                  </p>
                  {order.endereco_entrega.prazo_entrega_dias != null && (
                    <p className="text-xs text-muted-foreground">
                      Prazo: {order.endereco_entrega.prazo_entrega_dias}{" "}
                      {order.endereco_entrega.prazo_entrega_dias === 1 ? "dia útil" : "dias úteis"}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {order.observacao_cliente && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Observações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{order.observacao_cliente}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}