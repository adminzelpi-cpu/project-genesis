import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ProductVariant {
  id: string;
  name: string;
  type: string;
  value: string;
  image_url?: string;
  price_adjustment: number;
  stock_quantity: number;
}

interface VariantSelectorGridProps {
  variants: ProductVariant[];
  selectedVariantId?: string;
  onVariantSelect: (variant: ProductVariant) => void;
  maxVisible?: number;
}

export function VariantSelectorGrid({
  variants,
  selectedVariantId,
  onVariantSelect,
  maxVisible = 6,
}: VariantSelectorGridProps) {
  const [showAll, setShowAll] = useState(false);

  if (variants.length === 0) return null;

  const visibleVariants = showAll ? variants : variants.slice(0, maxVisible);
  const hasMore = variants.length > maxVisible;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {variants[0]?.type === 'color' ? 'Cor:' : 'Variante:'}
        </span>
        {selectedVariantId && (
          <span className="text-sm text-muted-foreground">
            {variants.find(v => v.id === selectedVariantId)?.name}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleVariants.map((variant) => {
          const isSelected = variant.id === selectedVariantId;
          const isOutOfStock = variant.stock_quantity === 0;

          // Se tiver imagem, mostra a imagem (para cores)
          if (variant.image_url) {
            return (
              <button
                key={variant.id}
                onClick={() => !isOutOfStock && onVariantSelect(variant)}
                disabled={isOutOfStock}
                className={cn(
                  "relative w-16 h-16 rounded border-2 transition-all overflow-hidden",
                  isSelected && "border-foreground",
                  !isSelected && !isOutOfStock && "border-border hover:border-muted-foreground",
                  isOutOfStock && "opacity-40 cursor-not-allowed"
                )}
                title={`${variant.name}${isOutOfStock ? ' - Fora de estoque' : ''}`}
              >
                <img
                  src={variant.image_url}
                  alt={variant.name}
                  className="w-full h-full object-cover"
                />
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <span className="text-xs">✕</span>
                  </div>
                )}
              </button>
            );
          }

          // Se não tiver imagem, mostra o nome/valor (para tamanhos, etc)
          return (
            <button
              key={variant.id}
              onClick={() => !isOutOfStock && onVariantSelect(variant)}
              disabled={isOutOfStock}
              className={cn(
                "min-w-[2.5rem] px-2.5 h-9 rounded border transition-all text-sm font-medium",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground",
                isOutOfStock && "opacity-40 line-through cursor-not-allowed"
              )}
            >
              {variant.value}
            </button>
          );
        })}

        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="min-w-[2.5rem] px-2.5 h-9 rounded border border-border hover:border-foreground transition-all text-sm font-medium"
          >
            +{variants.length - maxVisible}
          </button>
        )}
      </div>
    </div>
  );
}
