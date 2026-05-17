import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import { Sparkles, Info } from 'lucide-react';

interface ProductDimensionsProps {
  weight: string | number;
  length: string | number;
  width: string | number;
  height: string | number;
  onWeightChange: (value: string | number) => void;
  onLengthChange: (value: string | number) => void;
  onWidthChange: (value: string | number) => void;
  onHeightChange: (value: string | number) => void;
  onGenerateDimensions?: () => void;
  isGenerating?: boolean;
  hasVariations?: boolean;
}

export const ProductDimensions = ({
  weight,
  length,
  width,
  height,
  onWeightChange,
  onLengthChange,
  onWidthChange,
  onHeightChange,
  onGenerateDimensions,
  isGenerating,
  hasVariations,
}: ProductDimensionsProps) => {
  if (hasVariations) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm space-y-3">
        <h3 className="font-semibold">Peso e dimensões</h3>
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            O peso e as dimensões são controlados individualmente em cada variação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Peso e dimensões</h3>
        </div>
        {onGenerateDimensions && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onGenerateDimensions}
            disabled={isGenerating}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {isGenerating ? 'Gerando...' : 'Gerar com IA'}
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label htmlFor="weight" className="text-sm">Peso (kg)</Label>
          <CurrencyInput
            id="weight"
            decimals={3}
            value={weight}
            onChange={onWeightChange}
            placeholder="0,000"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="length" className="text-sm">Comprimento (cm)</Label>
          <Input
            id="length"
            type="number"
            min="0"
            value={length === 0 ? '' : length}
            onChange={(e) => onLengthChange(e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="width" className="text-sm">Largura (cm)</Label>
          <Input
            id="width"
            type="number"
            min="0"
            value={width === 0 ? '' : width}
            onChange={(e) => onWidthChange(e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="height" className="text-sm">Altura (cm)</Label>
          <Input
            id="height"
            type="number"
            min="0"
            value={height === 0 ? '' : height}
            onChange={(e) => onHeightChange(e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
};
