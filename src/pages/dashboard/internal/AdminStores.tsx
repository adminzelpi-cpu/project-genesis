import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Store, Search, Loader2, ExternalLink, Power, Pencil, Eye,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { buildAdminUrl } from "@/lib/adminUrl";

const PAGE_SIZE = 20;

export default function AdminStores() {
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [editStore, setEditStore] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, adminLoading, navigate]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stores", debouncedSearch, statusFilter, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_stores", {
        p_search: debouncedSearch,
        p_status: statusFilter,
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      return data as { stores: any[]; total: number };
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const stores = data?.stores || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleMutation = useMutation({
    mutationFn: async (storeId: string) => {
      const { data, error } = await supabase.rpc("admin_toggle_store_status", {
        p_store_id: storeId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (newStatus, storeId) => {
      toast.success(`Loja ${newStatus ? "ativada" : "desativada"} com sucesso`);
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
      queryClient.invalidateQueries({ queryKey: ["admin-kpis"] });
    },
    onError: () => toast.error("Erro ao alterar status da loja"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, slug }: { id: string; name: string; slug: string }) => {
      const { data, error } = await supabase.rpc("admin_update_store", {
        p_store_id: id,
        p_name: name,
        p_slug: slug,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Loja atualizada");
      setEditStore(null);
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
    },
    onError: () => toast.error("Erro ao atualizar loja"),
  });

  const openEdit = (store: any) => {
    setEditStore(store);
    setEditName(store.name);
    setEditSlug(store.slug);
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Lojas</h1>
        <p className="text-muted-foreground">Visualize, edite e gerencie todas as lojas da plataforma</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, slug ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !stores.length ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma loja encontrada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Loja</th>
                    <th className="pb-2 font-medium">Lojista</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium text-right">Produtos</th>
                    <th className="pb-2 font-medium text-right">Pedidos</th>
                    <th className="pb-2 font-medium text-right">Receita</th>
                    <th className="pb-2 font-medium">Criada</th>
                    <th className="pb-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store: any) => (
                    <tr key={store.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-foreground">{store.name}</p>
                          <p className="text-xs text-muted-foreground">{store.slug}.zelpi.com.br</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-foreground">{store.merchant_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{store.merchant_email}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant={store.is_active ? "default" : "secondary"}>
                          {store.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">{store.product_count}</td>
                      <td className="py-3 text-right">{store.order_count}</td>
                      <td className="py-3 text-right">{formatCurrency(store.total_revenue)}</td>
                      <td className="py-3 text-muted-foreground">
                        {format(new Date(store.created_at), "dd/MM/yy", { locale: ptBR })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* View storefront */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Ver loja"
                            onClick={() => window.open(`https://${store.slug}.zelpi.com.br`, "_blank")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Editar"
                            onClick={() => openEdit(store)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {/* Toggle active */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${store.is_active ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-600"}`}
                            title={store.is_active ? "Desativar" : "Ativar"}
                            onClick={() => toggleMutation.mutate(store.id)}
                            disabled={toggleMutation.isPending}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          {/* Impersonate - open admin as merchant */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Acessar como lojista"
                            onClick={() => {
                              // Store the merchant_id in sessionStorage for impersonation
                              sessionStorage.setItem("admin_impersonate_store", store.id);
                              window.open(buildAdminUrl("/dashboard"), "_blank");
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {total} loja{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editStore} onOpenChange={(open) => !open && setEditStore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da loja</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                <span className="text-sm text-muted-foreground whitespace-nowrap">.zelpi.com.br</span>
              </div>
            </div>
            {editStore && (
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p>ID: {editStore.id}</p>
                <p>Merchant: {editStore.merchant_email}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStore(null)}>Cancelar</Button>
            <Button
              onClick={() => editStore && updateMutation.mutate({ id: editStore.id, name: editName, slug: editSlug })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
