import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductVariation, AttributeValue } from "@/features/attributes/types";
import { ImageUploadModal } from "./ImageUploadModal";
import { toast } from "sonner";

interface VariationEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variation: ProductVariation | null;
  onSave: (updatedVariation: ProductVariation, applyToAllFields?: string[]) => void;
  title?: string;
  storeId?: string;
  attributeValues?: AttributeValue[];
  productCode?: number | null;
}

export const VariationEditModal = ({
  open,
  onOpenChange,
  variation,
  onSave,
  title = "Editar Variação",
  storeId,
  attributeValues = [],
  productCode,
}: VariationEditModalProps) => {
  const [formData, setFormData] = useState<ProductVariation | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [applyToAll, setApplyToAll] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (variation) {
      setFormData({ ...variation });
      setApplyToAll({});
    }
  }, [variation]);

  const handleSave = () => {
    if (formData) {
      const sp = (formData as any).sale_price;
      if (sp != null && sp > 0 && formData.price > 0 && sp >= formData.price) {
        toast.error('O preço promocional deve ser menor que o preço normal.');
        return;
      }
      const fieldsToApply = Object.entries(applyToAll)
        .filter(([_, checked]) => checked)
        .map(([field]) => field);
      
      onSave(formData, fieldsToApply.length > 0 ? fieldsToApply : undefined);
      onOpenChange(false);
    }
  };

  const toggleApplyToAll = (field: string) => {
    setApplyToAll(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const updateField = (field: keyof ProductVariation, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleImagesSave = (images: Array<{ url: string; is_primary: boolean }>) => {
    updateField('images', images);
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure todos os detalhes desta variação
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pricing">Preços & Estoque</TabsTrigger>
            <TabsTrigger value="shipping">Dimensões & Peso</TabsTrigger>
            <TabsTrigger value="codes">Códigos</TabsTrigger>
            <TabsTrigger value="images">Imagens</TabsTrigger>
          </TabsList>

          {/* Preços & Estoque */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço Normal (R$) *</Label>
                <CurrencyInput
                  id="price"
                  value={formData.price || ""}
                  onChange={(v) => updateField("price", typeof v === 'number' ? v : parseFloat(String(v)) || 0)}
                  placeholder="0,00"
                />
                <div className="flex items-center space-x-2 mt-1">
                  <Checkbox 
                    id="apply-price"
                    checked={applyToAll.price || false}
                    onCheckedChange={() => toggleApplyToAll('price')}
                  />
                  <Label htmlFor="apply-price" className="text-xs text-muted-foreground cursor-pointer">
                    Aplicar para todas as variações
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço Promocional (R$)</Label>
                <CurrencyInput
                  id="sale_price"
                  value={(formData as any).sale_price ?? ""}
                  onChange={(v) => {
                    const value = v === '' ? null : (typeof v === 'number' ? v : parseFloat(String(v)));
                    updateField("sale_price" as any, value);
                  }}
                  placeholder="0,00"
                />
                <div className="flex items-center space-x-2 mt-1">
                  <Checkbox 
                    id="apply-sale-price"
                    checked={applyToAll.sale_price || false}
                    onCheckedChange={() => toggleApplyToAll('sale_price')}
                  />
                  <Label htmlFor="apply-sale-price" className="text-xs text-muted-foreground cursor-pointer">
                    Aplicar para todas as variações
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stock_quantity">Quantidade em Estoque</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="infinite_stock"
                      checked={formData.stock_quantity === null}
                      onCheckedChange={(checked) => {
                        updateField("stock_quantity", checked ? null : 0);
                      }}
                    />
                    <Label htmlFor="infinite_stock" className="text-sm text-muted-foreground cursor-pointer">
                      Infinito
                    </Label>
                  </div>
                </div>
                <Input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  value={formData.stock_quantity === null ? "" : (formData.stock_quantity ?? "")}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : parseInt(e.target.value);
                    updateField("stock_quantity", value);
                  }}
                  placeholder={formData.stock_quantity === null ? "∞ Infinito" : "0"}
                  disabled={formData.stock_quantity === null}
                  className={formData.stock_quantity === null ? "bg-muted" : ""}
                />
                <div className="flex items-center space-x-2 mt-1">
                  <Checkbox 
                    id="apply-stock"
                    checked={applyToAll.stock_quantity || false}
                    onCheckedChange={() => toggleApplyToAll('stock_quantity')}
                  />
                  <Label htmlFor="apply-stock" className="text-xs text-muted-foreground cursor-pointer">
                    Aplicar para todas as variações
                  </Label>
                </div>
              </div>

              <div className="flex items-center space-x-2 mt-8">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => updateField("is_active", checked)}
                />
                <Label htmlFor="is_active">Variação ativa</Label>
              </div>
            </div>
          </TabsContent>

          {/* Dimensões & Peso */}
          <TabsContent value="shipping" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <CurrencyInput
                  id="weight"
                  decimals={3}
                  value={(formData as any).weight || ""}
                  onChange={(v) => updateField("weight" as any, typeof v === 'number' ? v : parseFloat(String(v)) || 0)}
                  placeholder="0,000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="length">Comprimento (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  min="0"
                  value={(formData as any).length === 0 ? '' : ((formData as any).length || "")}
                  onChange={(e) => updateField("length" as any, e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="width">Largura (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  min="0"
                  value={(formData as any).width === 0 ? '' : ((formData as any).width || "")}
                  onChange={(e) => updateField("width" as any, e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  min="0"
                  value={(formData as any).height === 0 ? '' : ((formData as any).height || "")}
                  onChange={(e) => updateField("height" as any, e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
              <Checkbox 
                id="apply-dimensions"
                checked={applyToAll.dimensions || false}
                onCheckedChange={() => toggleApplyToAll('dimensions')}
              />
              <Label htmlFor="apply-dimensions" className="text-sm cursor-pointer flex-1">
                Aplicar <strong>peso e dimensões</strong> para todas as variações
              </Label>
            </div>

            <p className="text-xs text-muted-foreground">
              Essas informações são usadas para cálculo de frete
            </p>
          </TabsContent>

          {/* Códigos */}
          <TabsContent value="codes" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU (Código do Produto)</Label>
              <Input
                id="sku"
                value={formData.sku || ""}
                onChange={(e) => updateField("sku", e.target.value)}
                placeholder="Ex: CAM-AZ-M"
              />
              <p className="text-xs text-muted-foreground">
                Identificador único para controle de estoque
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gtin">GTIN / EAN</Label>
                <Input
                  id="gtin"
                  value={(formData as any).gtin || ""}
                  onChange={(e) => updateField("gtin" as any, e.target.value)}
                  placeholder="7891234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ean">EAN</Label>
                <Input
                  id="ean"
                  value={(formData as any).ean || ""}
                  onChange={(e) => updateField("ean" as any, e.target.value)}
                  placeholder="7891234567890"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="upc">UPC</Label>
                <Input
                  id="upc"
                  value={(formData as any).upc || ""}
                  onChange={(e) => updateField("upc" as any, e.target.value)}
                  placeholder="123456789012"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mpn">MPN</Label>
                <Input
                  id="mpn"
                  value={(formData as any).mpn || ""}
                  onChange={(e) => updateField("mpn" as any, e.target.value)}
                  placeholder="ABC123XYZ"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Códigos de barras e identificadores para marketplaces e integrações
            </p>
          </TabsContent>

          {/* Imagens */}
          <TabsContent value="images" className="space-y-4">
            <div className="text-center py-8">
              <Button onClick={() => setImageModalOpen(true)}>
                Gerenciar Imagens ({(formData.images as any)?.length || 0})
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Adicione imagens específicas para esta variação
              </p>
            </div>

            {(() => { const imgs = Array.isArray(formData.images) ? formData.images : []; return imgs.length > 0 ? true : false; })() && (
              <div className="grid grid-cols-4 gap-2">
                {(Array.isArray(formData.images) ? formData.images : []).map((img: any, idx: number) => (
                  <div key={idx} className="relative">
                    <img
                      src={img.url}
                      alt={`Imagem ${idx + 1}`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    {img.is_primary && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1 rounded">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>

      <ImageUploadModal
        open={imageModalOpen}
        onOpenChange={setImageModalOpen}
        images={Array.isArray(formData.images) ? formData.images : (() => { try { return typeof formData.images === 'string' ? JSON.parse(formData.images) : []; } catch { return []; } })()}
        onSave={handleImagesSave}
        variationId={formData.id}
        storeId={storeId}
      />
    </Dialog>
  );
};
