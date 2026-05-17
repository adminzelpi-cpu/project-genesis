import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSizeGuides, useSizeGuideDetails, SizeGuideDimension } from '../hooks/useSizeGuides';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Ruler, User, Settings, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DimensionImageSelector } from './DimensionImageSelector';
import { findMatchingIllustration } from '../data/dimensionIllustrations';

interface SizeGuideEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guideId: string | null;
  storeId: string | undefined;
}

const TEMPLATES = [
  { value: 'custom', label: 'Personalizado' },
  { value: 'polo', label: 'Polo' },
  { value: 'camiseta', label: 'Camiseta' },
  { value: 'camisa-social', label: 'Camisa Social' },
  { value: 'bermuda', label: 'Bermuda' },
  { value: 'cueca', label: 'Cueca' },
  { value: 'calca', label: 'Calça' },
  { value: 'vestido', label: 'Vestido' },
  { value: 'calcado', label: 'Calçado' },
  { value: 'infantil', label: 'Infantil' },
];

export const SizeGuideEditorDialog = ({ 
  open, 
  onOpenChange, 
  guideId, 
  storeId 
}: SizeGuideEditorDialogProps) => {
  const { createGuide } = useSizeGuides(storeId);
  const { guide, addDimension, updateDimension, deleteDimension, addSize, deleteSize, upsertValue, updateCategories } = useSizeGuideDetails(guideId || undefined);
  
  // Fetch categories directly
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-size-guide', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!storeId,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState('custom');
  const [isActive, setIsActive] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [newDimensionName, setNewDimensionName] = useState('');
  const [newDimensionType, setNewDimensionType] = useState<'piece' | 'body'>('piece');
  const [newSizeName, setNewSizeName] = useState('');

  const [hasUnsavedInfo, setHasUnsavedInfo] = useState(false);
  const isEditing = !!guideId;
  const { updateGuide } = useSizeGuides(storeId);

  useEffect(() => {
    if (guide) {
      setName(guide.name);
      setDescription(guide.description || '');
      setTemplateType(guide.template_type);
      setIsActive(guide.is_active);
      setSelectedCategories(guide.categories.map(c => c.category_id));
    } else {
      setName('');
      setDescription('');
      setTemplateType('custom');
      setIsActive(true);
      setSelectedCategories([]);
    }
  }, [guide, open]);

  // Track info changes for editing mode
  useEffect(() => {
    if (!isEditing || !guide) return;
    const changed = name !== guide.name || 
      description !== (guide.description || '') || 
      templateType !== guide.template_type || 
      isActive !== guide.is_active;
    setHasUnsavedInfo(changed);
  }, [name, description, templateType, isActive, guide, isEditing]);

  const handleSaveInfo = async () => {
    if (!guideId || !hasUnsavedInfo) return;
    await updateGuide.mutateAsync({
      id: guideId,
      name,
      description: description || null,
      template_type: templateType,
      is_active: isActive,
    });
    setHasUnsavedInfo(false);
  };

  const handleSaveAndClose = async () => {
    if (hasUnsavedInfo) {
      await handleSaveInfo();
    }
    onOpenChange(false);
  };

  const handleCreate = async () => {
    const result = await createGuide.mutateAsync({
      name,
      description,
      template_type: templateType,
      is_active: isActive,
    });

    onOpenChange(false);
  };

  const handleAddDimension = () => {
    if (!newDimensionName.trim()) return;
    addDimension.mutate({
      name: newDimensionName,
      measurement_type: newDimensionType,
      position: (guide?.dimensions.length || 0),
    });
    setNewDimensionName('');
  };

  const handleAddSize = () => {
    if (!newSizeName.trim()) return;
    addSize.mutate({
      name: newSizeName,
      position: (guide?.sizes.length || 0),
    });
    setNewSizeName('');
  };

  const handleValueChange = (dimensionId: string, sizeId: string, value: string) => {
    upsertValue.mutate({ dimension_id: dimensionId, size_id: sizeId, value });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(newSelection);
    if (guideId) {
      updateCategories.mutate(newSelection);
    }
  };

  const getValue = (dimensionId: string, sizeId: string) => {
    return guide?.values.find(v => v.dimension_id === dimensionId && v.size_id === sizeId)?.value || '';
  };

  const pieceDimensions = guide?.dimensions.filter(d => d.measurement_type === 'piece') || [];
  const bodyDimensions = guide?.dimensions.filter(d => d.measurement_type === 'body') || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar: ${guide?.name}` : 'Novo Guia de Medidas'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">
              <Settings className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="piece" disabled={!isEditing}>
              <Ruler className="h-4 w-4 mr-2" />
              Medidas da Peça
            </TabsTrigger>
            <TabsTrigger value="body" disabled={!isEditing}>
              <User className="h-4 w-4 mr-2" />
              Medidas do Corpo
            </TabsTrigger>
            <TabsTrigger value="categories" disabled={!isEditing}>
              Categorias
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            {/* Tab: Informações Básicas */}
            <TabsContent value="info" className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Guia</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Guia de Tamanhos - Polos Masculinas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruções ou observações sobre como medir..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Template</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="active">Guia ativo</Label>
              </div>

              {!isEditing && (
                <div className="pt-4">
                  <Button onClick={handleCreate} disabled={!name.trim()}>
                    Criar Guia
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Após criar, você poderá adicionar as medidas e tamanhos.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Tab: Medidas da Peça */}
            <TabsContent value="piece" className="space-y-4 pr-4">
              <DimensionEditor
                dimensions={pieceDimensions}
                sizes={guide?.sizes || []}
                getValue={getValue}
                onValueChange={handleValueChange}
                onDeleteDimension={(id) => deleteDimension.mutate(id)}
                onDeleteSize={(id) => deleteSize.mutate(id)}
                onUpdateDimension={(id, imageUrl, description) => updateDimension.mutate({ id, image_url: imageUrl, description })}
                newDimensionName={newDimensionName}
                onNewDimensionNameChange={setNewDimensionName}
                onAddDimension={() => {
                  setNewDimensionType('piece');
                  handleAddDimension();
                }}
                newSizeName={newSizeName}
                onNewSizeNameChange={setNewSizeName}
                onAddSize={handleAddSize}
                measurementType="piece"
                productCategory={templateType}
              />
            </TabsContent>

            {/* Tab: Medidas do Corpo */}
            <TabsContent value="body" className="space-y-4 pr-4">
              <DimensionEditor
                dimensions={bodyDimensions}
                sizes={guide?.sizes || []}
                getValue={getValue}
                onValueChange={handleValueChange}
                onDeleteDimension={(id) => deleteDimension.mutate(id)}
                onDeleteSize={(id) => deleteSize.mutate(id)}
                onUpdateDimension={(id, imageUrl, description) => updateDimension.mutate({ id, image_url: imageUrl, description })}
                newDimensionName={newDimensionName}
                onNewDimensionNameChange={setNewDimensionName}
                onAddDimension={() => {
                  setNewDimensionType('body');
                  handleAddDimension();
                }}
                newSizeName={newSizeName}
                onNewSizeNameChange={setNewSizeName}
                onAddSize={handleAddSize}
                measurementType="body"
                productCategory={templateType}
              />
            </TabsContent>

            {/* Tab: Categorias */}
            <TabsContent value="categories" className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label>Aplicar automaticamente às categorias:</Label>
                <p className="text-sm text-muted-foreground">
                  Produtos dessas categorias usarão este guia automaticamente
                </p>
              </div>

              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center gap-2">
                    <Checkbox
                      id={category.id}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                    <Label htmlFor={category.id} className="font-normal">
                      {category.name}
                    </Label>
                  </div>
                ))}

                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma categoria cadastrada
                  </p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {isEditing && (
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
              {hasUnsavedInfo ? (
                <span className="text-amber-500">● Alterações não salvas</span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Tudo salvo
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button onClick={handleSaveAndClose} disabled={updateGuide.isPending}>
              {updateGuide.isPending ? 'Salvando...' : 'Salvar e Fechar'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Componente auxiliar para editar dimensões e tamanhos
interface DimensionEditorProps {
  dimensions: SizeGuideDimension[];
  sizes: { id: string; name: string; position: number }[];
  getValue: (dimensionId: string, sizeId: string) => string;
  onValueChange: (dimensionId: string, sizeId: string, value: string) => void;
  onDeleteDimension: (id: string) => void;
  onDeleteSize: (id: string) => void;
  onUpdateDimension: (id: string, imageUrl: string | null, description: string | null) => void;
  newDimensionName: string;
  onNewDimensionNameChange: (value: string) => void;
  onAddDimension: () => void;
  newSizeName: string;
  onNewSizeNameChange: (value: string) => void;
  onAddSize: () => void;
  measurementType: 'piece' | 'body';
  productCategory?: string;
}

const DimensionEditor = ({
  dimensions,
  sizes,
  getValue,
  onValueChange,
  onDeleteDimension,
  onDeleteSize,
  onUpdateDimension,
  newDimensionName,
  onNewDimensionNameChange,
  onAddDimension,
  newSizeName,
  onNewSizeNameChange,
  onAddSize,
  measurementType,
  productCategory,
}: DimensionEditorProps) => {
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<SizeGuideDimension | null>(null);

  const handleOpenImageSelector = (dimension: SizeGuideDimension) => {
    setSelectedDimension(dimension);
    setImageSelectorOpen(true);
  };

  const handleSaveImage = (imageUrl: string | null, description: string | null) => {
    if (selectedDimension) {
      onUpdateDimension(selectedDimension.id, imageUrl, description);
    }
  };

  return (
    <div className="space-y-6">
      {/* Adicionar Tamanhos */}
      <div className="space-y-2">
        <Label>Tamanhos (linhas)</Label>
        <div className="flex gap-2 flex-wrap">
          {sizes.map((size) => (
            <div key={size.id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
              <span className="text-sm font-medium">{size.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onDeleteSize(size.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-1">
            <Input
              value={newSizeName}
              onChange={(e) => onNewSizeNameChange(e.target.value)}
              placeholder="Ex: P, M, G..."
              className="w-24 h-8"
              onKeyDown={(e) => e.key === 'Enter' && onAddSize()}
            />
            <Button size="sm" variant="outline" onClick={onAddSize}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Adicionar Dimensões */}
      <div className="space-y-2">
        <Label>Dimensões (colunas)</Label>
        <div className="flex gap-2 flex-wrap">
          {dimensions.map((dim) => (
            <div key={dim.id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => handleOpenImageSelector(dim)}
                title="Configurar imagem"
              >
                <ImageIcon className={`h-3 w-3 ${dim.image_url ? 'text-primary' : 'text-muted-foreground'}`} />
              </Button>
              <span className="text-sm font-medium">{dim.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onDeleteDimension(dim.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-1">
            <Input
              value={newDimensionName}
              onChange={(e) => onNewDimensionNameChange(e.target.value)}
              placeholder="Ex: Largura, Manga..."
              className="w-32 h-8"
              onKeyDown={(e) => e.key === 'Enter' && onAddDimension()}
            />
            <Button size="sm" variant="outline" onClick={onAddDimension}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Valores */}
      {dimensions.length > 0 && sizes.length > 0 && (
        <div className="space-y-2">
          <Label>Valores das Medidas (cm)</Label>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left font-medium">Tam.</th>
                  {dimensions.map((dim) => (
                    <th key={dim.id} className="p-2 text-center font-medium">
                      {dim.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) => (
                  <tr key={size.id} className="border-t">
                    <td className="p-2 font-medium bg-muted/50">{size.name}</td>
                    {dimensions.map((dim) => (
                      <td key={dim.id} className="p-1">
                        <Input
                          value={getValue(dim.id, size.id)}
                          onChange={(e) => onValueChange(dim.id, size.id, e.target.value)}
                          className="h-8 text-center"
                          placeholder="-"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dimensions.length === 0 && sizes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Adicione tamanhos e dimensões para começar a preencher a tabela
        </p>
      )}

      {/* Image Selector Modal */}
      {selectedDimension && (
        <DimensionImageSelector
          open={imageSelectorOpen}
          onOpenChange={setImageSelectorOpen}
          dimensionName={selectedDimension.name}
          dimensionType={measurementType}
          productCategory={productCategory}
          currentImageUrl={selectedDimension.image_url}
          currentDescription={selectedDimension.description}
          onSave={handleSaveImage}
        />
      )}
    </div>
  );
};
