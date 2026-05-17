import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaymentMethodDialog } from "@/features/customer-portal/components/PaymentMethodDialog";
import { invokeCustomerFn } from "@/features/customers/lib/customerApi";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  holder_name: string;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
}

const cardBrandColors: Record<string, string> = {
  Visa: "bg-gradient-to-br from-blue-500 to-blue-700",
  Mastercard: "bg-gradient-to-br from-red-500 to-orange-600",
  Amex: "bg-gradient-to-br from-green-500 to-teal-600",
  Elo: "bg-gradient-to-br from-yellow-500 to-yellow-700",
};

export default function Payments() {
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await invokeCustomerFn<{ items: PaymentMethod[] }>("customer-payment-methods", {
        body: { action: "list" },
      });
      setPayments(res.items || []);
    } catch (err) {
      toast.error("Erro ao carregar cartões");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleEdit = (payment: PaymentMethod) => {
    setEditingPayment(payment);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingPayment(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setPaymentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!paymentToDelete) return;
    try {
      await invokeCustomerFn("customer-payment-methods", {
        body: { action: "delete", id: paymentToDelete },
      });
      toast.success("Cartão removido!");
      fetchPayments();
    } catch {
      toast.error("Erro ao remover cartão");
    } finally {
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await invokeCustomerFn("customer-payment-methods", {
        body: { action: "set_default", id },
      });
      toast.success("Cartão padrão atualizado!");
      fetchPayments();
    } catch {
      toast.error("Erro ao definir cartão padrão");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Formas de Pagamento</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus cartões salvos</p>
        </div>
        <Button className="gap-2" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Novo Cartão
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando cartões...</p>
        </div>
      ) : payments.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Nenhum cartão cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione seu primeiro cartão de pagamento
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cartão
            </Button>
          </CardContent>
        </Card>
      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="shadow-soft hover:shadow-medium transition-shadow overflow-hidden">
              <div className={`h-4 ${cardBrandColors[payment.card_brand] || "bg-gradient-primary"}`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-foreground">{payment.card_brand}</p>
                  </div>
                  {payment.is_default && (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      Padrão
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Número do Cartão</p>
                    <p className="font-mono text-lg font-medium text-foreground">
                      •••• •••• •••• {payment.card_last4}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Titular</p>
                      <p className="text-sm font-medium text-foreground">{payment.holder_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Validade</p>
                      <p className="text-sm font-medium text-foreground">{payment.expiry_month}/{payment.expiry_year}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(payment)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(payment.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remover
                  </Button>
                </div>

                {!payment.is_default && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    size="sm"
                    onClick={() => handleSetDefault(payment.id)}
                  >
                    Tornar Padrão
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          <Card className="shadow-soft hover:shadow-medium transition-all cursor-pointer border-dashed border-2" onClick={handleAdd}>
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[280px]">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">Adicionar Novo Cartão</p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Seus dados estão seguros
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <PaymentMethodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        payment={editingPayment}
        onSuccess={fetchPayments}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
