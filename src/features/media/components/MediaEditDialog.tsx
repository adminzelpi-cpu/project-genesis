import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useUpdateMedia, StoreMedia } from '../hooks/useStoreMedia';
import { formatFileSize } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MediaEditDialogProps {
  media: StoreMedia | null;
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaEditDialog({ media, storeId, open, onOpenChange }: MediaEditDialogProps) {
  const [altText, setAltText] = useState('');
  const [fileName, setFileName] = useState('');
  
  const updateMutation = useUpdateMedia(storeId);

  useEffect(() => {
    if (media) {
      setAltText(media.alt_text || '');
      setFileName(media.original_name || media.file_name);
    }
  }, [media]);

  const handleSave = async () => {
    if (!media) return;
    
    await updateMutation.mutateAsync({
      id: media.id,
      updates: {
        alt_text: altText,
        original_name: fileName,
      },
    });
    
    onOpenChange(false);
  };

  const handleCopyUrl = () => {
    if (!media) return;
    navigator.clipboard.writeText(media.file_url);
    toast({
      title: 'URL copiada',
      description: 'Link da imagem copiado para a área de transferência.',
    });
  };

  if (!media) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar arquivo</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg bg-muted overflow-hidden">
              <img
                src={media.file_url}
                alt={media.alt_text || media.file_name}
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyUrl}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar URL
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => window.open(media.file_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">Nome do arquivo</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="altText">Texto alternativo (Alt)</Label>
              <Textarea
                id="altText"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descreva a imagem para acessibilidade e SEO..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Importante para SEO e acessibilidade
              </p>
            </div>

            <Separator />

            {/* Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <Badge variant="secondary">{media.mime_type}</Badge>
              </div>
              {media.width && media.height && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensões</span>
                  <span>{media.width} × {media.height} px</span>
                </div>
              )}
              {media.file_size && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamanho</span>
                  <span>{formatFileSize(media.file_size)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adicionado em</span>
                <span>{format(new Date(media.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
