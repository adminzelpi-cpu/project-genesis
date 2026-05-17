import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";

interface ProductGalleryThumbnailsProps {
  images: string[];
  productName: string;
}

export function ProductGalleryThumbnails({ images, productName }: ProductGalleryThumbnailsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) return null;

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* Imagem Principal */}
      <div className="relative bg-muted rounded-lg overflow-hidden group min-h-[400px] flex items-center justify-center">
        <img
          src={getOptimizedImageUrl(images[selectedIndex], 800)}
          alt={`${productName} - Imagem ${selectedIndex + 1}`}
          className="w-auto max-w-full max-h-[600px] object-contain"
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Miniaturas - Desktop: ao lado / Mobile: embaixo */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 md:grid-cols-1 md:grid-rows-4">
          {images.slice(0, 4).map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "rounded-lg overflow-hidden border-2 transition-all",
                selectedIndex === index
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <img
                src={getOptimizedImageUrl(image, 120)}
                alt={`${productName} - Miniatura ${index + 1}`}
                className="max-w-full max-h-[120px] object-contain block"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
