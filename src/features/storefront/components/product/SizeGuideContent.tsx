import { useState, useMemo, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from '@/components/ui/carousel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shirt, PersonStanding } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SizeGuideDimension {
  id: string;
  name: string;
  measurement_type: string | null;
  position: number | null;
  image_url?: string | null;
  description?: string | null;
}

interface SizeGuideData {
  id: string;
  name: string;
  description: string | null;
  dimensions: SizeGuideDimension[];
  sizes: { id: string; name: string; position: number | null }[];
  values: { dimension_id: string; size_id: string; value: string }[];
}

interface SizeGuideContentProps {
  guide: SizeGuideData;
}

export const SizeGuideContent = ({ guide }: SizeGuideContentProps) => {
  const [activeTab, setActiveTab] = useState<'piece' | 'body'>('piece');

  const pieceDimensions = useMemo(() => 
    guide.dimensions.filter(d => d.measurement_type === 'piece'),
    [guide.dimensions]
  );

  const bodyDimensions = useMemo(() => 
    guide.dimensions.filter(d => d.measurement_type === 'body'),
    [guide.dimensions]
  );

  const getValue = (dimensionId: string, sizeId: string) => {
    return guide.values.find(v => v.dimension_id === dimensionId && v.size_id === sizeId)?.value || '-';
  };

  const hasBothTypes = pieceDimensions.length > 0 && bodyDimensions.length > 0;

  return (
    <div>
      {hasBothTypes ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'piece' | 'body')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="piece" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <Shirt className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Medidas da Peça</span>
            </TabsTrigger>
            <TabsTrigger value="body" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
              <PersonStanding className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Medidas do Corpo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="piece" className="mt-0 space-y-4">
            <DimensionCarousel dimensions={pieceDimensions} carouselTitle="Como medir suas peças" />
            <p className="text-xs text-muted-foreground">Medidas em centímetros (cm)</p>
            <MeasurementTable dimensions={pieceDimensions} sizes={guide.sizes} getValue={getValue} />
          </TabsContent>

          <TabsContent value="body" className="mt-0 space-y-4">
            <DimensionCarousel dimensions={bodyDimensions} carouselTitle="Como tirar suas medidas" />
            <p className="text-xs text-muted-foreground">Medidas do corpo em centímetros (cm)</p>
            <MeasurementTable dimensions={bodyDimensions} sizes={guide.sizes} getValue={getValue} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <DimensionCarousel 
            dimensions={pieceDimensions.length > 0 ? pieceDimensions : bodyDimensions} 
            carouselTitle={pieceDimensions.length > 0 ? "Como medir suas peças" : "Como tirar suas medidas"}
          />
          <p className="text-xs text-muted-foreground">Medidas em centímetros (cm)</p>
          <MeasurementTable 
            dimensions={pieceDimensions.length > 0 ? pieceDimensions : bodyDimensions} 
            sizes={guide.sizes} 
            getValue={getValue} 
          />
        </div>
      )}
    </div>
  );
};

// Carrossel de ilustrações
const DimensionCarousel = ({ dimensions, carouselTitle }: { dimensions: SizeGuideDimension[]; carouselTitle: string }) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const dimensionsWithImages = dimensions.filter(d => d.image_url);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollTo = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  if (dimensionsWithImages.length === 0) return null;

  return (
    <div className="bg-muted/20 rounded-lg p-3 sm:p-4">
      <h4 className="text-sm font-medium text-center mb-3">{carouselTitle}</h4>
      
      <div className="relative">
        <Carousel 
          setApi={setApi}
          opts={{ align: "start", loop: dimensionsWithImages.length > 1 }}
          className="w-full px-4 sm:px-0"
        >
          <CarouselContent className="-ml-2 sm:-ml-3">
            {dimensionsWithImages.map((dimension) => (
              <CarouselItem key={dimension.id} className="pl-2 sm:pl-3 basis-full sm:basis-1/2">
                <div className="flex items-center gap-3 p-2 sm:p-3 bg-background/50 rounded-lg h-full">
                  <div className="flex-shrink-0">
                    <img src={dimension.image_url!} alt={dimension.name} className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm leading-tight">{dimension.name}</h5>
                    {dimension.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{dimension.description}</p>
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {dimensionsWithImages.length > 1 && (
            <>
              <CarouselPrevious className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 bg-background/90 shadow-md border-0 hover:bg-background" />
              <CarouselNext className="absolute -right-1 sm:-right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8 bg-background/90 shadow-md border-0 hover:bg-background" />
            </>
          )}
        </Carousel>

        {count > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: count }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollTo(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  idx === current ? "bg-foreground w-4" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Ir para slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Tabela responsiva com coluna fixa
const MeasurementTable = ({ dimensions, sizes, getValue }: { 
  dimensions: SizeGuideDimension[];
  sizes: { id: string; name: string; position: number | null }[];
  getValue: (dimensionId: string, sizeId: string) => string;
}) => {
  if (dimensions.length === 0 || sizes.length === 0) {
    return <div className="text-center py-4 text-muted-foreground text-sm">Nenhuma medida configurada</div>;
  }

  return (
    <div className="relative border rounded-lg overflow-hidden">
      <div className="flex">
        <div className="flex-shrink-0 bg-background border-r z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="w-16 text-center font-semibold bg-muted/50 h-10 sm:h-12">Tam.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((size, idx) => (
                <TableRow key={size.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <TableCell className="text-center font-medium w-16 py-2 sm:py-3">{size.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                {dimensions.map((dimension) => (
                  <TableHead key={dimension.id} className="text-center min-w-[90px] whitespace-nowrap bg-muted/50 h-10 sm:h-12 text-xs sm:text-sm">
                    {dimension.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((size, idx) => (
                <TableRow key={size.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  {dimensions.map((dimension) => (
                    <TableCell key={dimension.id} className="text-center min-w-[90px] py-2 sm:py-3 text-sm">
                      {getValue(dimension.id, size.id)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};
