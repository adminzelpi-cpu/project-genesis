import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { CategoryDialog } from './CategoryDialog';
import { useCategories } from '../hooks/useCategories';
import type { ProductCategory } from '../types';

interface CategorySelectorProps {
  storeId: string;
  value?: string;
  onChange: (categoryId: string | undefined) => void;
}

export const CategorySelector = ({ storeId, value, onChange }: CategorySelectorProps) => {
  const { getStoreCategories } = useCategories();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCategories = async () => {
    setLoading(true);
    const data = await getStoreCategories(storeId);
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, [storeId]);

  const handleSuccess = () => {
    loadCategories();
  };

  if (loading) {
    return (
      <div>
        <Label>Categoria</Label>
        <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <>
        <div className="space-y-2">
          <Label>Categorias</Label>
          <div className="border rounded-lg p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Você vai ajudar seus clientes a encontrarem seus produtos mais rapidamente!
            </p>
            <Button 
              type="button" 
              onClick={() => setShowDialog(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Categorias
            </Button>
          </div>
        </div>

        <CategoryDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onSuccess={handleSuccess}
          storeId={storeId}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Categoria</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>

        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CategoryDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSuccess={handleSuccess}
        storeId={storeId}
      />
    </>
  );
};
