import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, ChevronRight, ChevronDown, Pencil, Check, X } from 'lucide-react';
import { useCategories } from '@/features/categories/hooks/useCategories';
import type { ProductCategory } from '@/features/categories/types';

interface ProductCategoriesProps {
  storeId: string;
  selectedCategoryIds?: string[];
  onCategoriesChange: (categoryIds: string[]) => void;
  validationError?: boolean;
}

export const ProductCategories = ({
  storeId,
  selectedCategoryIds = [],
  onCategoriesChange,
  validationError = false,
}: ProductCategoriesProps) => {
  const { getStoreCategories, createCategory, updateCategoryName } = useCategories();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadCategories = async () => {
    if (!storeId || storeId === 'null' || storeId === 'undefined') return;
    const data = await getStoreCategories(storeId);
    setCategories(data);
    return data;
  };

  useEffect(() => {
    loadCategories();
  }, [storeId]);

  // Auto-open add form when validation error and no categories
  useEffect(() => {
    if (validationError && categories.length === 0) {
      setShowAddNew(true);
    }
  }, [validationError, categories.length]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setLoading(true);
    try {
      await createCategory({
        store_id: storeId,
        name: newCategoryName,
        slug: newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        is_active: true,
      });
      
      setNewCategoryName('');
      setShowAddNew(false);
      await loadCategories();
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (category: ProductCategory) => {
    setEditingCategoryId(category.id);
    setEditingName(category.name);
  };

  const handleSaveEdit = async () => {
    if (!editingCategoryId || !editingName.trim()) return;
    setLoading(true);
    try {
      await updateCategoryName(editingCategoryId, editingName.trim());
      await loadCategories();
    } finally {
      setEditingCategoryId(null);
      setEditingName('');
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditingName('');
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (category: ProductCategory, level = 0) => {
    const hasChildren = categories.some(c => c.parent_id === category.id);
    const isExpanded = expandedCategories.has(category.id);
    const children = categories.filter(c => c.parent_id === category.id);
    const isEditing = editingCategoryId === category.id;

    return (
      <div key={category.id}>
        <div 
          className="flex items-center gap-2 py-2 hover:bg-muted/50 rounded px-2 group"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleExpand(category.id)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          <Checkbox
            id={category.id}
            checked={selectedCategoryIds.includes(category.id)}
            onCheckedChange={(checked) => {
              if (checked) {
                onCategoriesChange([...selectedCategoryIds, category.id]);
              } else {
                onCategoriesChange(selectedCategoryIds.filter(id => id !== category.id));
              }
            }}
          />

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="h-7 text-sm py-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button type="button" onClick={handleSaveEdit} className="p-1 hover:bg-muted rounded text-primary">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={handleCancelEdit} className="p-1 hover:bg-muted rounded text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Label
                htmlFor={category.id}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {category.name}
              </Label>
              <button
                type="button"
                onClick={() => handleStartEdit(category)}
                className="p-1 hover:bg-muted rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootCategories = categories.filter(c => !c.parent_id);

  return (
    <div className={`bg-card rounded-lg p-6 shadow-sm ${validationError ? 'ring-2 ring-destructive' : ''}`}>
      <h3 className="font-semibold mb-4">Categorias *</h3>

      {validationError && selectedCategoryIds.length === 0 && (
        <p className="text-xs text-destructive mb-3">
          {rootCategories.length === 0
            ? 'Crie pelo menos uma categoria abaixo para poder salvar o produto.'
            : 'Selecione pelo menos uma categoria para salvar o produto.'}
        </p>
      )}

      {showAddNew && (
        <div className="mb-4 space-y-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nome da categoria"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAddCategory}
              disabled={loading || !newCategoryName.trim()}
            >
              Adicionar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddNew(false);
                setNewCategoryName('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-1">
        {rootCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma categoria criada
          </p>
        ) : (
          rootCategories.map(category => renderCategory(category))
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowAddNew(!showAddNew)}
        className={`text-sm hover:underline mt-3 flex items-center gap-1 ${
          validationError && rootCategories.length === 0
            ? 'text-destructive font-medium animate-pulse'
            : 'text-primary'
        }`}
      >
        <Plus className="h-3.5 w-3.5" />
        {rootCategories.length === 0 ? 'Criar primeira categoria' : 'Adicionar nova categoria'}
      </button>
    </div>
  );
};
