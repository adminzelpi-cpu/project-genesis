import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAttributes, useAttributeValues } from "@/features/attributes/hooks/useAttributes";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";
import { HexColorPicker } from "@/components/ui/hex-color-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AttributeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  selectedAttributes: Record<string, string[]>;
  onAttributesChange: (attributes: Record<string, string[]>) => void;
}

export const AttributeSelectorWithCategories = ({
  open,
  onOpenChange,
  storeId,
  selectedAttributes,
  onAttributesChange,
}: AttributeSelectorProps) => {
  const { attributes, createAttribute } = useAttributes(storeId);
  const [expandedAttribute, setExpandedAttribute] = useState<string | null>(null);
  const [showNewAttribute, setShowNewAttribute] = useState(false);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrType, setNewAttrType] = useState("custom");

  const handleAttributeToggle = (attributeId: string) => {
    setExpandedAttribute(expandedAttribute === attributeId ? null : attributeId);
  };

  const handleValueToggle = (attributeId: string, valueId: string) => {
    const currentValues = selectedAttributes[attributeId] || [];
    const newValues = currentValues.includes(valueId)
      ? currentValues.filter((id) => id !== valueId)
      : [...currentValues, valueId];

    if (newValues.length === 0) {
      const { [attributeId]: _, ...rest } = selectedAttributes;
      onAttributesChange(rest);
    } else {
      onAttributesChange({
        ...selectedAttributes,
        [attributeId]: newValues,
      });
    }
  };

  const handleSelectAllCategory = (attributeId: string, categoryValues: string[]) => {
    const currentValues = selectedAttributes[attributeId] || [];
    const allSelected = categoryValues.every(id => currentValues.includes(id));
    
    if (allSelected) {
      const newValues = currentValues.filter(id => !categoryValues.includes(id));
      if (newValues.length === 0) {
        const { [attributeId]: _, ...rest } = selectedAttributes;
        onAttributesChange(rest);
      } else {
        onAttributesChange({ ...selectedAttributes, [attributeId]: newValues });
      }
    } else {
      const newValues = Array.from(new Set([...currentValues, ...categoryValues]));
      onAttributesChange({ ...selectedAttributes, [attributeId]: newValues });
    }
  };

  const handleCreateAttribute = async () => {
    if (!newAttrName.trim()) return;
    await createAttribute({ name: newAttrName.trim(), type: newAttrType });
    setNewAttrName("");
    setNewAttrType("custom");
    setShowNewAttribute(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Selecionar Atributos</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {attributes?.map((attribute) => (
            <AttributeSection
              key={attribute.id}
              attribute={attribute}
              isExpanded={expandedAttribute === attribute.id || expandedAttribute === null && Object.keys(selectedAttributes).includes(attribute.id)}
              onToggle={() => handleAttributeToggle(attribute.id)}
              selectedValues={selectedAttributes[attribute.id] || []}
              onValueToggle={(valueId) => handleValueToggle(attribute.id, valueId)}
              onSelectAllCategory={(categoryValues) => handleSelectAllCategory(attribute.id, categoryValues)}
            />
          ))}

          {/* Botão para criar novo atributo */}
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setShowNewAttribute(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Atributo
          </Button>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            Aplicar
          </Button>
        </div>

        {/* Dialog para criar novo atributo */}
        <Dialog open={showNewAttribute} onOpenChange={setShowNewAttribute}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Atributo</DialogTitle>
              <DialogDescription>Adicione um novo atributo para seus produtos</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Atributo</Label>
                <Input
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  placeholder="Ex: Material, Gênero, Estilo"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateAttribute()}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={newAttrType} onValueChange={setNewAttrType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Personalizado</SelectItem>
                    <SelectItem value="color">Cor</SelectItem>
                    <SelectItem value="size">Tamanho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateAttribute} className="w-full" disabled={!newAttrName.trim()}>
                Criar Atributo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
};

// ─── Attribute Section ───────────────────────────────

interface AttributeSectionProps {
  attribute: { id: string; name: string; type: string };
  isExpanded: boolean;
  onToggle: () => void;
  selectedValues: string[];
  onValueToggle: (valueId: string) => void;
  onSelectAllCategory: (categoryValues: string[]) => void;
}

const SIZE_CATEGORIES = [
  { value: "adulto", label: "Adulto" },
  { value: "calca", label: "Calça" },
  { value: "infantil", label: "Infantil" },
];

const AttributeSection = ({
  attribute,
  isExpanded,
  onToggle,
  selectedValues,
  onValueToggle,
  onSelectAllCategory,
}: AttributeSectionProps) => {
  const { values: attributeValues, createValue } = useAttributeValues(attribute.id);
  const [addingInCategory, setAddingInCategory] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [newSizeCategory, setNewSizeCategory] = useState("");

  const handleAddValue = async (category?: string) => {
    if (!newValue.trim()) return;
    const created = await createValue({
      value: newValue.trim(),
      color_hex: attribute.type === "color" ? newColorHex : undefined,
      size_category: category || newSizeCategory || undefined,
    });
    if (created?.id) {
      onValueToggle(created.id);
    }
    setNewValue("");
    setNewColorHex("#000000");
    setNewSizeCategory("");
    setAddingInCategory(null);
  };

  const isSizeWithCategories = attribute.type === "size" || attribute.name === "Tamanho";

  // Group values by category (for size attributes)
  const valuesByCategory = attributeValues?.reduce((acc, value) => {
    if (isSizeWithCategories && value.size_category) {
      if (!acc[value.size_category]) acc[value.size_category] = [];
      acc[value.size_category].push(value);
    } else {
      if (!acc['default']) acc['default'] = [];
      acc['default'].push(value);
    }
    return acc;
  }, {} as Record<string, typeof attributeValues>);

  const categoryLabels: Record<string, string> = {
    adulto: 'Adulto',
    calca: 'Calça',
    infantil: 'Infantil',
    default: '',
  };

  // For size attributes, ensure all categories appear even if empty
  const allCategories = isSizeWithCategories
    ? SIZE_CATEGORIES.map(c => c.value).reduce((acc, cat) => {
        acc[cat] = valuesByCategory?.[cat] || [];
        return acc;
      }, {} as Record<string, typeof attributeValues>)
    : null;

  const categoriesToRender = isSizeWithCategories
    ? { ...(allCategories || {}), ...(valuesByCategory?.['default'] ? { default: valuesByCategory['default'] } : {}) }
    : valuesByCategory;

  const renderAddValueInline = (category?: string) => {
    const isActive = addingInCategory === (category || '__global__');
    if (!isActive) {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full border-dashed border mt-2"
          onClick={() => setAddingInCategory(category || '__global__')}
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar valor
        </Button>
      );
    }
    return (
      <div className="space-y-2 mt-2">
        <div className="flex gap-2 items-center">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Novo valor"
            onKeyDown={(e) => e.key === "Enter" && handleAddValue(category)}
            autoFocus
            className="h-8 text-sm"
          />
          {attribute.type === "color" && (
            <HexColorPicker value={newColorHex} onChange={setNewColorHex} swatchOnly />
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleAddValue(category)} size="sm" className="h-7 text-xs" disabled={!newValue.trim()}>
            <Check className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
          <Button onClick={() => { setAddingInCategory(null); setNewValue(""); }} variant="outline" size="sm" className="h-7 text-xs">
            Cancelar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{attribute.name}</span>
          <Badge variant="secondary" className="text-xs">
            {attribute.type === 'color' ? 'Cor' : attribute.type === 'size' ? 'Tamanho' : 'Personalizado'}
          </Badge>
        </div>
        {selectedValues.length > 0 && (
          <Badge variant="default">{selectedValues.length} selecionados</Badge>
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {categoriesToRender && Object.entries(categoriesToRender).map(([category, values]) => {
            if (category === 'default' && (!values || values.length === 0) && isSizeWithCategories) return null;

            return (
              <div key={category}>
                {category !== 'default' && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {categoryLabels[category] || category}
                    </span>
                    {values && values.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectAllCategory(values.map(v => v.id))}
                        className="h-7 text-xs"
                      >
                        {values.every(v => selectedValues.includes(v.id)) ? 'Desmarcar' : 'Selecionar'} todos
                      </Button>
                    )}
                  </div>
                )}
                
                {values && values.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {values.map((value) => (
                      <div key={value.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`sel-${value.id}`}
                          checked={selectedValues.includes(value.id)}
                          onCheckedChange={() => onValueToggle(value.id)}
                        />
                        <Label
                          htmlFor={`sel-${value.id}`}
                          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                        >
                          {value.color_hex && (
                            <div
                              className="w-4 h-4 rounded-full border shrink-0"
                              style={{ backgroundColor: value.color_hex }}
                            />
                          )}
                          <span className="truncate">{value.value}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Per-category add button for size attributes */}
                {isSizeWithCategories && category !== 'default' && renderAddValueInline(category)}
              </div>
            );
          })}

          {/* Global add button for non-size attributes */}
          {!isSizeWithCategories && renderAddValueInline()}
        </div>
      )}
    </div>
  );
};

