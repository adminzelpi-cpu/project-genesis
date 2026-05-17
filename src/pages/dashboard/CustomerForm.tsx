import { useParams, useNavigate } from "react-router-dom";
import { useCustomer, useCustomers, CustomerFormData } from "@/features/customers";
import { CustomerForm } from "@/features/customers";
import { useActiveStore } from "@/features/stores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CustomerFormPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { store: activeStore } = useActiveStore();
  const { customer, isLoading } = useCustomer(customerId || "");
  const { createCustomer, updateCustomer } = useCustomers(activeStore?.id);

  const isEditMode = !!customerId;

  const handleSubmit = (data: CustomerFormData) => {
    if (isEditMode && customerId) {
      updateCustomer({ customerId, data });
    } else if (activeStore) {
      createCustomer({ storeId: activeStore.id, data });
    }
    navigate("/dashboard/customers");
  };

  const handleCancel = () => {
    navigate("/dashboard/customers");
  };

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isEditMode && !customer) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/customers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? "Editar Cliente" : "Novo Cliente"}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? "Atualize as informações do cliente"
              : "Adicione um novo cliente ao sistema"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm
            customer={customer}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
