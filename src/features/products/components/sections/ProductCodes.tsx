import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info, Wand2 } from 'lucide-react';

interface ProductCodesProps {
  hasVariations?: boolean;
  sku?: string;
  barcode?: string;
  productCode?: number | null;
  onSkuChange?: (value: string) => void;
  onBarcodeChange?: (value: string) => void;
}

function generateSimpleSKU(productCode?: number | null): string {
  const code = productCode ? String(productCode).padStart(3, '0') : '000';
  return `PRD-${code}`;
}

export const ProductCodes = ({
  hasVariations = false,
  sku = '',
  barcode = '',
  productCode,
  onSkuChange,
  onBarcodeChange,
}: ProductCodesProps) => {
  if (hasVariations) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm space-y-3">
        <h3 className="font-semibold">Códigos</h3>
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Os códigos (SKU, GTIN, etc.) são controlados individualmente em cada variação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-4">
      <h3 className="font-semibold">Códigos</h3>
      
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="sku">SKU (Unidade de Manutenção de Estoque)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSkuChange?.(generateSimpleSKU(productCode))}
          >
            <Wand2 className="h-3 w-3 mr-1" />
            Gerar SKU
          </Button>
        </div>
        <Input
          id="sku"
          value={sku}
          onChange={(e) => onSkuChange?.(e.target.value)}
          placeholder="PRD-001"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="barcode">Código de barras (ISBN, UPC, GTIN, etc.)</Label>
        <Input
          id="barcode"
          value={barcode}
          onChange={(e) => onBarcodeChange?.(e.target.value)}
          placeholder="123456789"
          className="mt-1.5"
        />
      </div>
    </div>
  );
};
