import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { ProductVariant } from "./VariantSelectorGrid";

interface VariantSelectorCarouselProps {
  variants: ProductVariant[];
  selectedVariantId?: string;
  onVariantSelect: (variant: ProductVariant) => void;
}

export function VariantSelectorCarousel({
  variants,
  selectedVariantId,
  onVariantSelect,
}: VariantSelectorCarouselProps) {
  if (variants.length === 0) return null;

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

      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {variants.map((variant) => {
            const isSelected = variant.id === selectedVariantId;
            const isOutOfStock = variant.stock_quantity === 0;

            return (
              <CarouselItem key={variant.id} className="pl-2 basis-auto">
                <button
                  onClick={() => !isOutOfStock && onVariantSelect(variant)}
                  disabled={isOutOfStock}
                  className={cn(
                    "relative w-16 h-16 rounded border-2 overflow-hidden transition-all",
                    isSelected
                      ? "border-foreground"
                      : "border-border hover:border-muted-foreground",
                    isOutOfStock && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {variant.image_url ? (
                    <img
                      src={variant.image_url}
                      alt={variant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium">{variant.value}</span>
                    </div>
                  )}
                  
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <span className="text-xs text-destructive">✕</span>
                    </div>
                  )}
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        
        {variants.length > 4 && (
          <>
            <CarouselPrevious className="-left-4" />
            <CarouselNext className="-right-4" />
          </>
        )}
      </Carousel>
    </div>
  );
}
