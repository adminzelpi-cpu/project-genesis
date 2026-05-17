import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Upload, Loader2, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DimensionIllustration,
  getIllustrationsByType,
  mapTemplateToCategoryList,
  CATEGORY_LABELS,
  ProductCategory,
} from '../data/dimensionIllustrations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DimensionImageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensionName: string;
  dimensionType: 'piece' | 'body';
  productCategory?: string;
  currentImageUrl: string | null;
  currentDescription: string | null;
  onSave: (imageUrl: string | null, description: string | null) => void;
}

export const DimensionImageSelector = ({
  open,
  onOpenChange,
  dimensionName,
  dimensionType,
  productCategory,
  currentImageUrl,
  currentDescription,
  onSave,
}: DimensionImageSelectorProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImageUrl);
  const [description, setDescription] = useState(currentDescription || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('auto');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedImage(currentImageUrl);
      setDescription(currentDescription || '');
      setActiveCategory('auto');
      setIsDragging(false);
    }
  }, [open, currentImageUrl, currentDescription]);

  const defaultCategories = mapTemplateToCategoryList(productCategory || 'custom');
  
  const allCategoriesWithIllustrations = (): ProductCategory[] => {
    const allCats: ProductCategory[] = ['polo', 'camiseta', 'camisa-social', 'bermuda', 'cueca', 'calca'];
    return allCats.filter(cat => getIllustrationsByType(dimensionType, [cat]).length > 0);
  };

  const resolvedCategories = activeCategory === 'auto' 
    ? defaultCategories 
    : [activeCategory as ProductCategory];

  const illustrations = getIllustrationsByType(dimensionType, resolvedCategories);
  const availableCategories = allCategoriesWithIllustrations();
  const showCategoryFilter = dimensionType === 'piece' && availableCategories.length > 1;

  const handleSelectIllustration = (illustration: DimensionIllustration) => {
    setSelectedImage(illustration.imageUrl);
    if (!description) {
      setDescription(illustration.description);
    }
  };

  const handleSave = () => {
    onSave(selectedImage, description || null);
    onOpenChange(false);
  };

  const processFile = useCallback(async (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use PNG, JPG, WebP ou SVG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `dimension-${Date.now()}.${fileExt}`;
      const filePath = `size-guides/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('store-assets')
        .getPublicUrl(filePath);

      setSelectedImage(urlData.publicUrl);
      toast.success('Imagem carregada!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao carregar imagem: ' + (error.message || 'Tente novamente'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleRemoveSelected = () => {
    setSelectedImage(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Configurar imagem: {dimensionName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Upload area + preview */}
            <div className="space-y-3">
              <Label>Sua imagem personalizada</Label>

              {selectedImage ? (
                <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="w-28 h-28 border rounded-lg overflow-hidden bg-background flex-shrink-0">
                    <img 
                      src={selectedImage} 
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-medium text-foreground">Imagem selecionada</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedImage}</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Trocar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleRemoveSelected}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                    isDragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                    isUploading && "pointer-events-none opacity-60"
                  )}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-sm font-medium text-muted-foreground">Carregando...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <ImagePlus className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          Clique para selecionar ou arraste aqui
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, WebP ou SVG • Máx. 5MB
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ideal: fundo branco, 400×400px ou maior
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Biblioteca de ilustrações */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ou escolha da biblioteca</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ilustrações prontas para usar no seu guia
                  </p>
                </div>
                {showCategoryFilter && (
                  <Select value={activeCategory} onValueChange={setActiveCategory}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        {productCategory && productCategory !== 'custom' 
                          ? CATEGORY_LABELS[productCategory] || 'Automático'
                          : 'Todas'}
                      </SelectItem>
                      {availableCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {illustrations.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {illustrations.map((illustration) => (
                    <button
                      key={illustration.id}
                      onClick={() => handleSelectIllustration(illustration)}
                      className={cn(
                        "relative border-2 rounded-lg p-2 hover:border-primary transition-colors",
                        selectedImage === illustration.imageUrl 
                          ? "border-primary bg-primary/5" 
                          : "border-border"
                      )}
                    >
                      {selectedImage === illustration.imageUrl && (
                        <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="aspect-square bg-muted rounded overflow-hidden mb-2">
                        <img 
                          src={illustration.imageUrl} 
                          alt={illustration.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <p className="text-xs font-medium text-center">{illustration.name}</p>
                      {showCategoryFilter && activeCategory === 'auto' && defaultCategories.length > 1 && (
                        <p className="text-[10px] text-muted-foreground text-center">
                          {CATEGORY_LABELS[illustration.category]}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma ilustração disponível para esta categoria.
                </p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição / Como medir</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Medir da costura do ombro até o punho..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Esta descrição aparecerá ao lado da imagem no guia de medidas
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};