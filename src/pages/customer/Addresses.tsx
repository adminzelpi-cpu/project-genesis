import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddressDialog } from "@/features/customer-portal/components/AddressDialog";
import { toast } from "sonner";
import { invokeCustomerFn, hasCustomerToken } from "@/features/customers/lib/customerApi";
import { getStoredCustomerSession } from "@/features/auth";
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

interface CustomerAddress {
  id: string;
  tipo: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  is_default: boolean;
  customer_id: string;
}

export default function Addresses() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);

  const getCustomerId = (): string | null => {
    const session = getStoredCustomerSession();
    return session?.customer_id ?? null;
  };

  const fetchAddresses = async () => {
    setLoading(true);
    const cId = getCustomerId();
    setCustomerId(cId);

    if (!cId || !hasCustomerToken()) {
      setAddresses([]);
      setLoading(false);
      return;
    }

    try {
      const res = await invokeCustomerFn<{ addresses: CustomerAddress[] }>(
        "customer-addresses",
        { body: { action: "list" } }
      );
      setAddresses(res.addresses || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar endereços");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleEdit = (address: CustomerAddress) => {
    setEditingAddress(address);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingAddress(undefined);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setAddressToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!addressToDelete || !customerId) return;

    try {
      await invokeCustomerFn("customer-addresses", {
        body: { action: "delete", address_id: addressToDelete },
      });
      toast.success("Endereço removido!");
      fetchAddresses();
    } catch {
      toast.error("Erro ao remover endereço");
    } finally {
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!customerId) return;

    try {
      await invokeCustomerFn("customer-addresses", {
        body: { action: "set_default", address_id: id },
      });
      toast.success("Endereço padrão atualizado!");
      fetchAddresses();
    } catch {
      toast.error("Erro ao definir endereço padrão");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Endereços</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus endereços de entrega</p>
        </div>
        <Button className="gap-2" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Novo Endereço
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando endereços...</p>
        </div>
      ) : addresses.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">Nenhum endereço cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione seu primeiro endereço de entrega
            </p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Endereço
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-foreground capitalize">{address.tipo}</p>
                  </div>
                  {address.is_default && (
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                      Padrão
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    {address.rua}, {address.numero}
                    {address.complemento && ` - ${address.complemento}`}
                  </p>
                  <p className="text-muted-foreground">
                    {address.bairro}, {address.cidade} - {address.estado}
                  </p>
                  <p className="text-muted-foreground">CEP: {address.cep}</p>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(address)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(address.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remover
                  </Button>
                </div>

                {!address.is_default && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    size="sm"
                    onClick={() => handleSetDefault(address.id)}
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
              <p className="font-medium text-foreground">Adicionar Novo Endereço</p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Cadastre um novo endereço de entrega
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        address={editingAddress}
        onSuccess={fetchAddresses}
        customerId={customerId}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita.
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
