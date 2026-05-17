import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wand2 } from "lucide-react";
import { generateSKU } from "./skuUtils";
import { AttributeSelectorWithCategories } from "./AttributeSelectorWithCategories";
import { HierarchicalVariationsList } from "./HierarchicalVariationsList";
import { VariationEditModal } from "./VariationEditModal";
import { ImageUploadModal } from "./ImageUploadModal";
import { useAttributes } from "@/features/attributes/hooks/useAttributes";
import { ProductVariation, AttributeValue } from "@/features/attributes/types";
import { supabase } from "@/integrations/supabase/client";
import { duplicateVariation, getVariationsToDelete } from "./useHierarchicalVariations";
import { toast } from "sonner";

interface ProductVariationsManagerProps {
  storeId: string;
  productId?: string;
  productCode?: number | null;
  variations: ProductVariation[];
  onChange: (variations: ProductVariation[]) => void;
  basePrice: number;
  productName?: string;
}

export const ProductVariationsManager = ({
  storeId,
  productId,
  productCode,
  variations,
  onChange,
  basePrice,
  productName,
}: ProductVariationsManagerProps) => {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const [showAttributeSelector, setShowAttributeSelector] = useState(false);
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);
  const [imageUploadVariation, setImageUploadVariation] = useState<ProductVariation | null>(null);
  const { attributes } = useAttributes(storeId);
  const [allAttributeValues, setAllAttributeValues] = useState<AttributeValue[]>([]);

  // Pre-populate selectedAttributes from existing variations
  useEffect(() => {
    if (variations.length > 0 && Object.keys(selectedAttributes).length === 0) {
      const attrMap: Record<string, Set<string>> = {};
      variations.forEach(v => {
        Object.entries(v.attributes || {}).forEach(([attrId, valueId]) => {
          if (!attrMap[attrId]) attrMap[attrId] = new Set();
          attrMap[attrId].add(valueId);
        });
      });
      const populated: Record<string, string[]> = {};
      Object.entries(attrMap).forEach(([k, v]) => { populated[k] = Array.from(v); });
      setSelectedAttributes(populated);
    }
  }, [variations.length]); // only on mount / when variations first load

  // Carregar valores dos atributos selecionados e usados nas variações
  useEffect(() => {
    const loadAttributeValues = async () => {
      const selectedAttrIds = Object.keys(selectedAttributes);
      const variationAttrIds = Array.from(
        new Set(variations.flatMap(v => Object.keys(v.attributes || {})))
      );
      const attributeIds = Array.from(new Set([...selectedAttrIds, ...variationAttrIds]));
      
      if (attributeIds.length === 0) {
        setAllAttributeValues([]);
        return;
      }
      
      const { data, error } = await supabase
        .from("attribute_values")
        .select("*")
        .in("attribute_id", attributeIds);
      
      if (!error && data) {
        setAllAttributeValues(data as AttributeValue[]);
      }
    };
    
    loadAttributeValues();
  }, [selectedAttributes, variations]);

  const handleGenerateVariations = () => {
    const combinations = generateCombinations(selectedAttributes);
    
    // Keep existing variations, only add truly new combinations
    const existingKeys = new Set(
      variations.map(v => variationKey(v.attributes || {}))
    );
    
    const newCombinations = combinations.filter(
      combo => !existingKeys.has(variationKey(combo))
    );
    
    if (newCombinations.length === 0) {
      toast.info("Todas as combinações selecionadas já existem.");
      return;
    }
    
    const newVariations = newCombinations.map((combo) => ({
      product_id: productId,
      sku: generateSKU(combo, allAttributeValues, productCode),
      price: basePrice,
      stock_quantity: null,
      attributes: combo,
      is_active: true,
      is_parent: false,
      parent_id: undefined,
    }));
    
    onChange([...variations, ...newVariations]);
    toast.success(`${newVariations.length} nova(s) variação(ões) adicionada(s)!`);
  };

  const handleVariationUpdate = (index: number, field: string, value: any) => {
    const updated = [...variations];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleEditVariation = (variation: ProductVariation) => {
    setEditingVariation(variation);
  };

  const handleSaveVariation = (updated: ProductVariation, applyToAllFields?: string[]) => {
    if (applyToAllFields && applyToAllFields.length > 0) {
      // Aplicar campos selecionados para TODAS as variações
      const newVariations = variations.map(v => {
        const updates: any = {};
        
        applyToAllFields.forEach(field => {
          if (field === 'dimensions') {
            // Aplicar peso e dimensões
            updates.weight = (updated as any).weight;
            updates.length = (updated as any).length;
            updates.width = (updated as any).width;
            updates.height = (updated as any).height;
          } else {
            // Aplicar campo individual (price, sale_price)
            updates[field] = (updated as any)[field];
          }
        });
        
        return { ...v, ...updates };
      });
      
      onChange(newVariations);
      toast.success(`Alterações aplicadas para ${variations.length} variações!`);
    } else {
      // Aplicar apenas para a variação específica
      const newVariations = variations.map(v => 
        v.id === updated.id ? updated : v
      );
      onChange(newVariations);
    }
    
    setEditingVariation(null);
  };

  const handleDuplicateVariation = (variation: ProductVariation) => {
    const duplicated = duplicateVariation(variation, variations);
    onChange([...variations, ...duplicated]);
  };

  const handleDeleteVariation = (variation: ProductVariation) => {
    const idsToDelete = getVariationsToDelete(variation, variations);
    const updated = variations.filter(v => !idsToDelete.includes(v.id!));
    onChange(updated);
  };

  const handleImageClick = (variation: ProductVariation) => {
    setImageUploadVariation(variation);
  };

  const handleImagesSave = (
    newImages: Array<{ url: string; is_primary: boolean }>,
    selectedAttributeIds?: string[]
  ) => {
    if (!imageUploadVariation) return;

    // Flag especial para aplicar em TODAS as variações
    if (selectedAttributeIds?.includes('__ALL_VARIATIONS__')) {
      const updatedVariations = variations.map((v) => {
        const imagesCopy = newImages.map(img => ({ ...img }));
        return { ...v, images: imagesCopy };
      });
      
      onChange(updatedVariations);
      toast.success(`Imagens aplicadas em todas as ${variations.length} variação(ões)`);
      setImageUploadVariation(null);
      return;
    }

    if (selectedAttributeIds && selectedAttributeIds.length > 0) {
      // Aplicar para todas as variações que tenham TODOS os atributos selecionados com os mesmos valores
      const targetValues: Record<string, string> = {};
      selectedAttributeIds.forEach(attrId => {
        const valueId = imageUploadVariation.attributes?.[attrId];
        if (valueId) {
          targetValues[attrId] = valueId;
        }
      });
      
      const updatedVariations = variations.map((v) => {
        // Verifica se TODOS os atributos selecionados têm os mesmos valores
        const matchesAllAttributes = selectedAttributeIds.every(attrId => 
          v.attributes?.[attrId] === targetValues[attrId]
        );
        
        if (matchesAllAttributes) {
          // Fazer uma cópia profunda das imagens para cada variação
          const imagesCopy = newImages.map(img => ({ ...img }));
          return { ...v, images: imagesCopy };
        }
        return v;
      });
      
      onChange(updatedVariations);
      
      // Contar quantas variações foram afetadas
      const affectedCount = updatedVariations.filter(v =>
        selectedAttributeIds.every(attrId => v.attributes?.[attrId] === targetValues[attrId])
      ).length;
      
      toast.success(`Imagens aplicadas em ${affectedCount} variação(ões) similar(es)`);
    } else {
      // Aplicar apenas para a variação atual
      const updatedVariations = variations.map((v) => {
        const sameById = v.id && imageUploadVariation.id && v.id === imageUploadVariation.id;
        const sameByAttrs = !v.id && !imageUploadVariation.id &&
          JSON.stringify(v.attributes || {}) === JSON.stringify(imageUploadVariation.attributes || {});
        if (sameById || sameByAttrs) {
          const imagesCopy = newImages.map(img => ({ ...img }));
          return { ...v, images: imagesCopy };
        }
        return v;
      });
      onChange(updatedVariations);
    }

    setImageUploadVariation(null);
  };

  const handleUpdateField = (variation: ProductVariation, field: string, value: any) => {
    const updated = variations.map(v => 
      v.id === variation.id 
        ? { ...v, [field]: value } 
        : v
    );
    onChange(updated);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Variações do Produto</h3>
          <p className="text-sm text-muted-foreground">
            Configure cores, tamanhos e outras variações. Upload de imagens é feito aqui, não na seção de imagens.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowAttributeSelector(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Atributos
        </Button>
      </div>

      {Object.keys(selectedAttributes).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {Object.entries(selectedAttributes).map(([attrId, values]) => {
                const attr = attributes?.find(a => a.id === attrId);
                return (
                  <span key={attrId} className="mr-4">
                    <strong>{attr?.name}:</strong> {values.length} selecionados
                  </span>
                );
              })}
            </div>
            <Button onClick={handleGenerateVariations}>
              <Wand2 className="h-4 w-4 mr-2" />
              {variations.length > 0
                ? `Adicionar Variações (${countNewCombinations(selectedAttributes, variations)})`
                : `Gerar Variações (${countCombinations(selectedAttributes)})`
              }
            </Button>
          </div>
        </div>
      )}

      {variations.length > 0 && (
        <>
          <HierarchicalVariationsList
            variations={variations}
            attributes={attributes || []}
            attributeValues={allAttributeValues}
            onEdit={handleEditVariation}
            onDuplicate={handleDuplicateVariation}
            onDelete={handleDeleteVariation}
            onDeleteMany={(toDelete) => {
              const idsToRemove = new Set(toDelete.map(v => v.id));
              onChange(variations.filter(v => !idsToRemove.has(v.id)));
            }}
            onImageClick={handleImageClick}
            onUpdateField={handleUpdateField}
          />
        </>
      )}

      {variations.length === 0 && Object.keys(selectedAttributes).length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Adicione atributos para criar variações do produto</p>
          <p className="text-xs mt-2">Ex: Cores, Tamanhos, Voltagem, Capacidade, etc</p>
        </div>
      )}

      <AttributeSelectorWithCategories
        open={showAttributeSelector}
        onOpenChange={setShowAttributeSelector}
        storeId={storeId}
        selectedAttributes={selectedAttributes}
        onAttributesChange={setSelectedAttributes}
      />

      {editingVariation && (
        <VariationEditModal
          open={!!editingVariation}
          onOpenChange={(open) => !open && setEditingVariation(null)}
          variation={editingVariation}
          onSave={handleSaveVariation}
          storeId={storeId}
          attributeValues={allAttributeValues}
          productCode={productCode}
        />
      )}

      {imageUploadVariation && (
        <ImageUploadModal
          open={!!imageUploadVariation}
          onOpenChange={(open) => !open && setImageUploadVariation(null)}
          images={Array.isArray(imageUploadVariation.images) ? imageUploadVariation.images : (() => { try { return typeof imageUploadVariation.images === 'string' ? JSON.parse(imageUploadVariation.images) : []; } catch { return []; } })()}
          onSave={handleImagesSave}
          variationAttributes={imageUploadVariation.attributes}
          attributes={attributes}
          attributeValues={allAttributeValues}
          storeId={storeId}
          productName={productName}
        />
      )}
    </Card>
  );
};

