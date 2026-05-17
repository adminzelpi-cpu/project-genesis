import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAttributes, useAttributeValues } from "@/features/attributes";
import { useActiveStore } from "@/features/stores";
import { ChevronLeft, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddVariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAttribute: (attributeId: string, selectedValues: string[]) => void;
}

export const AddVariationDialog = ({
  open,
  onOpenChange,
  onAddAttribute,
}: AddVariationDialogProps) => {
  const { store } = useActiveStore();
  const { attributes } = useAttributes(store?.id);
  const [selectedAttributeId, setSelectedAttributeId] = useState<string>("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#000000");

  const selectedAttribute = attributes?.find((a) => a.id === selectedAttributeId);

  const handleBack = () => {
    setSelectedAttributeId("");
    setSelectedValues([]);
    setCustomValue("");
  };

  const handleSelectAttribute = (attrId: string) => {
    setSelectedAttributeId(attrId);
    setSelectedValues([]);
  };

  const handleToggleValue = (valueId: string) => {
    setSelectedValues((prev) =>
      prev.includes(valueId)
        ? prev.filter((v) => v !== valueId)
        : [...prev, valueId]
    );
  };

  const handleConfirm = () => {
    if (selectedAttributeId && selectedValues.length > 0) {
      onAddAttribute(selectedAttributeId, selectedValues);
      handleBack();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {!selectedAttributeId ? (
          <>
            <DialogHeader>
              <DialogTitle>Nova propriedade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Propriedade</Label>
                <Select onValueChange={handleSelectAttribute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {attributes?.map((attr) => (
                      <SelectItem key={attr.id} value={attr.id}>
                        {attr.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="new">Nova...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        ) : (
          <AttributeValueSelector
            attribute={selectedAttribute!}
            selectedValues={selectedValues}
            onToggleValue={handleToggleValue}
            onBack={handleBack}
            onConfirm={handleConfirm}
            customValue={customValue}
            setCustomValue={setCustomValue}
            customColorHex={customColorHex}
            setCustomColorHex={setCustomColorHex}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

interface AttributeValueSelectorProps {
  attribute: any;
  selectedValues: string[];
  onToggleValue: (valueId: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  customValue: string;
  setCustomValue: (value: string) => void;
  customColorHex: string;
  setCustomColorHex: (value: string) => void;
}

interface HandleSelectAllProps {
  categoryValues: any[];
  selectedValues: string[];
  onToggleValue: (valueId: string) => void;
}

const AttributeValueSelector = ({
  attribute,
  selectedValues,
  onToggleValue,
  onBack,
  onConfirm,
  customValue,
  setCustomValue,
  customColorHex,
  setCustomColorHex,
}: AttributeValueSelectorProps) => {
  const { values } = useAttributeValues(attribute.id);

  // Agrupar tamanhos por categoria
  const getSizesByCategory = () => {
    if (attribute.type !== "size") return null;

    const adultoSizes = ["PP", "P", "M", "G", "GG", "XG"];
    const infantilSizes = ["2", "4", "6", "8", "10", "12", "14", "16"];
    const calcasSizes = ["36", "38", "40", "42", "44", "46", "48"];

    const categorized = {
      adulto: values?.filter((v) => adultoSizes.includes(v.value)) || [],
      infantil: values?.filter((v) => infantilSizes.includes(v.value)) || [],
      calcas: values?.filter((v) => calcasSizes.includes(v.value)) || [],
    };

    return categorized;
  };

  const sizeCategories = getSizesByCategory();

  const handleSelectAll = (category: string) => {
    if (!sizeCategories) return;
    const categoryValues = sizeCategories[category as keyof typeof sizeCategories];
    const categoryIds = categoryValues.map((v) => v.id);
    
    // Se todos já estão selecionados, desmarca todos. Senão, marca todos.
    const allSelected = categoryIds.every((id) => selectedValues.includes(id));
    if (allSelected) {
      categoryIds.forEach((id) => {
        if (selectedValues.includes(id)) {
          onToggleValue(id);
        }
      });
    } else {
      categoryIds.forEach((id) => {
        if (!selectedValues.includes(id)) {
          onToggleValue(id);
        }
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <DialogTitle>Nova propriedade</DialogTitle>
        </div>
      </DialogHeader>

      <ScrollArea className="max-h-[500px] pr-4">
        <div className="space-y-6 py-4">
          {/* Cabeçalho com nome do atributo */}
          <div>
            <Label>Propriedade</Label>
            <div className="mt-2 px-3 py-2 bg-muted rounded-md">
              {attribute.name}
            </div>
          </div>

          {/* Área de selecionados */}
          <div>
            <Label>
              {attribute.type === "color" ? "Cores selecionadas" : "Tamanhos selecionados"}
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              {attribute.type === "color"
                ? "Se você não encontrar a cor que precisa, pode criá-la."
                : "Se você não encontrar o tamanho que precisa, pode criá-lo."}
            </p>
            <div className="min-h-[40px] border rounded-md p-2 flex flex-wrap gap-2">
              {selectedValues.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Nenhum item selecionado
                </span>
              )}
            </div>
          </div>

          {/* Campo para adicionar personalizado */}
          <div>
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => {
                // TODO: implementar lógica de adicionar personalizado
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {attribute.type === "color"
                ? "Adicionar cor personalizada"
                : "Adicionar tamanho personalizado"}
            </Button>
          </div>

          {/* Lista de valores */}
          <div className="space-y-4">
            {attribute.type === "color" ? (
              <div>
                <Label className="mb-3 block">Cores básicas</Label>
                <div className="space-y-2">
                  {values?.map((value) => (
                    <div
                      key={value.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => onToggleValue(value.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: value.color_hex || "#000" }}
                        />
                        <span>{value.value}</span>
                      </div>
                      <Checkbox
                        checked={selectedValues.includes(value.id)}
                        onCheckedChange={() => onToggleValue(value.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : sizeCategories ? (
              <div className="space-y-6">
                <Label>Tamanhos básicos</Label>

                {/* Adultos */}
                {sizeCategories.adulto.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Adultos</span>
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => handleSelectAll("adulto")}
                      >
                        Selecionar tudo
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {sizeCategories.adulto.map((value) => (
                        <div
                          key={value.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => onToggleValue(value.id)}
                        >
                          <span>{value.value}</span>
                          <Checkbox
                            checked={selectedValues.includes(value.id)}
                            onCheckedChange={() => onToggleValue(value.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Crianças */}
                {sizeCategories.infantil.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Crianças</span>
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => handleSelectAll("infantil")}
                      >
                        Selecionar tudo
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {sizeCategories.infantil.map((value) => (
                        <div
                          key={value.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => onToggleValue(value.id)}
                        >
                          <span>{value.value}</span>
                          <Checkbox
                            checked={selectedValues.includes(value.id)}
                            onCheckedChange={() => onToggleValue(value.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calças */}
                {sizeCategories.calcas.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Calças</span>
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => handleSelectAll("calcas")}
                      >
                        Selecionar tudo
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {sizeCategories.calcas.map((value) => (
                        <div
                          key={value.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => onToggleValue(value.id)}
                        >
                          <span>{value.value}</span>
                          <Checkbox
                            checked={selectedValues.includes(value.id)}
                            onCheckedChange={() => onToggleValue(value.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {values?.map((value) => (
                  <div
                    key={value.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => onToggleValue(value.id)}
                  >
                    <span>{value.value}</span>
                    <Checkbox
                      checked={selectedValues.includes(value.id)}
                      onCheckedChange={() => onToggleValue(value.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1"
          onClick={onConfirm}
          disabled={selectedValues.length === 0}
        >
          Confirmar
        </Button>
      </div>
    </>
  );
};
