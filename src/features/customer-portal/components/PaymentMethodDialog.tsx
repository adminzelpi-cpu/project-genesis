import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { invokeCustomerFn } from "@/features/customers/lib/customerApi";
import { z } from "zod";

const paymentSchema = z.object({
  card_brand: z.string().min(1, "Bandeira é obrigatória"),
  card_last4: z.string().length(4, "Digite os últimos 4 dígitos"),
  holder_name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Máximo 100 caracteres"),
  expiry_month: z.string().length(2, "Mês inválido"),
  expiry_year: z.string().length(2, "Ano inválido"),
});

interface PaymentMethod {
  id: string;
  card_brand: string;
  card_last4: string;
  holder_name: string;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
}

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: PaymentMethod;
  onSuccess: () => void;
}

export function PaymentMethodDialog({ open, onOpenChange, payment, onSuccess }: PaymentMethodDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<PaymentMethod>>({
    card_brand: "",
    card_last4: "",
    holder_name: "",
    expiry_month: "",
    expiry_year: "",
    is_default: false,
  });

  useEffect(() => {
    if (payment) {
      setFormData(payment);
    } else {
      setFormData({
        card_brand: "",
        card_last4: "",
        holder_name: "",
        expiry_month: "",
        expiry_year: "",
        is_default: false,
      });
    }
  }, [payment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = paymentSchema.parse(formData);
      await invokeCustomerFn("customer-payment-methods", {
        body: {
          action: payment ? "update" : "create",
          id: payment?.id,
          ...validated,
          is_default: !!formData.is_default,
        },
      });
      toast.success(payment ? "Cartão atualizado!" : "Cartão adicionado!");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error((err as Error).message || "Erro ao salvar cartão");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{payment ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card_brand">Bandeira</Label>
            <Select
              value={formData.card_brand}
              onValueChange={(value) => setFormData({ ...formData, card_brand: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a bandeira" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visa">Visa</SelectItem>
                <SelectItem value="Mastercard">Mastercard</SelectItem>
                <SelectItem value="Amex">American Express</SelectItem>
                <SelectItem value="Elo">Elo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="card_last4">Últimos 4 dígitos</Label>
            <Input
              id="card_last4"
              value={formData.card_last4}
              onChange={(e) => setFormData({ ...formData, card_last4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              placeholder="1234"
              maxLength={4}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="holder_name">Nome no Cartão</Label>
            <Input
              id="holder_name"
              value={formData.holder_name}
              onChange={(e) => setFormData({ ...formData, holder_name: e.target.value.toUpperCase() })}
              placeholder="NOME COMPLETO"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry_month">Mês</Label>
              <Input
                id="expiry_month"
                value={formData.expiry_month}
                onChange={(e) => setFormData({ ...formData, expiry_month: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder="12"
                maxLength={2}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_year">Ano</Label>
              <Input
                id="expiry_year"
                value={formData.expiry_year}
                onChange={(e) => setFormData({ ...formData, expiry_year: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                placeholder="26"
                maxLength={2}
                required
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-md">
            <Label htmlFor="is_default" className="cursor-pointer">Definir como cartão padrão</Label>
            <Switch
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
