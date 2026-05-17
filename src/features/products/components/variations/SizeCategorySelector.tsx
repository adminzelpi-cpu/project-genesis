import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AttributeValue } from "@/features/attributes/types";

interface SizeCategorySelectorProps {
  values: AttributeValue[];
  selectedValues: string[];
  onValueToggle: (valueId: string) => void;
}

const SIZE_CATEGORY_LABELS: Record<string, string> = {
  adulto: "Adulto",
  calca: "Calça",
  infantil: "Infantil",
};

export const SizeCategorySelector = ({
  values,
  selectedValues,
  onValueToggle,
}: SizeCategorySelectorProps) => {
  // Agrupar valores por categoria
  const valuesByCategory = values.reduce((acc, value) => {
    const category = value.size_category || "outros";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(value);
    return acc;
  }, {} as Record<string, AttributeValue[]>);

  const handleSelectAllInCategory = (category: string) => {
    const categoryValues = valuesByCategory[category];
    const allSelected = categoryValues.every((v) =>
      selectedValues.includes(v.id)
    );

    if (allSelected) {
      // Desmarcar todos da categoria
      categoryValues.forEach((v) => {
        if (selectedValues.includes(v.id)) {
          onValueToggle(v.id);
        }
      });
    } else {
      // Marcar todos da categoria
      categoryValues.forEach((v) => {
        if (!selectedValues.includes(v.id)) {
          onValueToggle(v.id);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(valuesByCategory).map(([category, categoryValues]) => {
        const allSelected = categoryValues.every((v) =>
          selectedValues.includes(v.id)
        );
        const someSelected = categoryValues.some((v) =>
          selectedValues.includes(v.id)
        );

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">
                  {SIZE_CATEGORY_LABELS[category] || category}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {categoryValues.length} valores
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectAllInCategory(category)}
              >
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {categoryValues.map((value) => (
                <div
                  key={value.id}
                  className="flex items-center space-x-2 rounded-md border p-3 hover:bg-accent"
                >
                  <Checkbox
                    id={value.id}
                    checked={selectedValues.includes(value.id)}
                    onCheckedChange={() => onValueToggle(value.id)}
                  />
                  <Label
                    htmlFor={value.id}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {value.value}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
