import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { invokeCustomerFn } from "@/features/customers/lib/customerApi";
import { z } from "zod";
import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const addressSchema = z.object({
  tipo: z.string().trim().min(1, "Tipo é obrigatório").max(50, "Máximo 50 caracteres"),
  rua: z.string().trim().min(1, "Endereço é obrigatório").max(200, "Máximo 200 caracteres"),
  numero: z.string().trim().min(1, "Número é obrigatório").max(20, "Máximo 20 caracteres"),
  complemento: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
  bairro: z.string().trim().min(1, "Bairro é obrigatório").max(100, "Máximo 100 caracteres"),
  cidade: z.string().trim().min(1, "Cidade é obrigatória").max(100, "Máximo 100 caracteres"),
  estado: z.string().trim().min(2, "Estado é obrigatório").max(2, "Use sigla de 2 letras"),
  cep: z.string().trim().min(8, "CEP inválido").max(9, "CEP inválido"),
});

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

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: CustomerAddress;
  onSuccess: () => void;
  customerId: string | null;
}

const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return '';
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};

export function AddressDialog({ open, onOpenChange, address, onSuccess, customerId }: AddressDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepValid, setCepValid] = useState<boolean | null>(null);
  const [cepError, setCepError] = useState("");
  const numberRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    tipo: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    is_default: false,
  });

  useEffect(() => {
    if (address) {
      setFormData({
        tipo: address.tipo || "",
        rua: address.rua || "",
        numero: address.numero || "",
        complemento: address.complemento || "",
        bairro: address.bairro || "",
        cidade: address.cidade || "",
        estado: address.estado || "",
        cep: formatCEP(address.cep || ""),
        is_default: address.is_default || false,
      });
      setCepValid(address.cep ? true : null);
      setCepError("");
    } else {
      setFormData({
        tipo: "",
        rua: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        is_default: false,
      });
      setCepValid(null);
      setCepError("");
    }
  }, [address, open]);

  const searchCep = async (cleanCep: string) => {
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) {
        setCepError("Erro ao consultar CEP");
        setCepValid(false);
        return;
      }
      const data = await response.json();
      if (data.erro) {
        setCepError("CEP não encontrado");
        setCepValid(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
      setCepValid(true);
      setCepError("");

      // Focus on next empty field
      setTimeout(() => {
        if (!data.logradouro && streetRef.current) {
          streetRef.current.focus();
        } else if (numberRef.current) {
          numberRef.current.focus();
        }
      }, 150);
    } catch {
      setCepError("Erro ao conectar ao serviço de CEP");
      setCepValid(false);
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setFormData(prev => ({ ...prev, cep: formatted }));
    setCepError("");
    setCepValid(null);

    const cleanCep = formatted.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      searchCep(cleanCep);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.error("Erro: conta de cliente não encontrada.");
      return;
    }
    setLoading(true);

    try {
      // Strip CEP mask for storage
      const cleanCep = formData.cep.replace(/\D/g, "");
      const validatedData = addressSchema.parse({ ...formData, cep: cleanCep });

      if (address) {
        await invokeCustomerFn("customer-addresses", {
          body: {
            action: "update",
            address_id: address.id,
            ...validatedData,
            is_default: formData.is_default,
          },
        });
        toast.success("Endereço atualizado!");
      } else {
        await invokeCustomerFn("customer-addresses", {
          body: {
            action: "create",
            ...validatedData,
            complemento: validatedData.complemento || "",
            is_default: formData.is_default || false,
          },
        });
        toast.success("Endereço adicionado!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error("Erro ao salvar endereço");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{address ? "Editar Endereço" : "Novo Endereço"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="tipo">Identificação (Casa, Trabalho, etc.)</Label>
              <Input
                id="tipo"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                placeholder="Ex: Casa"
                required
              />
            </div>

            {/* CEP with mask, numeric keyboard, and auto-search */}
            <div className="col-span-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="relative mt-1">
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={9}
                  required
                  className={cn(
                    "pr-10",
                    cepError && "border-destructive"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {loadingCep ? (
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                  ) : cepValid !== null ? (
                    cepValid ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-destructive" />
                    )
                  ) : null}
                </div>
              </div>
              {cepError && <p className="text-xs text-destructive mt-1">{cepError}</p>}
            </div>

            <div className="col-span-1">
              <Label htmlFor="rua">Endereço</Label>
              <Input
                id="rua"
                ref={streetRef}
                value={formData.rua}
                onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                placeholder="Rua, Avenida, etc."
                required
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                ref={numberRef}
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="Ex: 123"
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                value={formData.complemento}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                placeholder="Apto, Bloco, etc. (opcional)"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                placeholder="Nome do bairro"
                required
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="Nome da cidade"
                required
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="estado">Estado (UF)</Label>
              <Input
                id="estado"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                placeholder="SP"
                maxLength={2}
                required
              />
            </div>
            <div className="col-span-2 flex items-center justify-between p-4 border rounded-md">
              <Label htmlFor="is_default" className="cursor-pointer">Definir como endereço padrão</Label>
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
            </div>
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
