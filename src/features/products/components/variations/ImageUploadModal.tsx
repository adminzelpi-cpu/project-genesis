import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, X, GripVertical, FolderOpen, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MediaSelectorDialog } from "@/features/media/components/MediaSelectorDialog";
import { compressImage } from "@/lib/imageCompression";
import {
  analyzeImages,
  detectDimensionMismatch,
  type ImageAnalysis,
  type StandardizedResult,
} from "@/lib/imageStandardization";
import { ImageStandardizationModal } from "../ImageStandardizationModal";

export interface VariationImage {
  url: string;
  is_primary: boolean;
  alt?: string;
}

interface ImageUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: VariationImage[];
  onSave: (images: VariationImage[], selectedAttributeIds?: string[]) => void;
  variationId?: string;
  variationAttributes?: Record<string, string>;
  attributes?: any[];
  attributeValues?: any[];
  storeId?: string;
  productName?: string;
  categoryName?: string;
}

const safeImages = (raw: any): VariationImage[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
};

export const ImageUploadModal = ({
  open,
  onOpenChange,
  images: initialImages,
  onSave,
  variationId,
  variationAttributes,
  attributes,
  attributeValues,
  storeId,
  productName,
  categoryName,
}: ImageUploadModalProps) => {
  const safeInitial = safeImages(initialImages);
  const [images, setImages] = useState<VariationImage[]>(safeInitial);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<{ index: number; url: string; alt: string } | null>(null);

  // Standardization state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [analyses, setAnalyses] = useState<ImageAnalysis[]>([]);
  const [standardizationOpen, setStandardizationOpen] = useState(false);

  // Palavras-chave para identificar atributos NÃO visuais
  const nonVisualKeywords = [
    'tamanho', 'voltagem', 'capacidade', 'volume', 'quantidade', 
    'peso', 'potência', 'potencia', 'ml', 'litro', 'kg', 'gramas',
    'watts', 'volts', 'amperes', 'dimensão', 'dimensao', 'comprimento',
    'largura', 'altura', 'gb', 'tb', 'mb', 'memória', 'memoria',
    'armazenamento', 'bateria', 'mah'
  ];

  // Listar atributos da variação, separando visuais de não-visuais
  const variationAttributesList = Object.entries(variationAttributes || {}).map(([attrId, valueId]) => {
    const attr = attributes?.find(a => a.id === attrId);
    const val = attributeValues?.find(v => v.id === valueId);
    
    const attrNameLower = attr?.name.toLowerCase() || '';
    
    const isVisual = 
      attr?.type === 'color' || 
      (attr?.type === 'custom' && !nonVisualKeywords.some(keyword => attrNameLower.includes(keyword)));
    
    return {
      id: attrId,
      name: attr?.name || "Atributo",
      value: val?.value || "Valor",
      type: attr?.type || "custom",
      isVisual,
    };
  });

  const visualAttributes = variationAttributesList.filter(a => a.isVisual);
  const hasMultipleVariations = variationAttributesList.length > 0;
  const showApplyToAll = hasMultipleVariations && visualAttributes.length === 0;

  // Build variation label for auto alt text
  const variationLabel = variationAttributesList.map(a => a.value).join(' / ');

  // Reset state when modal opens - use JSON comparison to avoid spurious resets
  const initialImagesJson = JSON.stringify(safeImages(initialImages));
  useEffect(() => {
    if (open) {
      setImages(JSON.parse(initialImagesJson));
      setSelectedAttributes([]);
      setApplyToAll(false);
      setEditingImage(null);
    }
  }, [initialImagesJson, open]);

  const generateAltText = (imageIndex: number) => {
    const parts = [productName || 'Produto'];
    if (variationLabel) parts.push(variationLabel);
    parts.push(`Imagem ${imageIndex + 1}`);
    return parts.join(' - ');
  };

  const uploadFilesDirectly = useCallback(async (files: File[]) => {
    setUploading(true);
    const uploadedImages: VariationImage[] = [];
    const failedFiles: string[] = [];

    try {
      for (const originalFile of files) {
        let success = false;
        let lastError: any = null;

        // Retry up to 2 times on failure
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            const file = await compressImage(originalFile);
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = storeId ? `media/${storeId}/${fileName}` : fileName;

            const { error: uploadError } = await supabase.storage
              .from('product-images')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);

            // Verify URL is valid before considering success
            if (!publicUrl) throw new Error('URL pública não gerada');

            // Register in store_media for the library
            if (storeId) {
              await supabase
                .from('store_media')
                .insert({
                  store_id: storeId,
                  file_name: fileName,
                  original_name: originalFile.name,
                  file_url: publicUrl,
                  file_type: 'image',
                  file_size: file.size,
                  mime_type: file.type,
                  folder: 'root',
                });
            }

            const newIndex = images.length + uploadedImages.length;
            uploadedImages.push({ 
              url: publicUrl, 
              is_primary: images.length === 0 && uploadedImages.length === 0,
              alt: generateAltText(newIndex),
            });
            success = true;
          } catch (err) {
            lastError = err;
            if (attempt < 2) {
              // Wait before retry (500ms, then 1500ms)
              await new Promise(r => setTimeout(r, (attempt + 1) * 500));
            }
          }
        }

        if (!success) {
          console.error('Upload falhou após 3 tentativas:', originalFile.name, lastError);
          failedFiles.push(originalFile.name);
        }
      }

      if (uploadedImages.length > 0) {
        setImages(prev => [...prev, ...uploadedImages]);
      }

      if (failedFiles.length > 0) {
        toast.error(`Falha ao enviar: ${failedFiles.join(', ')}. Tente novamente.`);
      } else if (uploadedImages.length > 0) {
        toast.success(`${uploadedImages.length} imagem(ns) adicionada(s)`);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload das imagens');
    } finally {
      setUploading(false);
    }
  }, [images, generateAltText, storeId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/') && f.type !== 'image/gif' && f.type !== 'image/svg+xml');

    if (imageFiles.length > 1) {
      const analyzed = await analyzeImages(imageFiles);
      if (detectDimensionMismatch(analyzed)) {
        setPendingFiles(fileArray);
        setAnalyses(analyzed);
        setStandardizationOpen(true);
        return;
      }
    }

    await uploadFilesDirectly(fileArray);
  };

  const handleStandardizationConfirm = async (results: StandardizedResult[]) => {
    const nonImageFiles = pendingFiles.filter(
      f => !f.type.startsWith('image/') || f.type === 'image/gif' || f.type === 'image/svg+xml'
    );
    analyses.forEach(a => URL.revokeObjectURL(a.previewUrl));
    await uploadFilesDirectly([...results.map(r => r.file), ...nonImageFiles]);
    setPendingFiles([]);
    setAnalyses([]);
  };

  const handleStandardizationSkip = async () => {
    analyses.forEach(a => URL.revokeObjectURL(a.previewUrl));
    await uploadFilesDirectly(pendingFiles);
    setPendingFiles([]);
    setAnalyses([]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    if (images[index].is_primary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }
    setImages(newImages);
  };

  const handleSave = () => {
    if (applyToAll) {
      onSave(images, ['__ALL_VARIATIONS__']);
    } else {
      onSave(images, selectedAttributes.length > 0 ? selectedAttributes : undefined);
    }
    onOpenChange(false);
  };

  const handleSaveEdit = () => {
    if (!editingImage) return;
    const newImages = [...images];
    newImages[editingImage.index] = {
      ...newImages[editingImage.index],
      alt: editingImage.alt,
    };
    setImages(newImages);
    setEditingImage(null);
  };

  const toggleAttribute = (attrId: string) => {
    setSelectedAttributes(prev => 
      prev.includes(attrId) 
        ? prev.filter(id => id !== attrId)
        : [...prev, attrId]
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach(file => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
      
      handleFileUpload({ target: input } as any);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    const updatedImages = newImages.map((img, i) => ({
      ...img,
      is_primary: i === 0,
    }));
    
    setImages(updatedImages);
    setDraggedIndex(index);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Imagens da Variação</DialogTitle>
            <DialogDescription>
              Reordene, defina principal e aplique opcionalmente às variações com mesmos atributos.
            </DialogDescription>
          </DialogHeader>

          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              id="variation-image-upload"
              type="file"
              multiple
              accept="image/webp,image/png,image/jpeg,image/gif"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {uploading ? "Enviando..." : "Arraste e solte, ou selecione fotos do produto"}
              </p>
              <p className="text-xs text-muted-foreground">WEBP, PNG, JPEG, GIF • Recomendado: 1200px</p>
              
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('variation-image-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer upload
                </Button>
                {storeId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMediaSelectorOpen(true)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Selecionar da biblioteca
                  </Button>
                )}
              </div>
            </div>
          </div>

          {images.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium">Imagens ({images.length}) - Arraste para reordenar</p>
              <div className="grid grid-cols-4 gap-4">
                {images.map((img, index) => {
                  const isPrimary = index === 0;
                  
                  return (
                    <div
                      key={`${img.url}-${index}`}
                      draggable
                      onDragStart={() => handleImageDragStart(index)}
                      onDragOver={(e) => handleImageDragOver(e, index)}
                      onDragEnd={handleImageDragEnd}
                      className={`relative group p-2 border-2 rounded-lg cursor-move h-full ${
                        isPrimary ? 'border-primary' : 'border-border'
                      } ${draggedIndex === index ? 'opacity-50' : ''}`}
                    >
                      <div className="w-full h-full flex items-center justify-center bg-muted rounded overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.alt || `Imagem ${index + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      
                      {isPrimary && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded z-10">
                          Principal
                        </div>
                      )}
                      
                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-5 w-5 text-white drop-shadow" />
                      </div>

                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-7 w-7"
                          onClick={() => setEditingImage({ index, url: img.url, alt: img.alt || '' })}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Opção para aplicar em massa quando há atributos visuais */}
          {visualAttributes.length > 0 && images.length > 0 && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="apply-to-visual"
                  checked={selectedAttributes.length === visualAttributes.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedAttributes(visualAttributes.map(a => a.id));
                    } else {
                      setSelectedAttributes([]);
                    }
                  }}
                />
                <Label 
                  htmlFor="apply-to-visual"
                  className="text-sm cursor-pointer flex-1"
                >
                  Aplicar estas imagens para todas as variações <strong>
                    {visualAttributes.map(a => a.value).join("/")}
                  </strong>
                </Label>
              </div>
              
              {selectedAttributes.length > 0 && (
                <div className="text-xs text-muted-foreground p-2 bg-background rounded border-l-2 border-primary">
                  ✓ As imagens serão aplicadas em <strong>todas as variantes</strong> de:{" "}
                  <strong>{visualAttributes.map(a => a.value).join("/")}</strong>
                  <div className="mt-1 text-[11px] opacity-70">
                    Exemplo: {visualAttributes.map(a => a.value).join("/")}/P, {visualAttributes.map(a => a.value).join("/")}/M, {visualAttributes.map(a => a.value).join("/")}/G, etc.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Opção para aplicar para TODAS as variações */}
          {showApplyToAll && images.length > 0 && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="apply-to-all"
                  checked={applyToAll}
                  onCheckedChange={(checked) => setApplyToAll(!!checked)}
                />
                <Label 
                  htmlFor="apply-to-all"
                  className="text-sm cursor-pointer flex-1"
                >
                  Aplicar estas imagens para <strong>TODAS</strong> as variações
                </Label>
              </div>
              
              {applyToAll && (
                <div className="text-xs text-muted-foreground p-2 bg-background rounded border-l-2 border-primary">
                  ✓ As imagens serão aplicadas em <strong>todas as variações</strong> deste produto
                  <div className="mt-1 text-[11px] opacity-70">
                    Ideal para produtos onde todas as variantes têm a mesma aparência visual (ex: diferentes tamanhos, capacidades, voltagens)
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Image Dialog */}
      <Dialog open={!!editingImage} onOpenChange={() => setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Imagem</DialogTitle>
          </DialogHeader>
          
          {editingImage && (
            <div className="space-y-4">
              <div className="w-full flex items-center justify-center bg-muted rounded overflow-hidden">
                <img
                  src={editingImage.url}
                  alt="Preview"
                  className="max-h-96 w-auto object-contain"
                />
              </div>

              <div>
                <Label htmlFor="variation-alt-text">Texto Alternativo (Alt)</Label>
                <Input
                  id="variation-alt-text"
                  value={editingImage.alt}
                  onChange={(e) => setEditingImage({ ...editingImage, alt: e.target.value })}
                  placeholder="Descreva a imagem para SEO e acessibilidade"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Importante para SEO e acessibilidade
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingImage(null)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSaveEdit}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {storeId && (
        <MediaSelectorDialog
          storeId={storeId}
          open={mediaSelectorOpen}
          onOpenChange={setMediaSelectorOpen}
          onSelect={(selectedMedia) => {
            const newImages = selectedMedia.map((media, idx) => ({
              url: media.file_url,
              is_primary: images.length === 0 && idx === 0,
              alt: generateAltText(images.length + idx),
            }));
            setImages([...images, ...newImages]);
            toast.success(`${newImages.length} imagem(ns) adicionada(s) da biblioteca`);
          }}
          multiple={true}
          maxSelection={10}
        />
      )}

      {/* Image Standardization Modal */}
      <ImageStandardizationModal
        open={standardizationOpen}
        onOpenChange={setStandardizationOpen}
        analyses={analyses}
        categoryName={categoryName}
        storeId={storeId}
        onConfirm={handleStandardizationConfirm}
        onSkip={handleStandardizationSkip}
      />
    </>
  );
};
