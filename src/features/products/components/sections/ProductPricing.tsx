import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Info, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import type { ProductVariation } from '@/features/attributes';

interface ProductPricingProps {
  price: string | number;
  salePrice: string | number;
  onPriceChange: (value: string | number) => void;
  onSalePriceChange: (value: string | number) => void;
  hasVariations?: boolean;
  variations?: ProductVariation[];
  validationError?: boolean;
}

export const ProductPricing = ({
  price,
  salePrice,
  onPriceChange,
  onSalePriceChange,
  hasVariations,
  variations = [],
  validationError,
}: ProductPricingProps) => {
  if (hasVariations && variations.length > 0) {
    const prices = variations.filter(v => v.price && v.price > 0).map(v => v.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return (
      <div className="bg-card rounded-lg p-6 shadow-sm space-y-3">
        <h3 className="font-semibold">Preço</h3>
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p>Os preços são controlados individualmente em cada variação.</p>
            {prices.length > 0 && (
              <p className="mt-1 font-medium text-foreground">
                {minPrice === maxPrice 
                  ? `R$ ${minPrice.toFixed(2).replace('.', ',')}`
                  : `R$ ${minPrice.toFixed(2).replace('.', ',')} — R$ ${maxPrice.toFixed(2).replace('.', ',')}`
                }
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg p-6 shadow-sm space-y-4 ${validationError ? 'ring-2 ring-destructive' : ''}`}>
      <h3 className="font-semibold">Preço</h3>
      {validationError && (
        <p className="text-sm text-destructive">Informe o preço do produto antes de salvar.</p>
      )}
      {(() => {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        const numSale = typeof salePrice === 'string' ? parseFloat(salePrice) : salePrice;
        const showWarning = numSale > 0 && numPrice > 0 && numSale >= numPrice;
        return showWarning ? (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            O preço promocional deve ser menor que o preço normal.
          </div>
        ) : null;
      })()}
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Preço *</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R$
            </span>
            <CurrencyInput
              id="price"
              value={price}
              onChange={onPriceChange}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="sale_price">Preço Promocional</Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              R$
            </span>
            <CurrencyInput
              id="sale_price"
              value={salePrice}
              onChange={onSalePriceChange}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
