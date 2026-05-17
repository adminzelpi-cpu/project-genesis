import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProductInventoryProps {
  stockQuantity: string | number | null;
  onStockChange: (value: string | number | null) => void;
  hasVariations?: boolean;
}

export const ProductInventory = ({
  stockQuantity,
  onStockChange,
  hasVariations = false,
}: ProductInventoryProps) => {
  const isInfinite = stockQuantity === null || stockQuantity === '' || stockQuantity === undefined;
  const [unlimited, setUnlimited] = useState(isInfinite);

  useEffect(() => {
    const newIsInfinite = stockQuantity === null || stockQuantity === '' || stockQuantity === undefined;
    setUnlimited(newIsInfinite);
  }, [stockQuantity]);

  const handleUnlimitedToggle = (checked: boolean) => {
    setUnlimited(checked);
    if (checked) {
      onStockChange(null);
    } else {
      onStockChange(0);
    }
  };

  if (hasVariations) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm space-y-3">
        <h3 className="font-semibold">Inventário</h3>
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Este produto possui variações. O estoque é controlado individualmente em cada variação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-4">
      <h3 className="font-semibold">Inventário</h3>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Estoque ilimitado</Label>
          <p className="text-sm text-muted-foreground">
            Produto sempre disponível, sem controle de quantidade
          </p>
        </div>
        <Switch
          checked={unlimited}
          onCheckedChange={handleUnlimitedToggle}
        />
      </div>

      {!unlimited && (
        <div>
          <Label htmlFor="stock">Quantidade em estoque</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={stockQuantity === null ? '' : stockQuantity}
            onChange={(e) => onStockChange(e.target.value === '' ? 0 : parseInt(e.target.value))}
            placeholder="0"
            className="mt-1.5"
          />
        </div>
      )}
    </div>
  );
};