// Utilitários
function variationKey(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
}

function generateCombinations(
  selectedAttributes: Record<string, string[]>
): Record<string, string>[] {
  const attrIds = Object.keys(selectedAttributes);
  if (attrIds.length === 0) return [];

  const combine = (index: number, current: Record<string, string>): Record<string, string>[] => {
    if (index === attrIds.length) return [current];

    const attrId = attrIds[index];
    const values = selectedAttributes[attrId];
    const results: Record<string, string>[] = [];

    values.forEach(valueId => {
      const newCurrent = { ...current, [attrId]: valueId };
      results.push(...combine(index + 1, newCurrent));
    });

    return results;
  };

  return combine(0, {});
}

// COLOR_ABBREV, abbreviateValue, generateSKU moved to skuUtils.ts

function countCombinations(selectedAttributes: Record<string, string[]>): number {
  return Object.values(selectedAttributes).reduce(
    (acc, values) => acc * values.length,
    1
  );
}

function countNewCombinations(
  selectedAttributes: Record<string, string[]>,
  existingVariations: ProductVariation[]
): number {
  const combinations = generateCombinations(selectedAttributes);
  const existingKeys = new Set(
    existingVariations.map(v => variationKey(v.attributes || {}))
  );
  return combinations.filter(c => !existingKeys.has(variationKey(c))).length;
}
