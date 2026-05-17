import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/features/customers";
import { CustomersTable } from "@/features/customers";
import { useActiveStore } from "@/features/stores";
import { Plus, Users, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CustomerImportDialog } from "@/features/customers/components/CustomerImportDialog";

export default function Customers() {
  const navigate = useNavigate();
  const { store: activeStore } = useActiveStore();
  const { customers, isLoading, deleteCustomer } = useCustomers(activeStore?.id);
  const [importOpen, setImportOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando clientes...</p>
      </div>
    );
  }

  const totalCustomers = customers?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={() => navigate("/dashboard/customers/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              clientes cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>Visualize e gerencie todos os seus clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomersTable customers={customers || []} onDelete={deleteCustomer} />
        </CardContent>
      </Card>

      {activeStore && (
        <CustomerImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          storeId={activeStore.id}
        />
      )}
    </div>
  );
}
