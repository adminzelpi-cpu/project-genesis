import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AbandonedCart } from "../hooks/useAbandonedCarts";
import { getStorePublicUrl } from "@/lib/storeUrl";

interface AbandonedCartDetailsDialogProps {
  cart: AbandonedCart | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeSlug: string;
  storeId?: string;
}

export function AbandonedCartDetailsDialog({
  cart,
  open,
  onOpenChange,
  storeSlug,
  storeId,
}: AbandonedCartDetailsDialogProps) {
  const [baseUrl, setBaseUrl] = useState<string>(`${window.location.origin}/store/${storeSlug}`);

  useEffect(() => {
    if (storeId) {
      getStorePublicUrl({ id: storeId, slug: storeSlug }).then(setBaseUrl).catch(() => {});
    }
  }, [storeId, storeSlug]);

  if (!cart) return null;

  const recoveryUrl = `${baseUrl}/recover-cart?token=${cart.recovery_token}`;
  const phone = cart.customer?.telefone || cart.customer_phone;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(recoveryUrl);
    toast.success("Link copiado!");
  };

  const handleWhatsApp = () => {
    if (!phone) {
      toast.error("Cliente não possui telefone cadastrado");
      return;
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${cart.customer_name || ""}! Notamos que você deixou alguns itens no carrinho. Finalize sua compra aqui: ${recoveryUrl}`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, "_blank");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cartItems = cart.cart_items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalhes do Carrinho</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
              {phone && (
                <Button variant="default" size="sm" onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700">
                  <WhatsAppIcon className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{cart.customer_name || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">E-mail</p>
              <p className="font-medium">{cart.customer_email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              {phone ? (
                <button
                  onClick={handleWhatsApp}
                  className="font-medium inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 hover:underline"
                  title="Abrir conversa no WhatsApp"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  {phone}
                </button>
              ) : (
                <p className="font-medium text-muted-foreground">Não informado</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data do Abandono</p>
              <p className="font-medium">
                {format(new Date(cart.abandoned_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">E-mails Enviados</p>
              <p className="font-medium">{cart.emails_sent} de 3</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              {cart.recovered_at ? (
                <Badge variant="default" className="bg-green-500">Recuperado</Badge>
              ) : (
                <Badge variant="secondary">Pendente</Badge>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div>
            <h4 className="font-medium mb-3">Itens do Carrinho</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Produto</th>
                    <th className="text-center p-3 text-sm font-medium w-24">Qtd</th>
                    <th className="text-right p-3 text-sm font-medium w-32">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium text-sm">{item.product_name}</p>
                            {item.variation_name && (
                              <p className="text-xs text-muted-foreground">{item.variation_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={2} className="p-3 text-right font-medium">Total</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(cart.cart_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Recovery Link */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Link de Recuperação</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={recoveryUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border"
              />
              <Button variant="outline" size="icon" onClick={() => window.open(recoveryUrl, "_blank")}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
