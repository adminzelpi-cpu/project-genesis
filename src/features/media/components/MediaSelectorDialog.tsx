import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Search, 
  Upload, 
  Loader2, 
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { useStoreMedia, useUploadMedia, StoreMedia } from '../hooks/useStoreMedia';

interface MediaSelectorDialogProps {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: StoreMedia[]) => void;
  multiple?: boolean;
  maxSelection?: number;
}

export function MediaSelectorDialog({ 
  storeId, 
  open, 
  onOpenChange, 
  onSelect,
  multiple = true,
  maxSelection = 20
}: MediaSelectorDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');

  const { data: media, isLoading } = useStoreMedia({ storeId, search });
  const uploadMutation = useUploadMedia(storeId);

  const handleToggleSelect = (id: string) => {
    if (!multiple) {
      setSelectedIds([id]);
      return;
    }

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length >= maxSelection) {
        setSelectedIds([...selectedIds.slice(1), id]);
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const uploaded = await uploadMutation.mutateAsync(files);
    
    // Auto-select newly uploaded files
    const newIds = uploaded.map(m => m.id);
    if (multiple) {
      const availableSlots = maxSelection - selectedIds.length;
      setSelectedIds([...selectedIds, ...newIds.slice(0, availableSlots)]);
    } else {
      setSelectedIds(newIds.slice(0, 1));
    }
    
    setActiveTab('library');
    e.target.value = '';
  };

  const handleConfirm = () => {
    if (!media) return;
    const selectedMedia = media.filter(m => selectedIds.includes(m.id));
    onSelect(selectedMedia);
    onOpenChange(false);
    setSelectedIds([]);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar arquivo</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'upload')} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="library">Biblioteca</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
            </TabsList>

            {activeTab === 'library' && (
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar arquivos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>

          <TabsContent value="library" className="flex-1 overflow-auto mt-0">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && (!media || media.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">Nenhum arquivo encontrado</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Faça upload de imagens para começar
                </p>
                <Button onClick={() => setActiveTab('upload')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer upload
                </Button>
              </div>
            )}

            {!isLoading && media && media.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {media.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <Card
                      key={item.id}
                      className={`group relative overflow-hidden cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border'
                      }`}
                      onClick={() => handleToggleSelect(item.id)}
                    >
                      <div className="aspect-square bg-muted relative">
                        <img
                          src={item.file_url}
                          alt={item.alt_text || item.file_name}
                          className="w-full h-full object-cover"
                        />
                        
                        <div className={`absolute inset-0 transition-colors ${
                          isSelected ? 'bg-primary/20' : 'group-hover:bg-black/10'
                        }`} />
                        
                        <div className={`absolute top-2 left-2 transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-primary fill-background" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-white bg-black/30" />
                          )}
                        </div>
                      </div>
                      
                      <div className="p-1.5">
                        <p className="text-xs truncate" title={item.original_name || item.file_name}>
                          {item.original_name || item.file_name}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 mt-0">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadMutation.isPending}
              />
              <div className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {uploadMutation.isPending ? 'Enviando...' : 'Arraste e solte imagens aqui'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      ou clique para selecionar arquivos
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, WEBP, GIF • Máximo 10MB por arquivo
                  </p>
                </div>
              </div>
            </label>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          {selectedIds.length > 0 && (
            <Button variant="ghost" onClick={() => setSelectedIds([])}>
              Limpar seleção
            </Button>
          )}
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
            {selectedIds.length > 0 
              ? `Selecionar ${selectedIds.length} arquivo${selectedIds.length > 1 ? 's' : ''}`
              : 'Selecionar'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
