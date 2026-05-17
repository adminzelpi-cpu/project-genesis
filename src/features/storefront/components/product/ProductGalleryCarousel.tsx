import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/imageOptimization";

interface ProductGalleryCarouselProps {
  images: string[];
  productName: string;
}

export function ProductGalleryCarousel({ images, productName }: ProductGalleryCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  if (images.length === 0) return null;

  const handleApiChange = (newApi: CarouselApi) => {
    setApi(newApi);
    
    newApi?.on("select", () => {
      setCurrent(newApi.selectedScrollSnap());
    });
  };

  return (
    <div className="relative">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
        setApi={handleApiChange}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {images.map((image, index) => (
            <CarouselItem key={index} className="pl-2 md:pl-4 basis-full md:basis-11/12">
              <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
                <img
                  src={getOptimizedImageUrl(image, 800)}
                  alt={`${productName} - Imagem ${index + 1}`}
                  className="max-w-full max-h-[600px] object-contain"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : undefined}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {images.length > 1 && (
          <>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </>
        )}
      </Carousel>

      {/* Indicadores de posição (pontinhos) */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "h-2 rounded-full transition-all",
                current === index
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Ir para imagem ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
