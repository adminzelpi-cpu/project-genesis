import { useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface ProductVariantForm {
  id?: string;
  name: string;
  type: "color" | "size" | "style";
  value: string;
  image_url?: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

interface VariantManagerProps {
  variants: ProductVariantForm[];
  onChange: (variants: ProductVariantForm[]) => void;
}

export function VariantManager({ variants, onChange }: VariantManagerProps) {
  const { toast } = useToast();
  const [newVariant, setNewVariant] = useState<ProductVariantForm>({
    name: "",
    type: "color",
    value: "",
    price_adjustment: 0,
    stock_quantity: 0,
    is_active: true,
  });

  const handleAddVariant = () => {
    if (!newVariant.name.trim() || !newVariant.value.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o valor da variante",
        variant: "destructive",
      });
      return;
    }

    onChange([...variants, { ...newVariant }]);
    setNewVariant({
      name: "",
      type: "color",
      value: "",
      price_adjustment: 0,
      stock_quantity: 0,
      is_active: true,
    });

    toast({
      title: "Variante adicionada",
      description: "A variante foi adicionada à lista",
    });
  };

  const handleRemoveVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
    toast({
      title: "Variante removida",
      description: "A variante foi removida da lista",
    });
  };

  const handleImageUpload = async (index: number, file: File) => {
    // Simulação de upload - em produção, fazer upload para Supabase Storage
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedVariants = [...variants];
      updatedVariants[index].image_url = reader.result as string;
      onChange(updatedVariants);
      
      toast({
        title: "Imagem adicionada",
        description: "A imagem foi carregada com sucesso",
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Nova Variante</CardTitle>
          <CardDescription>
            Crie variantes de cor, tamanho ou estilo para o produto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="variant-name">Nome da Variante *</Label>
              <Input
                id="variant-name"
                placeholder="Ex: Azul Marinho"
                value={newVariant.name}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, name: e.target.value })
                }
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="variant-type">Tipo *</Label>
              <Select
                value={newVariant.type}
                onValueChange={(value: "color" | "size" | "style") =>
                  setNewVariant({ ...newVariant, type: value })
                }
              >
                <SelectTrigger id="variant-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="color">Cor</SelectItem>
                  <SelectItem value="size">Tamanho</SelectItem>
                  <SelectItem value="style">Estilo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="variant-value">Valor *</Label>
              <Input
                id="variant-value"
                placeholder="Ex: #1E3A8A ou M"
                value={newVariant.value}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, value: e.target.value })
                }
                maxLength={50}
              />
            </div>

            <div>
              <Label htmlFor="variant-price">Ajuste de Preço (R$)</Label>
              <CurrencyInput
                id="variant-price"
                value={newVariant.price_adjustment}
                onChange={(v) =>
                  setNewVariant({
                    ...newVariant,
                    price_adjustment: typeof v === 'number' ? v : parseFloat(String(v)) || 0,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="variant-stock">Estoque</Label>
              <Input
                id="variant-stock"
                type="number"
                min="0"
                value={newVariant.stock_quantity}
                onChange={(e) =>
                  setNewVariant({
                    ...newVariant,
                    stock_quantity: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <Button onClick={handleAddVariant} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Variante
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Variantes */}
      {variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variantes ({variants.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {variants.map((variant, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* Imagem/Preview */}
                <div className="relative">
                  {variant.image_url ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                      <img
                        src={variant.image_url}
                        alt={variant.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          const updatedVariants = [...variants];
                          updatedVariants[index].image_url = undefined;
                          onChange(updatedVariants);
                        }}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-1 rounded-bl"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(index, file);
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{variant.name}</h4>
                    <Badge variant="secondary" className="shrink-0">
                      {variant.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Valor: {variant.value}</span>
                    {variant.price_adjustment !== 0 && (
                      <span className={cn(
                        variant.price_adjustment > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {variant.price_adjustment > 0 ? "+" : ""}
                        R$ {variant.price_adjustment.toFixed(2)}
                      </span>
                    )}
                    <span>Estoque: {variant.stock_quantity}</span>
                  </div>
                </div>

                {/* Ações */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveVariant(index)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
