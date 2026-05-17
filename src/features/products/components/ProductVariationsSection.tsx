import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAttributes, useAttributeValues } from "@/features/attributes";
import { useActiveStore } from "@/features/stores";
import { Plus, Trash2, Image as ImageIcon, X } from "lucide-react";
import { ProductVariation } from "@/features/attributes/types";
import { AddVariationDialog } from "./AddVariationDialog";

interface ProductVariationsSectionProps {
  storeId: string;
  productId?: string;
  variations: ProductVariation[];
  onVariationsChange: (variations: ProductVariation[]) => void;
}

export const ProductVariationsSection = ({ 
  storeId,
  productId,
  variations, 
  onVariationsChange 
}: ProductVariationsSectionProps) => {
  const { attributes } = useAttributes(storeId);
  
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddAttribute = (attributeId: string, selectedValues: string[]) => {
    if (!selectedAttributeIds.includes(attributeId)) {
      setSelectedAttributeIds([...selectedAttributeIds, attributeId]);
      setSelectedAttributes({
        ...selectedAttributes,
        [attributeId]: selectedValues
      });
    } else {
      setSelectedAttributes({
        ...selectedAttributes,
        [attributeId]: selectedValues
      });
    }
  };

  const handleRemoveAttribute = (attributeId: string) => {
    setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attributeId));
    const newSelected = { ...selectedAttributes };
    delete newSelected[attributeId];
    setSelectedAttributes(newSelected);
  };

  const handleToggleValue = (attributeId: string, valueId: string) => {
    const currentValues = selectedAttributes[attributeId] || [];
    const newValues = currentValues.includes(valueId)
      ? currentValues.filter(v => v !== valueId)
      : [...currentValues, valueId];
    
    setSelectedAttributes({
      ...selectedAttributes,
      [attributeId]: newValues
    });
  };

  const handleGenerateVariations = () => {
    // Gerar todas as combinações possíveis
    const attributeIds = Object.keys(selectedAttributes);
    const valueSets = attributeIds.map(attrId => 
      selectedAttributes[attrId].map(valueId => ({ attrId, valueId }))
    );

    if (valueSets.length === 0) return;

    const combinations = valueSets.reduce((acc, curr) => {
      if (acc.length === 0) return curr.map(v => [v]);
      return acc.flatMap(combo => 
        curr.map(v => [...combo, v])
      );
    }, [] as Array<Array<{ attrId: string; valueId: string }>>);

    const newVariations: ProductVariation[] = combinations.map(combo => {
      const attributes: Record<string, string> = {};
      combo.forEach(({ attrId, valueId }) => {
        attributes[attrId] = valueId;
      });

      return {
        price: 0,
        stock_quantity: 0,
        is_parent: false,
        attributes,
        is_active: true,
      };
    });

    onVariationsChange(newVariations);
  };

  const handleUpdateVariation = (
    index: number,
    field: keyof ProductVariation,
    value: any
  ) => {
    const updated = [...variations];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onVariationsChange(updated);
  };

  const handleRemoveVariation = (index: number) => {
    onVariationsChange(variations.filter((_, i) => i !== index));
  };

  const getAttribute = (attrId: string) => {
    return attributes?.find(a => a.id === attrId);
  };

  const getValueDisplay = (attrId: string, valueId: string) => {
    const attribute = getAttribute(attrId);
    // TODO: buscar valor real do attribute_values
    return valueId;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atributos e Variações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Botão para adicionar variações */}
        <div>
          <Button 
            type="button"
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar variações
          </Button>
        </div>

        {/* Lista de atributos selecionados */}
        {selectedAttributeIds.length > 0 && (
          <div className="space-y-3">
            {selectedAttributeIds.map(attrId => {
              const attribute = attributes?.find(a => a.id === attrId);
              if (!attribute) return null;
              
              return (
                <div key={attrId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">{attribute.name}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttribute(attrId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <AttributeValueDisplay
                    attributeId={attrId}
                    selectedValues={selectedAttributes[attrId] || []}
                    attributeType={attribute.type}
                  />
                </div>
              );
            })}

            <Button 
              type="button"
              onClick={handleGenerateVariations}
              className="w-full"
            >
              Gerar Variações ({Object.values(selectedAttributes).reduce((acc, vals) => acc * (vals.length || 1), 1)} combinações)
            </Button>
          </div>
        )}

        {/* Tabela de Variações */}
        {variations.length > 0 && (
          <div className="space-y-2">
            <Label>Variações Geradas</Label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">Variação</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">SKU</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Preço (R$)</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Estoque</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Imagem</th>
                    <th className="px-4 py-2 text-center text-sm font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {variations.map((variation, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(variation.attributes).map(([attrId, valueId]) => {
                            const attr = getAttribute(attrId);
                            return (
                              <AttributeBadge
                                key={attrId}
                                attributeId={attrId}
                                valueId={valueId}
                                attribute={attr}
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          placeholder="SKU"
                          value={variation.sku || ''}
                          onChange={(e) => handleUpdateVariation(index, 'sku', e.target.value)}
                          className="w-28"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variation.price}
                          onChange={(e) => handleUpdateVariation(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={variation.stock_quantity}
                          onChange={(e) => handleUpdateVariation(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = prompt('URL da imagem:');
                            if (url) handleUpdateVariation(index, 'image_url', url);
                          }}
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariation(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dialog para adicionar atributos */}
        <AddVariationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onAddAttribute={handleAddAttribute}
        />
      </CardContent>
    </Card>
  );
};

// Componente para exibir badge do atributo
const AttributeBadge = ({ 
  attributeId, 
  valueId, 
  attribute 
}: { 
  attributeId: string; 
  valueId: string; 
  attribute: any;
}) => {
  const { values } = useAttributeValues(attributeId);
  const value = values?.find(v => v.id === valueId);

  if (!attribute || !value) return null;

  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      {attribute.type === 'color' && value.color_hex && (
        <div 
          className="w-3 h-3 rounded-full border border-border"
          style={{ backgroundColor: value.color_hex }}
        />
      )}
      <span className="text-xs">{value.value}</span>
    </Badge>
  );
};

// Componente para exibir valores selecionados
const AttributeValueDisplay = ({
  attributeId,
  selectedValues,
  attributeType,
}: {
  attributeId: string;
  selectedValues: string[];
  attributeType: string;
}) => {
  const { values } = useAttributeValues(attributeId);

  return (
    <div className="flex flex-wrap gap-2">
      {selectedValues.map(valueId => {
        const value = values?.find(v => v.id === valueId);
        if (!value) return null;

        return (
          <Badge key={valueId} variant="secondary" className="flex items-center gap-2">
            {attributeType === 'color' && value.color_hex && (
              <div 
                className="w-3 h-3 rounded-full border border-border"
                style={{ backgroundColor: value.color_hex }}
              />
            )}
            {value.value}
          </Badge>
        );
      })}
    </div>
  );
};
