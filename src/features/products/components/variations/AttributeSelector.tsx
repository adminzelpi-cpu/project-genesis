import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAttributes } from "@/features/attributes/hooks/useAttributes";
import { useAttributeValues } from "@/features/attributes/hooks/useAttributeValues";
import { SizeCategorySelector } from "./SizeCategorySelector";

interface AttributeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  selectedAttributes: Record<string, string[]>;
  onAttributesChange: (attributes: Record<string, string[]>) => void;
}

export const AttributeSelector = ({
  open,
  onOpenChange,
  storeId,
  selectedAttributes,
  onAttributesChange,
}: AttributeSelectorProps) => {
  const { attributes } = useAttributes(storeId);
  const [currentAttribute, setCurrentAttribute] = useState<string | null>(null);

  const handleAttributeToggle = (attrId: string) => {
    if (currentAttribute === attrId) {
      setCurrentAttribute(null);
    } else {
      setCurrentAttribute(attrId);
      if (!selectedAttributes[attrId]) {
        onAttributesChange({ ...selectedAttributes, [attrId]: [] });
      }
    }
  };

  const handleValueToggle = (attrId: string, valueId: string) => {
    const current = selectedAttributes[attrId] || [];
    const updated = current.includes(valueId)
      ? current.filter(id => id !== valueId)
      : [...current, valueId];
    
    if (updated.length === 0) {
      const { [attrId]: _, ...rest } = selectedAttributes;
      onAttributesChange(rest);
    } else {
      onAttributesChange({ ...selectedAttributes, [attrId]: updated });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Selecionar Atributos e Valores</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {attributes?.map(attr => (
            <AttributeSection
              key={attr.id}
              attribute={attr}
              isExpanded={currentAttribute === attr.id}
              selectedValues={selectedAttributes[attr.id] || []}
              onToggle={() => handleAttributeToggle(attr.id)}
              onValueToggle={(valueId) => handleValueToggle(attr.id, valueId)}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

interface AttributeSectionProps {
  attribute: any;
  isExpanded: boolean;
  selectedValues: string[];
  onToggle: () => void;
  onValueToggle: (valueId: string) => void;
}

const AttributeSection = ({
  attribute,
  isExpanded,
  selectedValues,
  onToggle,
  onValueToggle,
}: AttributeSectionProps) => {
  const { attributeValues } = useAttributeValues(attribute.id);
  
  const isSizeAttribute = attribute.type === 'size' || 
    attribute.name.toLowerCase().includes('tamanho');

  return (
    <div className="border rounded-lg p-4">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{attribute.name}</h4>
          <Badge variant="outline">{attribute.type}</Badge>
        </div>
        {selectedValues.length > 0 && (
          <Badge>{selectedValues.length} selecionados</Badge>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4">
          {isSizeAttribute ? (
            <SizeCategorySelector
              values={attributeValues || []}
              selectedValues={selectedValues}
              onValueToggle={onValueToggle}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {attributeValues?.map(value => (
                <div key={value.id} className="flex items-center gap-2">
                  <Checkbox
                    id={value.id}
                    checked={selectedValues.includes(value.id)}
                    onCheckedChange={() => onValueToggle(value.id)}
                  />
                  <Label
                    htmlFor={value.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {value.color_hex && (
                      <div
                        className="w-5 h-5 rounded-full border"
                        style={{ backgroundColor: value.color_hex }}
                      />
                    )}
                    {value.value}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
