import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ProductStatusProps {
  isActive: boolean;
  onStatusChange: (value: boolean) => void;
}

export const ProductStatus = ({ isActive, onStatusChange }: ProductStatusProps) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold mb-4">Status</h3>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="status" className="font-medium">
            {isActive ? 'Produto ativo' : 'Produto inativo'}
          </Label>
          <p className="text-sm text-muted-foreground">
            {isActive ? 'Visível na loja' : 'Oculto da loja'}
          </p>
        </div>
        <Switch
          id="status"
          checked={isActive}
          onCheckedChange={onStatusChange}
        />
      </div>
    </div>
  );
};
