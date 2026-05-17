import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  Upload, 
  Grid, 
  List, 
  Trash2, 
  Pencil, 
  Loader2,
  Image as ImageIcon,
  LayoutGrid,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useStoreMedia, useUploadMedia, useDeleteMedia, useSyncProductImages, StoreMedia } from '../hooks/useStoreMedia';
import { MediaEditDialog } from './MediaEditDialog';
import { formatFileSize } from '@/lib/utils';

interface MediaLibraryProps {
  storeId: string;
  selectionMode?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  maxSelection?: number;
}

export function MediaLibrary({ 
  storeId, 
  selectionMode = false,
  selectedIds = [],
  onSelectionChange,
  maxSelection
}: MediaLibraryProps) {
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingMedia, setEditingMedia] = useState<StoreMedia | null>(null);
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>([]);

  const { data: media, isLoading } = useStoreMedia({ storeId, search, fileType });
  const uploadMutation = useUploadMedia(storeId);
  const deleteMutation = useDeleteMedia(storeId);
  const syncMutation = useSyncProductImages(storeId);

  const effectiveSelectedIds = selectionMode ? selectedIds : localSelectedIds;
  const setEffectiveSelectedIds = selectionMode 
    ? (ids: string[]) => onSelectionChange?.(ids)
    : setLocalSelectedIds;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadMutation.mutateAsync(files);
    e.target.value = '';
  };

  const handleToggleSelect = (id: string) => {
    if (effectiveSelectedIds.includes(id)) {
      setEffectiveSelectedIds(effectiveSelectedIds.filter(i => i !== id));
    } else {
      if (maxSelection && effectiveSelectedIds.length >= maxSelection) {
        // Replace the first selected if max is reached
        setEffectiveSelectedIds([...effectiveSelectedIds.slice(1), id]);
      } else {
        setEffectiveSelectedIds([...effectiveSelectedIds, id]);
      }
    }
  };

  const handleSelectAll = () => {
    if (!media) return;
    if (effectiveSelectedIds.length === media.length) {
      setEffectiveSelectedIds([]);
    } else {
      const ids = media.map(m => m.id);
      setEffectiveSelectedIds(maxSelection ? ids.slice(0, maxSelection) : ids);
    }
  };

  const handleDeleteSelected = async () => {
    if (effectiveSelectedIds.length === 0) return;
    await deleteMutation.mutateAsync(effectiveSelectedIds);
    setEffectiveSelectedIds([]);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar arquivos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={fileType} onValueChange={setFileType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="image">Imagens</SelectItem>
              <SelectItem value="file">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {effectiveSelectedIds.length > 0 && !selectionMode && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir ({effectiveSelectedIds.length})
            </Button>
          )}

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar
          </Button>

          <label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadMutation.isPending}
            />
            <Button asChild disabled={uploadMutation.isPending}>
              <span>
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Upload drop zone */}
      <div 
        className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
        onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Arraste e solte arquivos aqui</p>
          <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!media || media.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">Nenhum arquivo encontrado</h3>
          <p className="text-muted-foreground text-sm">
            Faça upload de imagens para começar
          </p>
        </div>
      )}

      {/* Media grid/list */}
      {!isLoading && media && media.length > 0 && (
        <>
          {/* Select all checkbox */}
          {!selectionMode && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={effectiveSelectedIds.length === media.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Selecionar todos ({media.length} arquivos)
              </span>
            </div>
          )}

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {media.map((item) => (
                <MediaGridItem
                  key={item.id}
                  item={item}
                  isSelected={effectiveSelectedIds.includes(item.id)}
                  onToggleSelect={() => handleToggleSelect(item.id)}
                  onEdit={() => setEditingMedia(item)}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {media.map((item) => (
                <MediaListItem
                  key={item.id}
                  item={item}
                  isSelected={effectiveSelectedIds.includes(item.id)}
                  onToggleSelect={() => handleToggleSelect(item.id)}
                  onEdit={() => setEditingMedia(item)}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit dialog */}
      <MediaEditDialog
        media={editingMedia}
        storeId={storeId}
        open={!!editingMedia}
        onOpenChange={(open) => !open && setEditingMedia(null)}
      />
    </div>
  );
}

interface MediaItemProps {
  item: StoreMedia;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  selectionMode: boolean;
}

function MediaGridItem({ item, isSelected, onToggleSelect, onEdit, selectionMode }: MediaItemProps) {
  return (
    <Card 
      className={`group relative overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border'
      }`}
      onClick={onToggleSelect}
    >
      <div className="aspect-square bg-muted relative">
        <img
          src={item.file_url}
          alt={item.alt_text || item.file_name}
          className="w-full h-full object-cover"
        />
        
        {/* Selection indicator */}
        <div className={`absolute inset-0 transition-colors ${
          isSelected ? 'bg-primary/20' : 'group-hover:bg-black/10'
        }`} />
        
        {/* Checkbox */}
        <div className={`absolute top-2 left-2 transition-opacity ${
          isSelected || !selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {isSelected ? (
            <CheckCircle2 className="h-6 w-6 text-primary fill-background" />
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-white bg-black/30" />
          )}
        </div>

        {/* Edit button */}
        {!selectionMode && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="p-2">
        <p className="text-xs font-medium truncate" title={item.original_name || item.file_name}>
          {item.original_name || item.file_name}
        </p>
        {item.width && item.height && (
          <p className="text-xs text-muted-foreground">
            {item.width}×{item.height}
          </p>
        )}
      </div>
    </Card>
  );
}

function MediaListItem({ item, isSelected, onToggleSelect, onEdit, selectionMode }: MediaItemProps) {
  return (
    <Card 
      className={`flex items-center gap-4 p-3 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
      }`}
      onClick={onToggleSelect}
    >
      <Checkbox checked={isSelected} />
      
      <div className="w-16 h-16 rounded bg-muted flex-shrink-0 overflow-hidden">
        <img
          src={item.file_url}
          alt={item.alt_text || item.file_name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.original_name || item.file_name}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {item.width && item.height && <span>{item.width}×{item.height}</span>}
          {item.file_size && <span>{formatFileSize(item.file_size)}</span>}
          <Badge variant="secondary" className="text-xs">
            {item.mime_type || 'image'}
          </Badge>
        </div>
        {item.alt_text && (
          <p className="text-sm text-muted-foreground truncate mt-1">
            Alt: {item.alt_text}
          </p>
        )}
      </div>

      {!selectionMode && (
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
    </Card>
  );
}
