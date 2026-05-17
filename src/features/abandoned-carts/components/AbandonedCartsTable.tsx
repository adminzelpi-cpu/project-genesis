import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Search } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAbandonedCarts, type AbandonedCartStatus, type AbandonedCart } from "../hooks/useAbandonedCarts";
import { AbandonedCartDetailsDialog } from "./AbandonedCartDetailsDialog";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { getStorePublicUrl } from "@/lib/storeUrl";

export function AbandonedCartsTable() {
  const { store } = useActiveStore();
  const [status, setStatus] = useState<AbandonedCartStatus>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useAbandonedCarts({
    status,
    search,
    page,
    perPage: 10,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleViewCart = (cart: AbandonedCart) => {
    setSelectedCart(cart);
    setDialogOpen(true);
  };

  const handleWhatsApp = async (cart: AbandonedCart) => {
    const phone = cart.customer?.telefone || cart.customer_phone;
    if (!phone) {
      toast.error("Cliente não possui telefone cadastrado");
      return;
    }
    if (!store) return;

    const cleanPhone = phone.replace(/\D/g, "");
    const baseUrl = await getStorePublicUrl({ id: store.id, slug: store.slug });
    const recoveryUrl = `${baseUrl}/recover-cart?token=${cart.recovery_token}`;
    const message = encodeURIComponent(
      `Olá ${cart.customer_name || ""}! Notamos que você deixou alguns itens no carrinho. Finalize sua compra aqui: ${recoveryUrl}`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, "_blank");
  };

  const formatPhoneDisplay = (phone: string) => {
    const c = phone.replace(/\D/g, "");
    if (c.length === 11) return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
    if (c.length === 10) return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`;
    return phone;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (cart: AbandonedCart) => {
    if (cart.recovered_at) {
      return <Badge className="bg-green-500 hover:bg-green-600">Recuperado</Badge>;
    }
    
    const abandonedDate = new Date(cart.abandoned_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (abandonedDate < sevenDaysAgo) {
      return <Badge variant="destructive">Perdido</Badge>;
    }
    
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const getItemsSummary = (items: AbandonedCart["cart_items"]) => {
    if (!items || items.length === 0) return "-";
    const firstItem = items[0];
    const remaining = items.length - 1;
    return (
      <div className="max-w-[200px]">
        <p className="truncate text-sm">{firstItem.product_name}</p>
        {remaining > 0 && (
          <p className="text-xs text-muted-foreground">+{remaining} {remaining === 1 ? "item" : "itens"}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={status} onValueChange={(v) => { setStatus(v as AbandonedCartStatus); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="recovered">Recuperados</TabsTrigger>
            <TabsTrigger value="lost">Perdidos</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
      </div>

      {/* Results count */}
      {data && (
        <p className="text-sm text-muted-foreground">
          {data.total} {data.total === 1 ? "carrinho abandonado" : "carrinhos abandonados"}
        </p>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.carts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum carrinho abandonado encontrado
                </TableCell>
              </TableRow>
            ) : (
              data?.carts.map((cart) => (
                <TableRow key={cart.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cart.customer_name || "Não informado"}</p>
                      <p className="text-sm text-muted-foreground">
                        {cart.emails_sent > 0 && `${cart.emails_sent} e-mail(s) enviado(s)`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm">{cart.customer_email}</p>
                      {(cart.customer?.telefone || cart.customer_phone) && (
                        <p className="text-xs text-muted-foreground">
                          {formatPhoneDisplay(cart.customer?.telefone || cart.customer_phone || "")}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getItemsSummary(cart.cart_items)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(cart.cart_total)}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">
                        {format(new Date(cart.abandoned_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(cart)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {(cart.customer?.telefone || cart.customer_phone) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleWhatsApp(cart)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Enviar WhatsApp"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewCart(cart)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, data.totalPages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    onClick={() => setPage(pageNum)}
                    isActive={page === pageNum}
                    className="cursor-pointer"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                className={page === data.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Details Dialog */}
      <AbandonedCartDetailsDialog
        cart={selectedCart}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        storeSlug={store?.slug || ""}
        storeId={store?.id}
      />
    </div>
  );
}
