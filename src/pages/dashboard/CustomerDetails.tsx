import { useParams, useNavigate } from "react-router-dom";
import { useCustomer } from "@/features/customers";
import { useOrders } from "@/features/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { STATUS_PEDIDO_LABELS, STATUS_PEDIDO_COLORS, formatOrderNumber } from "@/features/orders/types";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";

export default function CustomerDetails() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { store } = useActiveStore();
  const { customer, isLoading: isLoadingCustomer } = useCustomer(customerId!);
  const { orders, isLoading: isLoadingOrders } = useOrders(store?.id);

  if (isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Cliente não encontrado</p>
          <Button onClick={() => navigate("/dashboard/customers")}>
            Voltar para Clientes
          </Button>
        </div>
      </div>
    );
  }

  const customerOrders = orders?.filter((order) => order.customer_id === customerId) || [];
  const defaultAddress = customer.customer_addresses?.find((addr) => addr.is_default);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/customers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{customer.nome}</h1>
          <p className="text-muted-foreground">
            Cliente desde {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.telefone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.telefone}</span>
              </div>
            )}
            {customer.cpf && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">CPF:</span>
                <span>{customer.cpf}</span>
              </div>
            )}
            {customer.data_nascimento && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(customer.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {defaultAddress && (
          <Card>
            <CardHeader>
              <CardTitle>Endereço Principal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="space-y-1">
                  <p>
                    {defaultAddress.rua}, {defaultAddress.numero}
                  </p>
                  {defaultAddress.complemento && <p>{defaultAddress.complemento}</p>}
                  <p>
                    {defaultAddress.bairro} - {defaultAddress.cidade}/{defaultAddress.estado}
                  </p>
                  <p>CEP: {defaultAddress.cep}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Estatísticas de Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                <p className="text-2xl font-bold">{customerOrders.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total Gasto</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  {customerOrders.length > 0
                    ? formatCurrency(totalSpent / customerOrders.length)
                    : formatCurrency(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <p className="text-center text-muted-foreground py-8">Carregando pedidos...</p>
            ) : customerOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Este cliente ainda não realizou nenhum pedido
              </p>
            ) : (
              <div className="space-y-4">
                {customerOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                  >
                    <div className="space-y-1">
                      <p className="font-medium">Pedido {formatOrderNumber(order)}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={STATUS_PEDIDO_COLORS[order.status_pedido]}>
                        {STATUS_PEDIDO_LABELS[order.status_pedido]}
                      </Badge>
                      <p className="font-semibold">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => navigate(`/dashboard/customers/${customerId}/edit`)}>
          Editar Cliente
        </Button>
      </div>
    </div>
  );
}
