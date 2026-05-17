import { useState, useMemo } from "react";
import { ProductVariation } from "@/features/attributes/types";
import { ChevronDown, ChevronRight, Edit2, Copy, Trash2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HierarchicalVariationsListProps {
  variations: ProductVariation[];
  attributes: any[];
  attributeValues: any[];
  onEdit: (variation: ProductVariation) => void;
  onDuplicate: (variation: ProductVariation) => void;
  onDelete: (variation: ProductVariation) => void;
  onDeleteMany?: (variations: ProductVariation[]) => void;
  onImageClick: (variation: ProductVariation) => void;
  onUpdateField?: (variation: ProductVariation, field: string, value: any) => void;
}

export const HierarchicalVariationsList = ({
  variations,
  attributes,
  attributeValues,
  onEdit,
  onDuplicate,
  onDelete,
  onDeleteMany,
  onImageClick,
  onUpdateField,
}: HierarchicalVariationsListProps) => {
  const [deleteTarget, setDeleteTarget] = useState<ProductVariation | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Criar mapas para lookup eficiente
  const valueMap = useMemo(() => {
    const map = new Map<string, any>();
    (attributeValues || []).forEach(v => {
      map.set(String(v.id), v);
    });
    return map;
  }, [attributeValues]);

  const attributeMap = useMemo(() => {
    const map = new Map<string, any>();
    (attributes || []).forEach(a => {
      map.set(String(a.id), a);
    });
    return map;
  }, [attributes]);

  // Função para ordenar tamanhos logicamente
  const getSizePriority = (sizeValue: string): number => {
    const value = sizeValue.toUpperCase().trim();
    
    const letterSizes: { [key: string]: number } = {
      'PP': 0, 'P': 1, 'M': 2, 'G': 3, 'GG': 4, 'XG': 5, 'XXG': 6, 'EG': 5, 'EGG': 6
    };
    if (letterSizes[value] !== undefined) return letterSizes[value];
    
    const numMatch = value.match(/^(\d+)$/);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      if (num >= 2 && num <= 14) return num;
      if (num >= 36 && num <= 60) return num;
    }
    
    return 1000 + value.charCodeAt(0);
  };

  const organizedVariations = useMemo(() => {
    const withMetadata = variations.map(v => {
      const entries = Object.entries(v.attributes || {});
      
      const nonSizeAttrs: string[] = [];
      let sizeValue = '';
      
      entries.forEach(([attrId, valueId]) => {
        const attr = attributeMap.get(String(attrId));
        const val = valueMap.get(String(valueId));
        
        if (attr?.type === 'size') {
          sizeValue = val?.value || '';
        } else {
          nonSizeAttrs.push(val?.value || '');
        }
      });
      
      return {
        ...v,
        _children: [],
        _sortKey: nonSizeAttrs.join('/'),
        _sizeValue: sizeValue,
        _sizePriority: sizeValue ? getSizePriority(sizeValue) : 9999,
      };
    });
    
    withMetadata.sort((a, b) => {
      const groupCompare = a._sortKey.localeCompare(b._sortKey);
      if (groupCompare !== 0) return groupCompare;
      return a._sizePriority - b._sizePriority;
    });
    
    return withMetadata;
  }, [variations, attributeMap, valueMap]);

  // Selection helpers
  const allIds = useMemo(() => organizedVariations.map(v => v.id!).filter(Boolean), [organizedVariations]);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (onDeleteMany) {
      const toDelete = variations.filter(v => v.id && selectedIds.has(v.id));
      onDeleteMany(toDelete);
    } else {
      // Fallback: delete one by one
      const toDelete = variations.filter(v => v.id && selectedIds.has(v.id));
      toDelete.forEach(v => onDelete(v));
    }
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const formatPrice = (price: number, salePrice?: number | null) => {
    const formatted = `R$ ${price.toFixed(2).replace('.', ',')}`;
    if (salePrice && salePrice < price) {
      return (
        <div className="flex flex-col gap-1">
          <span className="line-through text-muted-foreground text-sm">{formatted}</span>
          <span className="font-medium text-destructive">
            R$ {salePrice.toFixed(2).replace('.', ',')}
          </span>
        </div>
      );
    }
    return <span className="font-medium">{formatted}</span>;
  };

  const getVariationLabel = (variation: ProductVariation) => {
    const entries = Object.entries(variation.attributes || {});
    
    const items = entries.map(([attrId, valueId]) => {
      const attr = attributeMap.get(String(attrId));
      const val = valueMap.get(String(valueId));
      
      return {
        attrId: String(attrId),
        attrName: attr?.name || "",
        attrType: attr?.type || "custom",
        valueLabel: val?.value || `?${String(valueId)}?`,
      };
    });
    
    items.sort((a, b) => {
      const priority = (type: string) => 
        type === "color" ? 0 : type === "size" ? 2 : 1;
      
      const pa = priority(a.attrType);
      const pb = priority(b.attrType);
      
      if (pa !== pb) return pa - pb;
      return a.attrName.localeCompare(b.attrName);
    });
    
    const labels = items.map(i => i.valueLabel);
    return labels.join("/") || "Variação";
  };

  const safeImages = (raw: any): Array<{ url?: string; is_primary?: boolean }> => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  };

  const getThumbnail = (variation: ProductVariation) => {
    const imgs = safeImages(variation.images);
    if (imgs.length > 0) {
      const primary = imgs.find(img => img.is_primary);
      return primary?.url || imgs[0]?.url;
    }
    return variation.image_url || '/placeholder.svg';
  };

  const handleDelete = (variation: ProductVariation) => {
    setDeleteTarget(variation);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleFieldUpdate = (variation: ProductVariation, field: string, value: string) => {
    if (!onUpdateField) return;
    
    let parsedValue: any = value;
    if (field === 'price' || field === 'sale_price' || field === 'weight') {
      parsedValue = value ? parseFloat(value.replace(',', '.')) : 0;
    } else if (field === 'stock_quantity') {
      parsedValue = value === '' ? null : parseInt(value);
    }
    
    onUpdateField(variation, field, parsedValue);
    setEditingCell(null);
  };

  const EditableCell = ({ 
    variation, 
    field, 
    value, 
    type = 'text',
    suffix = ''
  }: { 
    variation: ProductVariation; 
    field: string; 
    value: any;
    type?: string;
    suffix?: string;
  }) => {
    const isEditing = editingCell?.id === variation.id && editingCell?.field === field;
    const [localValue, setLocalValue] = useState(value?.toString() || '');

    if (isEditing) {
      const isCurrencyField = field === 'price' || field === 'sale_price' || field === 'weight';
      
      if (isCurrencyField) {
        return (
          <CurrencyInput
            value={localValue}
            decimals={field === 'weight' ? 3 : 2}
            onChange={(v) => setLocalValue(String(v))}
            onBlur={() => handleFieldUpdate(variation, field, localValue)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFieldUpdate(variation, field, localValue);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
              }
            }}
            autoFocus
            className="h-8 w-24"
          />
        );
      }

      return (
        <Input
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => handleFieldUpdate(variation, field, localValue)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFieldUpdate(variation, field, localValue);
            } else if (e.key === 'Escape') {
              setEditingCell(null);
            }
          }}
          autoFocus
          className="h-8 w-24"
        />
      );
    }

    const displayValue = (() => {
      if (!value) return '-';
      const isCurrencyField = field === 'price' || field === 'sale_price' || field === 'weight';
      if (isCurrencyField) {
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        if (isNaN(num)) return '-';
        const decimals = field === 'weight' ? 3 : 2;
        return num.toFixed(decimals).replace('.', ',') + suffix;
      }
      return `${value}${suffix}`;
    })();

    return (
      <button
        onClick={() => {
          if (onUpdateField) {
            setEditingCell({ id: variation.id!, field });
            setLocalValue(value?.toString() || '');
          }
        }}
        className="text-muted-foreground hover:text-foreground transition-colors text-left w-full"
      >
        {displayValue}
      </button>
    );
  };

  const VariationRow = ({ variation }: { variation: ProductVariation }) => {
    const isSelected = variation.id ? selectedIds.has(variation.id) : false;

    return (
      <tr className={`border-b transition-colors hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}>
        <td className="p-3 w-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => variation.id && toggleSelect(variation.id)}
          />
        </td>
        <td className="p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onImageClick(variation)}
              className="relative h-14 w-14 rounded border overflow-hidden hover:ring-2 ring-primary transition-all group bg-muted"
            >
              {safeImages(variation.images).length > 0 ? (
                <>
                  <img
                    src={getThumbnail(variation)}
                    alt={getVariationLabel(variation)}
                    className="h-full w-full object-cover"
                  />
                  {safeImages(variation.images).length > 1 && (
                    <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-tl font-medium">
                      +{safeImages(variation.images).length - 1}
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              {safeImages(variation.images).length === 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Adicionar</span>
                </div>
              )}
            </button>
            <span className="font-medium">{getVariationLabel(variation)}</span>
          </div>
        </td>
          <td className="p-3">
            <EditableCell 
              variation={variation} 
              field="price" 
              value={variation.price}
              type="number"
            />
          </td>
          <td className="p-3">
            {variation.stock_quantity === null ? (
              <span className="text-muted-foreground">∞</span>
            ) : (
              <EditableCell 
                variation={variation} 
                field="stock_quantity" 
                value={variation.stock_quantity}
                type="number"
              />
            )}
          </td>
          <td className="p-3">
            <EditableCell 
              variation={variation} 
              field="weight" 
              value={variation.weight}
              type="number"
              suffix=" kg"
            />
          </td>
          <td className="p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(variation)}
                className="h-8 w-8"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDuplicate(variation)}
                className="h-8 w-8"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(variation)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </tr>
      );
    };

  return (
    <>
      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="sticky top-0 z-10 mb-3 bg-primary text-primary-foreground rounded-lg px-4 py-3 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? 'variação selecionada' : 'variações selecionadas'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-7 text-xs"
            >
              Limpar seleção
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir selecionadas
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="p-3 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="text-left p-3 font-medium text-sm">Variação</th>
              <th className="text-left p-3 font-medium text-sm">Preço</th>
              <th className="text-left p-3 font-medium text-sm">Estoque</th>
              <th className="text-left p-3 font-medium text-sm">Peso</th>
              <th className="text-left p-3 font-medium text-sm">Ações</th>
            </tr>
          </thead>
          <tbody>
            {organizedVariations.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Nenhuma variação criada ainda
                </td>
              </tr>
            ) : (
              organizedVariations.map((variation) => (
                <VariationRow key={variation.id} variation={variation} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta variação? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} variações</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} {selectedIds.size === 1 ? 'variação' : 'variações'}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir {selectedIds.size} {selectedIds.size === 1 ? 'variação' : 'variações'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
