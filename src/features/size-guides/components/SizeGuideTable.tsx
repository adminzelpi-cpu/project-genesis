import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { SizeGuideWithDetails, SizeGuideDimension } from '../hooks/useSizeGuides';
import { Ruler, User } from 'lucide-react';

interface SizeGuideTableProps {
  guide: SizeGuideWithDetails;
}

export const SizeGuideTable = ({ guide }: SizeGuideTableProps) => {
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
    const value = guide.values.find(v => v.dimension_id === dimensionId && v.size_id === sizeId);
    return value?.value || '-';
  };

  const hasPieceDimensions = pieceDimensions.length > 0;
  const hasBodyDimensions = bodyDimensions.length > 0;

  if (!hasPieceDimensions && !hasBodyDimensions) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Guia de medidas não configurado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(hasPieceDimensions && hasBodyDimensions) ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'piece' | 'body')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="piece" className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Medidas da Peça
            </TabsTrigger>
            <TabsTrigger value="body" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Medidas do Corpo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="piece" className="mt-4">
            <DimensionCarousel dimensions={pieceDimensions} />
            <MeasurementTable 
              dimensions={pieceDimensions} 
              sizes={guide.sizes} 
              getValue={getValue} 
            />
          </TabsContent>

          <TabsContent value="body" className="mt-4">
            <DimensionCarousel dimensions={bodyDimensions} />
            <MeasurementTable 
              dimensions={bodyDimensions} 
              sizes={guide.sizes} 
              getValue={getValue} 
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <DimensionCarousel dimensions={hasPieceDimensions ? pieceDimensions : bodyDimensions} />
          <MeasurementTable 
            dimensions={hasPieceDimensions ? pieceDimensions : bodyDimensions} 
            sizes={guide.sizes} 
            getValue={getValue} 
          />
        </>
      )}
    </div>
  );
};

// Carrossel de ilustrações
const DimensionCarousel = ({ dimensions }: { dimensions: SizeGuideDimension[] }) => {
  const dimensionsWithImages = dimensions.filter(d => d.image_url);

  if (dimensionsWithImages.length === 0) return null;

  return (
    <div className="mb-6">
      <Carousel className="w-full max-w-xs mx-auto">
        <CarouselContent>
          {dimensionsWithImages.map((dimension) => (
            <CarouselItem key={dimension.id}>
              <div className="p-1">
                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <img
                    src={dimension.image_url!}
                    alt={dimension.name}
                    className="w-full h-48 object-contain mx-auto mb-3"
                  />
                  <h4 className="font-medium text-sm">{dimension.name}</h4>
                  {dimension.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {dimension.description}
                    </p>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {dimensionsWithImages.length > 1 && (
          <>
            <CarouselPrevious className="-left-2" />
            <CarouselNext className="-right-2" />
          </>
        )}
      </Carousel>
    </div>
  );
};

// Tabela responsiva com coluna fixa
const MeasurementTable = ({ 
  dimensions, 
  sizes, 
  getValue 
}: { 
  dimensions: SizeGuideDimension[];
  sizes: { id: string; name: string; position: number }[];
  getValue: (dimensionId: string, sizeId: string) => string;
}) => {
  if (dimensions.length === 0 || sizes.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhuma medida configurada
      </div>
    );
  }

  return (
    <div className="relative border rounded-lg overflow-hidden">
      {/* Mobile: tabela com scroll horizontal e coluna fixa */}
      <div className="flex">
        {/* Coluna fixa de tamanhos */}
        <div className="flex-shrink-0 bg-background border-r z-10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center font-semibold bg-muted/50">
                  Tam.
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((size) => (
                <TableRow key={size.id}>
                  <TableCell className="text-center font-medium bg-muted/30 w-16">
                    {size.name}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Colunas com scroll */}
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                {dimensions.map((dimension) => (
                  <TableHead 
                    key={dimension.id} 
                    className="text-center min-w-[80px] whitespace-nowrap"
                  >
                    {dimension.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sizes.map((size) => (
                <TableRow key={size.id}>
                  {dimensions.map((dimension) => (
                    <TableCell 
                      key={dimension.id} 
                      className="text-center min-w-[80px]"
                    >
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
