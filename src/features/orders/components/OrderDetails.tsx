import { Order, StatusPedido, formatOrderNumber, getProductPrice, getProductSubtotal } from "../types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";

interface OrderDetailsProps {
  order: Order;
  onBack: () => void;
  onUpdateStatus: (orderId: string, status: StatusPedido) => void;
}

const statusLabels: Record<StatusPedido, string> = {
  novo: "Novo",
  em_preparo: "Em Preparo",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  devolvido: "Devolvido",
};

const paymentStatusLabels = {
  pendente: "Pendente",
  pago: "Pago",
  aprovado: "Aprovado",
  falhou: "Falhou",
  reembolsado: "Reembolsado",
  expirado: "Expirado",
  recusado: "Recusado",
};

export function OrderDetails({
  order,
  onBack,
  onUpdateStatus,
}: OrderDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Pedido {formatOrderNumber(order)}</h2>
          <p className="text-sm text-muted-foreground">
            Criado em {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Status do Pedido</p>
              <Select
                value={order.status_pedido}
                onValueChange={(value) =>
                  onUpdateStatus(order.id, value as StatusPedido)
                }
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium">Status do Pagamento</p>
              <Badge variant="outline" className="mt-1">
                {paymentStatusLabels[order.status_pagamento]}
              </Badge>
            </div>

            {order.forma_pagamento && (
              <div>
                <p className="text-sm font-medium">Forma de Pagamento</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {order.forma_pagamento}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium">Cliente</p>
              <p className="text-sm text-muted-foreground mt-1">
                {order.customer_id || "Não informado"}
              </p>
            </div>
          </CardContent>
        </Card>

        {order.endereco_entrega && (
          <Card>
            <CardHeader>
              <CardTitle>Endereço de Entrega</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <p>{order.endereco_entrega.rua}, {order.endereco_entrega.numero}</p>
                {order.endereco_entrega.complemento && (
                  <p>{order.endereco_entrega.complemento}</p>
                )}
                <p>{order.endereco_entrega.bairro}</p>
                <p>{order.endereco_entrega.cidade} - {order.endereco_entrega.estado}</p>
                <p>CEP: {order.endereco_entrega.cep}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produtos</CardTitle>
          <CardDescription>
            {order.products.length} {order.products.length === 1 ? "item" : "itens"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.products.map((product, index) => (
              <div key={index}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantidade: {product.quantity} × R$ {getProductPrice(product).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-medium">
                    R$ {getProductSubtotal(product).toFixed(2)}
                  </p>
                </div>
                {index < order.products.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span>R$ {order.frete.toFixed(2)}</span>
            </div>
            {order.desconto > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto</span>
                <span>- R$ {order.desconto.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>R$ {order.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.observacao_cliente && (
        <Card>
          <CardHeader>
            <CardTitle>Observações do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{order.observacao_cliente}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
