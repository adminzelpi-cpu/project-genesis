import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, GripVertical, Pencil, Loader2, FolderOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MediaSelectorDialog, useUploadMedia } from '@/features/media';
import { compressImage } from '@/lib/imageCompression';
import {
  analyzeImages,
  detectDimensionMismatch,
  type ImageAnalysis,
  type StandardizedResult,
} from '@/lib/imageStandardization';
import { ImageStandardizationModal } from './ImageStandardizationModal';

interface ProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

interface ImageUploaderProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  storeId?: string;
  productName?: string;
  categoryName?: string;
}

export const ImageUploader = ({ images, onChange, storeId, productName, categoryName }: ImageUploaderProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingImage, setEditingImage] = useState<{ index: number; url: string; alt: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);

  // Standardization state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [analyses, setAnalyses] = useState<ImageAnalysis[]>([]);
  const [standardizationOpen, setStandardizationOpen] = useState(false);

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true);
    const newImages: ProductImage[] = [];

    try {
      for (const originalFile of files) {
        // Compress image before upload
        const file = await compressImage(originalFile);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = storeId ? `media/${storeId}/${fileName}` : `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            variant: 'destructive',
            title: 'Erro ao fazer upload',
            description: uploadError.message,
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        if (storeId) {
          await supabase
            .from('store_media')
            .insert({
              store_id: storeId,
              file_name: fileName,
              original_name: file.name,
              file_url: publicUrl,
              file_type: 'image',
              file_size: file.size,
              mime_type: file.type,
              folder: 'root',
            });
        }

        const autoAlt = productName 
          ? `${productName} - Imagem ${images.length + newImages.length + 1}` 
          : '';
        
        newImages.push({
          url: publicUrl,
          alt: autoAlt,
          isPrimary: images.length === 0 && newImages.length === 0,
        });
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
        toast({
          title: 'Imagens enviadas',
          description: `${newImages.length} imagem(ns) adicionada(s) com sucesso.`,
        });
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: 'Ocorreu um erro ao enviar as imagens.',
      });
    } finally {
      setUploading(false);
    }
  }, [images, onChange, storeId, productName]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input immediately
    e.target.value = '';

    // Analyze images for standardization
    const imageFiles = files.filter(f => f.type.startsWith('image/') && f.type !== 'image/gif' && f.type !== 'image/svg+xml');
    
    if (imageFiles.length > 0) {
      const analyzed = await analyzeImages(imageFiles);
      const hasMismatch = detectDimensionMismatch(analyzed);

      if (hasMismatch && analyzed.length > 1) {
        // Show standardization modal
        setPendingFiles(files);
        setAnalyses(analyzed);
        setStandardizationOpen(true);
        return;
      }
    }

    // No mismatch or single image — upload directly
    await uploadFiles(files);
  };

  const handleStandardizationConfirm = async (results: StandardizedResult[]) => {
    // Replace the standardized files in the pending list
    const nonImageFiles = pendingFiles.filter(
      f => !f.type.startsWith('image/') || f.type === 'image/gif' || f.type === 'image/svg+xml'
    );
    const standardizedFiles = results.map(r => r.file);
    
    // Clean up analysis preview URLs
    analyses.forEach(a => URL.revokeObjectURL(a.previewUrl));
    
    await uploadFiles([...standardizedFiles, ...nonImageFiles]);
    setPendingFiles([]);
    setAnalyses([]);
  };

  const handleStandardizationSkip = async () => {
    // Clean up and upload originals
    analyses.forEach(a => URL.revokeObjectURL(a.previewUrl));
    await uploadFiles(pendingFiles);
    setPendingFiles([]);
    setAnalyses([]);
  };

  const handleSelectFromLibrary = (selectedMedia: { file_url: string; alt_text: string | null }[]) => {
    const newImages: ProductImage[] = selectedMedia.map((media, idx) => ({
      url: media.file_url,
      alt: media.alt_text || '',
      isPrimary: images.length === 0 && idx === 0,
    }));

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
      toast({
        title: 'Imagens adicionadas',
        description: `${newImages.length} imagem(ns) selecionada(s) da biblioteca.`,
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    const updatedImages = newImages.map((img, i) => ({
      ...img,
      isPrimary: i === 0,
    }));
    
    setDraggedIndex(index);
    onChange(updatedImages);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    if (images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    onChange(newImages);
  };

  const handleSetPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onChange(newImages);
  };

  const handleSaveEdit = () => {
    if (!editingImage) return;
    
    const newImages = [...images];
    newImages[editingImage.index].alt = editingImage.alt;
    onChange(newImages);
    setEditingImage(null);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Upload Area */}
        <div className={`max-w-2xl border-2 border-dashed rounded-lg p-8 text-center transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'}`}>
          <input
            type="file"
            accept="image/webp,image/png,image/jpeg,image/gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              {uploading ? (
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              ) : (
                <Plus className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium">
                {uploading ? 'Enviando imagens...' : 'Arraste e solte, ou selecione fotos do produto'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">WEBP, PNG, JPEG, GIF • Recomendado: 1200px</p>
            </div>

            <div className="flex gap-2 mt-2">
              <label htmlFor="image-upload">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  disabled={uploading}
                  asChild
                >
                  <span>
                    <Plus className="h-4 w-4 mr-1" />
                    Fazer upload
                  </span>
                </Button>
              </label>
              
              {storeId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setMediaSelectorOpen(true)}
                  disabled={uploading}
                >
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Selecionar da biblioteca
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="space-y-2">
            <Label>Imagens</Label>
            <div className="grid grid-cols-4 gap-4 max-w-2xl auto-rows-fr">
              {images.map((image, index) => {
                const isPrimary = index === 0;
                
                return (
                  <Card
                    key={index}
                    className={`p-2 cursor-move h-full ${isPrimary ? 'col-span-2 row-span-2' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="relative group h-full">
                      <div className="w-full h-full flex items-center justify-center bg-muted rounded overflow-hidden aspect-square">
                        <img
                          src={image.url}
                          alt={image.alt || `Produto ${index + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      
                      {isPrimary && (
                        <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                          Imagem Principal
                        </Badge>
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
                          onClick={() => setEditingImage({ index, url: image.url, alt: image.alt || '' })}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7"
                          onClick={() => handleRemove(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
                <Label htmlFor="alt-text">Texto Alternativo (Alt)</Label>
                <Input
                  id="alt-text"
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

      {/* Media Selector Dialog */}
      {storeId && (
        <MediaSelectorDialog
          storeId={storeId}
          open={mediaSelectorOpen}
          onOpenChange={setMediaSelectorOpen}
          onSelect={handleSelectFromLibrary}
          multiple={true}
          maxSelection={20}
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
