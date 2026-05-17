import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Upload, Image as ImageIcon, Trash2, Edit, Copy } from "lucide-react";
import { ProductVariation } from "@/features/attributes/types";
import { useAttributeValues } from "@/features/attributes/hooks/useAttributeValues";
import { VariationEditModal } from "./VariationEditModal";

interface VariationGroupCardProps {
  groupName: string;
  variations: (ProductVariation & { _index?: number })[];
  primaryAttribute: any;
  selectedAttributes: Record<string, string[]>;
  attributes: any[];
  onGroupUpdate: (field: string, value: any) => void;
  onVariationUpdate: (index: number, field: string, value: any) => void;
  onRemoveVariation: (index: number) => void;
  storeId?: string;
}

export const VariationGroupCard = ({
  groupName,
  variations,
  primaryAttribute,
  selectedAttributes,
  attributes,
  onGroupUpdate,
  onVariationUpdate,
  onRemoveVariation,
  storeId,
}: VariationGroupCardProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [groupImages, setGroupImages] = useState<string[]>([]);
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Buscar valor do atributo para mostrar nome bonito
  const { attributeValues } = useAttributeValues(primaryAttribute?.id);
  const groupValue = attributeValues?.find(v => v.id === groupName);
  const displayName = groupValue?.value || groupName;

  const handleGroupImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages: string[] = [];
      let filesProcessed = 0;
      
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          filesProcessed++;
          
          if (filesProcessed === files.length) {
            const updatedImages = [...groupImages, ...newImages];
            setGroupImages(updatedImages);
            // Salvar a primeira imagem como image_url principal
            onGroupUpdate("image_url", updatedImages[0]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = groupImages.filter((_, i) => i !== index);
    setGroupImages(updatedImages);
    onGroupUpdate("image_url", updatedImages[0] || "");
  };

  const handleEditVariation = (variation: ProductVariation) => {
    setEditingVariation(variation);
    setEditModalOpen(true);
  };

  const handleSaveVariation = (updatedVariation: ProductVariation) => {
    const varWithIndex = updatedVariation as any;
    if (varWithIndex._index !== undefined) {
      Object.entries(updatedVariation).forEach(([field, value]) => {
        if (field !== '_index' && field !== 'attributes') {
          onVariationUpdate(varWithIndex._index!, field, value);
        }
      });
    }
  };

  const handleEditGroup = () => {
    // Editar a primeira variação do grupo (representando o pai)
    if (variations.length > 0) {
      setEditingVariation(variations[0]);
      setEditModalOpen(true);
    }
  };

  const getVariationLabel = (variation: ProductVariation) => {
    const labels: string[] = [];
    Object.entries(variation.attributes).forEach(([attrId, valueId]) => {
      if (attrId === primaryAttribute?.id) return; // Pular atributo principal
      const attr = attributes.find(a => a.id === attrId);
      if (attr) {
        const attrValue = attributeValues?.find(v => v.id === valueId && v.attribute_id === attrId);
        if (attrValue) {
          labels.push(attrValue.value);
        }
      }
    });
    return labels.length > 0 ? labels.join(" / ") : "Padrão";
  };

  const handleDuplicateVariation = (index: number) => {
    const variation = variations[index];
    const duplicated = { ...variation, sku: `${variation.sku}-COPY` };
    // Aqui você pode adicionar lógica para adicionar a variação duplicada
    console.log("Duplicar variação:", duplicated);
  };

  return (
    <Card className="border rounded-lg overflow-hidden">
      {/* Header - Sempre visível */}
      <div 
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Área de Upload de Imagem */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Label
            htmlFor={`group-image-${groupName}`}
            className="cursor-pointer block"
          >
            <div className="relative group">
              {groupImages.length > 0 ? (
                <div className="w-16 h-16 rounded border-2 border-border overflow-hidden relative">
                  <img 
                    src={groupImages[0]} 
                    alt={displayName} 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Badge +X quando tiver múltiplas imagens */}
                  {groupImages.length > 1 && (
                    <div className="absolute bottom-1 right-1 bg-background/95 backdrop-blur-sm px-1.5 py-0.5 rounded border border-border shadow-sm">
                      <span className="text-xs font-semibold text-foreground">
                        +{groupImages.length - 1}
                      </span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-muted/30 transition-colors flex items-center justify-center bg-muted/10">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
          </Label>
          <Input
            id={`group-image-${groupName}`}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGroupImageUpload}
          />
        </div>

        {/* Info do Grupo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {groupValue?.color_hex && (
              <div
                className="w-5 h-5 rounded-full border-2 border-border shadow-sm flex-shrink-0"
                style={{ backgroundColor: groupValue.color_hex }}
              />
            )}
            <h4 className="font-semibold text-base">{displayName}</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            {variations.length} {variations.length === 1 ? 'Variante' : 'Variantes'}
          </p>
        </div>

        {/* Chevron */}
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Conteúdo Expandido - Lista de Variações Filho */}
      {isExpanded && (
        <div className="border-t">
          {/* Cabeçalho da Tabela */}
          <div className="grid grid-cols-[2fr,1.5fr,1fr,1fr,auto] gap-3 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground border-b">
            <div>Variação</div>
            <div>Preço (R$)</div>
            <div>Estoque</div>
            <div>Peso</div>
            <div className="text-right">Ações</div>
          </div>

          {/* Linhas de Variações */}
          <div className="divide-y">
            {variations.map((variation, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[2fr,1.5fr,1fr,1fr,auto] gap-3 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
              >
                {/* Variação */}
                <div className="flex items-center gap-2">
                  {groupImages.length > 0 && (
                    <img 
                      src={groupImages[0]} 
                      alt={getVariationLabel(variation)}
                      className="w-10 h-10 rounded border object-cover flex-shrink-0"
                    />
                  )}
                  <span className="text-sm font-medium truncate">
                    {getVariationLabel(variation)}
                  </span>
                </div>

                {/* Preço */}
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    value={variation.price}
                    onChange={(e) =>
                      onVariationUpdate(variation._index!, "price", parseFloat(e.target.value))
                    }
                    className="h-9 text-sm"
                    placeholder="0,00"
                  />
                </div>

                {/* Estoque */}
                <div>
                  <Input
                    type="number"
                    value={variation.stock_quantity}
                    onChange={(e) =>
                      onVariationUpdate(variation._index!, "stock_quantity", parseInt(e.target.value))
                    }
                    className="h-9 text-sm"
                    placeholder="0"
                  />
                </div>

                {/* Peso */}
                <div>
                  <Input
                    type="number"
                    step="0.001"
                    value={(variation as any).weight || ""}
                    onChange={(e) =>
                      onVariationUpdate(variation._index!, "weight", parseFloat(e.target.value))
                    }
                    className="h-9 text-sm"
                    placeholder="0,000"
                  />
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleEditVariation(variation)}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDuplicateVariation(variation._index!)}
                    title="Duplicar"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => onRemoveVariation(variation._index!)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <VariationEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        variation={editingVariation}
        onSave={handleSaveVariation}
        storeId={storeId}
      />
    </Card>
  );
};
