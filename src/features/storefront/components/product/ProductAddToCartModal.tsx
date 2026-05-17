import { useState, useEffect, useCallback } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorOption {
  id: string;
  name: string;
  thumbnail: string;
  images: string[];
  colorHex?: string;
  valueCode?: number;
}

interface ProductAddToCartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  productImage: string;
  price: number;
  normalPrice: number;
  availableColors: ColorOption[];
  availableSizes: string[];
  selectedColor: string | null;
  selectedSize: string | null;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
  onAddToCart: (quantity: number) => Promise<void>;
  isAddingToCart: boolean;
  addedToCart: boolean;
  initialQuantity?: number;
  /** @deprecated not used in compact modal */
  hasSizeGuide?: boolean;
  /** @deprecated not used in compact modal */
  onSizeGuideOpen?: () => void;
  /** Generic (non-color, non-size) attributes with their options */
  genericAttributes?: Array<{
    id: string;
    name: string;
    values: Array<{ id: string; name: string }>;
    selectedValue: string | null;
    onSelect: (value: string) => void;
  }>;
}

export function ProductAddToCartModal({
  open,
  onOpenChange,
  productName,
  productImage,
  price,
  normalPrice,
  availableColors,
  availableSizes,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
  onAddToCart,
  isAddingToCart,
  addedToCart,
  hasSizeGuide,
  onSizeGuideOpen,
  genericAttributes,
  initialQuantity = 1,
}: ProductAddToCartModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [highlightMissing, setHighlightMissing] = useState<string[]>([]);
  const [shakeKey, setShakeKey] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuantity(initialQuantity);
      setHighlightMissing([]);
    }
  }, [open]);

  // Get the image for the selected color
  const displayImage = (() => {
    if (selectedColor) {
      const colorObj = availableColors.find(c => c.name === selectedColor);
      if (colorObj?.thumbnail) return colorObj.thumbnail;
    }
    return productImage;
  })();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const discount = price < normalPrice ? Math.round((1 - price / normalPrice) * 100) : 0;

  const handleAddClick = useCallback(async () => {
    const missing: string[] = [];
    // Color is handled on the product page, not in this modal
    if (availableSizes.length > 0 && !selectedSize) missing.push('size');
    genericAttributes?.forEach(attr => {
      if (!attr.selectedValue) missing.push(attr.id);
    });

    if (missing.length > 0) {
      setHighlightMissing(missing);
      setShakeKey(k => k + 1);
      return;
    }

    await onAddToCart(quantity);
  }, [availableColors, availableSizes, selectedColor, selectedSize, genericAttributes, onAddToCart]);

  // Clear highlight when user selects a missing attribute
  useEffect(() => {
    if (highlightMissing.length > 0) {
      const newMissing = highlightMissing.filter(key => {
        if (key === 'color') return !selectedColor;
        if (key === 'size') return !selectedSize;
        const ga = genericAttributes?.find(a => a.id === key);
        return ga ? !ga.selectedValue : false;
      });
      if (newMissing.length < highlightMissing.length) {
        setHighlightMissing(newMissing);
      }
    }
  }, [selectedColor, selectedSize, genericAttributes, highlightMissing]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent aria-describedby={undefined}>
        <VisuallyHidden>
          <DrawerTitle>Adicionar ao carrinho</DrawerTitle>
        </VisuallyHidden>
        <div className="relative p-4 space-y-4">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute -top-3 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none z-50"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </button>

        {/* Header with product info */}
        <div className="flex gap-4 pb-3 border-b border-border">
          <img
            src={displayImage}
            alt={productName}
            className="w-20 h-20 object-contain rounded-md border border-border flex-shrink-0 bg-muted/30"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 leading-tight">{productName}</h3>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {discount > 0 && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatCurrency(normalPrice)}
                </span>
              )}
              <span className="text-lg font-bold">
                {formatCurrency(price)}
              </span>
              {discount > 0 && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-[hsl(var(--store-secondary))] text-[hsl(var(--store-secondary-foreground))]">
                  -{discount}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Variant selectors */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Size Selector (only if not yet selected) */}
          {availableSizes.length > 0 && (
            <div className={cn(
              "space-y-2 transition-all",
            )}>
              <div className="text-sm font-medium">
                <span
                  key={highlightMissing.includes('size') ? `shake-size-${shakeKey}` : 'size-label'}
                  className={cn(
                    "inline-block",
                    highlightMissing.includes('size') && "text-destructive animate-shake"
                  )}
                >
                  Tamanho: <span className="font-normal">{highlightMissing.includes('size') ? 'Selecione' : selectedSize || ''}</span>
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => onSizeChange(size)}
                      className={cn(
                        "flex-shrink-0 min-w-[2.5rem] px-2.5 h-9 rounded border transition-all text-sm font-medium",
                        selectedSize === size
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground"
                      )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generic Attributes (only if not yet selected) */}
          {genericAttributes?.map(attr => (
            <div
              key={attr.id}
              className={cn(
                "space-y-2 transition-all",
              )}
            >
              <div className="text-sm font-medium">
                <span
                  key={highlightMissing.includes(attr.id) ? `shake-${attr.id}-${shakeKey}` : `${attr.id}-label`}
                  className={cn(
                    "inline-block",
                    highlightMissing.includes(attr.id) && "text-destructive animate-shake"
                  )}
                >
                  {attr.name}: <span className="font-normal">{highlightMissing.includes(attr.id) ? 'Selecione' : attr.selectedValue || ''}</span>
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {attr.values.map(val => (
                  <button
                    key={val.id}
                    onClick={() => attr.onSelect(val.name)}
                    className={cn(
                      "flex-shrink-0 min-w-[2.5rem] px-2.5 h-9 rounded border transition-all text-sm font-medium",
                      attr.selectedValue === val.name
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground"
                    )}
                  >
                    {val.name}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity + Add Button */}
          <div className="flex gap-3 pt-1">
            <div data-vaul-no-drag className="flex items-center border border-border" style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-11 flex items-center justify-center hover:bg-muted text-muted-foreground"
                style={{ borderRadius: 'var(--store-button-radius, 0.375rem) 0 0 var(--store-button-radius, 0.375rem)' }}
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                value={quantity}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-8 h-11 text-center border-x border-border bg-transparent outline-none text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-11 flex items-center justify-center hover:bg-muted text-muted-foreground"
                style={{ borderRadius: '0 var(--store-button-radius, 0.375rem) var(--store-button-radius, 0.375rem) 0' }}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <Button
              onClick={handleAddClick}
              disabled={isAddingToCart || addedToCart}
              className="flex-1 h-11 bg-[hsl(var(--store-button,var(--store-primary)))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground)))] font-semibold text-sm disabled:opacity-100"
              style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
            >
              {isAddingToCart ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ADICIONANDO...
                </>
              ) : addedToCart ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  ADICIONADO!
                </>
              ) : (
                'ADICIONAR AO CARRINHO'
              )}
            </Button>
          </div>
        </div>
        </div>
       </DrawerContent>
    </Drawer>
  );
}
