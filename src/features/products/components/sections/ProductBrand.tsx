import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Brand {
  id: string;
  name: string;
  slug: string;
}

interface ProductBrandProps {
  brand: string;
  onBrandChange: (brand: string) => void;
  storeId: string;
}

export const ProductBrand = ({ brand, onBrandChange, storeId }: ProductBrandProps) => {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('store_id', storeId)
        .order('name');
      if (!error && data) setBrands(data);
    };
    fetchBrands();
  }, [storeId]);

  const handleAddBrand = async () => {
    if (!newBrand.trim() || !storeId) return;
    setLoading(true);
    
    const slug = newBrand.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const { data, error } = await supabase
      .from('brands')
      .insert({ store_id: storeId, name: newBrand.trim(), slug })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao criar marca', description: error.message, variant: 'destructive' });
    } else if (data) {
      setBrands(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      onBrandChange(data.name);
      toast({ title: 'Marca criada!', description: `"${data.name}" foi adicionada.` });
    }
    
    setNewBrand('');
    setShowAddNew(false);
    setLoading(false);
  };

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Marca</h3>

      {showAddNew ? (
        <div className="space-y-2">
          <Input
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            placeholder="Nome da marca"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddBrand();
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAddBrand}
              disabled={!newBrand.trim() || loading}
            >
              {loading ? 'Salvando...' : 'Adicionar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddNew(false);
                setNewBrand('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Select value={brand} onValueChange={onBrandChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma marca" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => setShowAddNew(true)}
            className="text-sm text-primary hover:underline mt-3 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar nova marca
          </button>
        </>
      )}
    </div>
  );
};
