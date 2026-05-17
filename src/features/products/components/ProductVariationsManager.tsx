import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { useAttributes, useAttributeValues, ProductVariation, Attribute } from "@/features/attributes";
import { toast } from "@/hooks/use-toast";

interface ProductVariationsManagerProps {
  storeId: string;
  variations: ProductVariation[];
  onChange: (variations: ProductVariation[]) => void;
}

export function ProductVariationsManager({
  storeId,
  variations,
  onChange,
}: ProductVariationsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({});

  const { attributes, isLoading: attributesLoading } = useAttributes(storeId);

  const handleOpenAttributeSelector = () => {
    setIsOpen(true);
    setSelectedAttribute(null);
  };

  const handleSelectAttribute = (attribute: Attribute) => {
    setSelectedAttribute(attribute);
  };

  const handleToggleValue = (attributeId: string, valueId: string) => {
    setSelectedValues((prev) => {
      const current = prev[attributeId] || [];
      const isSelected = current.includes(valueId);
      
      return {
        ...prev,
        [attributeId]: isSelected
          ? current.filter((id) => id !== valueId)
          : [...current, valueId],
      };
    });
  };

  const handleCreateVariations = () => {
    const attributeIds = Object.keys(selectedValues);
    
    if (attributeIds.length === 0) {
      toast({
        title: "Selecione valores",
        description: "Você precisa selecionar pelo menos um valor de atributo",
        variant: "destructive",
      });
      return;
    }

    const combinations = generateCombinations(selectedValues);
    
    const newVariations: ProductVariation[] = combinations.map((combo) => ({
      price: 0,
      stock_quantity: 0,
      attributes: combo,
      is_active: true,
      is_parent: false,
    }));

    onChange([...variations, ...newVariations]);
    
    toast({
      title: "Variações criadas",
      description: `${newVariations.length} variações foram adicionadas`,
    });

    setIsOpen(false);
    setSelectedAttribute(null);
    setSelectedValues({});
  };

  const handleRemoveVariation = (index: number) => {
    onChange(variations.filter((_, i) => i !== index));
  };

  const handleUpdateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  if (attributesLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variações</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Combine diferentes propriedades do seu produto. Exemplo: cor + tamanho.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de variações existentes */}
        {variations.length > 0 && (
          <div className="space-y-3">
            {variations.map((variation, index) => {
              const attrLabels = Object.entries(variation.attributes)
                .map(([attrId, valueId]) => {
                  const attr = attributes.find((a) => a.id === attrId);
                  return `${attr?.name}: ${valueId}`;
                })
                .join(" • ");

              return (
                <div key={index} className="grid gap-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{attrLabels}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveVariation(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Preço (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={variation.price}
                        onChange={(e) =>
                          handleUpdateVariation(index, "price", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Estoque</Label>
                      <Input
                        type="number"
                        value={variation.stock_quantity}
                        onChange={(e) =>
                          handleUpdateVariation(index, "stock_quantity", parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">SKU (opcional)</Label>
                      <Input
                        value={variation.sku || ""}
                        onChange={(e) => handleUpdateVariation(index, "sku", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL da Imagem</Label>
                      <Input
                        value={variation.image_url || ""}
                        onChange={(e) => handleUpdateVariation(index, "image_url", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botão para adicionar variações */}
        <Button
          variant="outline"
          onClick={handleOpenAttributeSelector}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar variações
        </Button>

        {/* Sheet para selecionar atributos e valores */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                {selectedAttribute ? selectedAttribute.name : "Nova propriedade"}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {!selectedAttribute ? (
                // Seletor de atributo
                <div className="space-y-2">
                  <Label>Propriedade</Label>
                  {attributesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Carregando atributos...
                    </div>
                  ) : attributes.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <p className="text-muted-foreground">
                        Nenhum atributo encontrado. Crie atributos como Cor e Tamanho primeiro.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsOpen(false);
                          window.location.href = "/dashboard/attributes";
                        }}
                      >
                        Ir para Atributos
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attributes.map((attr) => (
                        <button
                          key={attr.id}
                          onClick={() => handleSelectAttribute(attr)}
                          className="w-full p-3 text-left border rounded-lg hover:bg-muted transition-colors"
                        >
                          {attr.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Seletor de valores do atributo
                <AttributeValueSelector
                  attribute={selectedAttribute}
                  selectedValues={selectedValues[selectedAttribute.id] || []}
                  onToggleValue={(valueId) => handleToggleValue(selectedAttribute.id, valueId)}
                  onBack={() => setSelectedAttribute(null)}
                  onCreate={handleCreateVariations}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
  );
}

// Componente para selecionar valores de um atributo específico
function AttributeValueSelector({
  attribute,
  selectedValues,
  onToggleValue,
  onBack,
  onCreate,
}: {
  attribute: Attribute;
  selectedValues: string[];
  onToggleValue: (valueId: string) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  const { values, isLoading, createValue } = useAttributeValues(attribute.id);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customColor, setCustomColor] = useState("#000000");
  const [isCreatingValue, setIsCreatingValue] = useState(false);

  if (isLoading) {
    return <div>Carregando valores...</div>;
  }

  const isColorAttribute = attribute.type === "color";
  const allValueIds = values.map((v) => v.id);
  const allSelected = allValueIds.every((id) => selectedValues.includes(id));

  const handleSelectAll = () => {
    if (allSelected) {
      // Desmarcar todos
      allValueIds.forEach((id) => {
        if (selectedValues.includes(id)) {
          onToggleValue(id);
        }
      });
    } else {
      // Marcar todos
      allValueIds.forEach((id) => {
        if (!selectedValues.includes(id)) {
          onToggleValue(id);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 -ml-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar
      </Button>

      <div>
        <h3 className="font-medium mb-2">
          {isColorAttribute ? "Cores selecionadas" : `${attribute.name} selecionados`}
        </h3>
        <p className="text-sm text-muted-foreground">
          {selectedValues.length === 0
            ? `Se você não encontrar ${isColorAttribute ? "a cor" : "o valor"} que precisa, pode criá-${isColorAttribute ? "la" : "lo"}.`
            : `${selectedValues.length} ${isColorAttribute ? "cor(es)" : "valor(es)"} selecionado(s)`}
        </p>
      </div>

      {/* Botão selecionar tudo */}
      {values.length > 0 && (
        <Button
          variant="outline"
          onClick={handleSelectAll}
          className="w-full"
        >
          {allSelected ? "Desmarcar tudo" : "Selecionar tudo"}
        </Button>
      )}

      {/* Lista de valores */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {values.map((value) => (
          <div
            key={value.id}
            className="flex items-center justify-between gap-3 p-3 hover:bg-muted rounded-lg border cursor-pointer"
            onClick={() => onToggleValue(value.id)}
          >
            <div className="flex items-center gap-3 flex-1">
              {isColorAttribute && value.color_hex && (
                <div
                  className="w-6 h-6 rounded-full border-2"
                  style={{ backgroundColor: value.color_hex }}
                />
              )}
              <span>{value.value}</span>
            </div>
            <Checkbox
              checked={selectedValues.includes(value.id)}
              onCheckedChange={() => onToggleValue(value.id)}
            />
          </div>
        ))}
      </div>

      {/* Adicionar valor personalizado */}
      {!showCustomInput ? (
        <Button
          variant="outline"
          onClick={() => setShowCustomInput(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {isColorAttribute ? "Adicionar cor personalizada" : "Adicionar tamanho personalizado"}
        </Button>
      ) : (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
          <div className="space-y-2">
            <Label>{isColorAttribute ? "Nome da Cor" : "Nome do Tamanho"}</Label>
            <Input
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder={isColorAttribute ? "Ex: Azul Petróleo" : "Ex: 3GG"}
            />
          </div>
          
          {isColorAttribute && (
            <div className="space-y-2">
              <Label>Código da Cor</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-20 h-10 p-1"
                />
                <Input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomInput(false);
                setCustomValue("");
                setCustomColor("#000000");
              }}
              className="flex-1"
              disabled={isCreatingValue}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setIsCreatingValue(true);
                try {
                  await createValue({
                    value: customValue.trim(),
                    color_hex: isColorAttribute ? customColor : undefined,
                  });
                  setShowCustomInput(false);
                  setCustomValue("");
                  setCustomColor("#000000");
                } catch (error) {
                  console.error("Erro ao criar valor:", error);
                } finally {
                  setIsCreatingValue(false);
                }
              }}
              className="flex-1"
              disabled={!customValue.trim() || isCreatingValue}
            >
              {isCreatingValue ? "Adicionando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-background">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={onCreate} className="flex-1" disabled={selectedValues.length === 0}>
          Criar
        </Button>
      </div>
    </div>
  );
}

// Função auxiliar para gerar combinações
function generateCombinations(selectedValues: Record<string, string[]>): Record<string, string>[] {
  const attributes = Object.entries(selectedValues);
  
  if (attributes.length === 0) return [];
  
  const combinations: Record<string, string>[] = [{}];
  
  for (const [attrId, values] of attributes) {
    const newCombinations: Record<string, string>[] = [];
    
    for (const combo of combinations) {
      for (const value of values) {
        newCombinations.push({
          ...combo,
          [attrId]: value,
        });
      }
    }
    
    combinations.length = 0;
    combinations.push(...newCombinations);
  }
  
  return combinations;
}
