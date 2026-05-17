import { useState, useEffect } from "react";
import { SectionWithDetails, useHomeSections, HomeItem } from "@/features/storefront/hooks/useHomeSections";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Grid3X3, Edit2, ImageIcon, Upload, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProductCategory } from "@/features/categories/types";

interface CategoryItemEditorProps {
  section: SectionWithDetails;
  storeId: string;
  themeColors?: { button_color?: string; button_text_color?: string } | null;
}

interface ExtendedHomeItem extends HomeItem {
  custom_image_url?: string | null;
  custom_title?: string | null;
  custom_subtitle?: string | null;
  custom_button_text?: string | null;
  custom_button_link?: string | null;
  title_color?: string | null;
  subtitle_color?: string | null;
  button_style?: string | null;
  button_border_color?: string | null;
  button_bg_color?: string | null;
  button_text_color?: string | null;
}

export function CategoryItemEditor({ section, storeId, themeColors }: CategoryItemEditorProps) {
  const { toast } = useToast();
  const { addItem, removeItem } = useHomeSections(storeId);
  const { getStoreCategories } = useCategories();
  
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtendedHomeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    custom_image_url: "",
    custom_title: "",
    custom_subtitle: "",
    custom_button_text: "",
    custom_button_link: "",
    title_color: "#ffffff",
    subtitle_color: "#ffffffcc",
    button_style: "solid" as 'solid' | 'outline',
    button_border_color: "#ffffff",
    button_bg_color: themeColors?.button_color || "#000000",
    button_text_color: themeColors?.button_text_color || "#ffffff",
  });

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      const cats = await getStoreCategories(storeId);
      setCategories(cats);
      setLoading(false);
    };
    loadCategories();
  }, [storeId]);

  const items = (section.items || []) as ExtendedHomeItem[];
  const selectedItemIds = items.map(i => i.item_id);

  const getCategoryDetails = (itemId: string) => {
    return categories.find(c => c.id === itemId);
  };

  const handleAddItem = (categoryId: string) => {
    addItem.mutate({
      section_id: section.id,
      item_type: 'category',
      item_id: categoryId,
    }, {
      onSuccess: () => {
        setShowAddDialog(false);
        setSearchQuery("");
      }
    });
  };

  const handleUploadImage = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}/categories/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-logos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, custom_image_url: publicUrl }));
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const openEditDialog = (item: ExtendedHomeItem) => {
    setEditingItem(item);
    setFormData({
      custom_image_url: item.custom_image_url || "",
      custom_title: item.custom_title || "",
      custom_subtitle: item.custom_subtitle || "",
      custom_button_text: item.custom_button_text || "",
      custom_button_link: item.custom_button_link || "",
      title_color: item.title_color || "#ffffff",
      subtitle_color: item.subtitle_color || "#ffffffcc",
      button_style: (item.button_style as any) || "solid",
      button_border_color: item.button_border_color || "#ffffff",
      button_bg_color: item.button_bg_color || "#000000",
      button_text_color: item.button_text_color || "#ffffff",
    });
  };

  const handleSaveItem = async () => {
    if (!editingItem) return;
    
    try {
      const { error } = await supabase
        .from('store_home_items')
        .update({
          custom_image_url: formData.custom_image_url || null,
          custom_title: formData.custom_title || null,
          custom_subtitle: formData.custom_subtitle || null,
          custom_button_text: formData.custom_button_text || null,
          custom_button_link: formData.custom_button_link || null,
          title_color: formData.title_color || null,
          subtitle_color: formData.subtitle_color || null,
          button_style: formData.button_style || 'solid',
          button_border_color: formData.button_border_color || null,
          button_bg_color: formData.button_bg_color || null,
          button_text_color: formData.button_text_color || null,
        })
        .eq('id', editingItem.id);

      if (error) throw error;
      
      toast({ title: "Categoria atualizada" });
      setEditingItem(null);
      // Trigger refetch
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      custom_image_url: "",
      custom_title: "",
      custom_subtitle: "",
      custom_button_text: "",
      custom_button_link: "",
      title_color: "#ffffff",
      subtitle_color: "#ffffffcc",
      button_style: "solid",
      button_border_color: "#ffffff",
      button_bg_color: themeColors?.button_color || "#000000",
      button_text_color: themeColors?.button_text_color || "#ffffff",
    });
  };

  const availableCategories = categories.filter(c => !selectedItemIds.includes(c.id));
  const filteredCategories = availableCategories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Skeleton className="h-20 w-full" />;
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Grid3X3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            Nenhuma categoria selecionada
          </p>
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const category = getCategoryDetails(item.item_id);
            if (!category) return null;

            const displayImage = item.custom_image_url;
            const displayTitle = item.custom_title || category.name;

            return (
              <div 
                key={item.id}
                className="relative group rounded-lg overflow-hidden border bg-muted/50"
              >
                {displayImage ? (
                  <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
                    <img 
                      src={displayImage} 
                      alt={displayTitle} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                    <Grid3X3 className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
                
                {/* Info badge - minimal, no overlay */}
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="bg-black/60 text-white text-xs px-2 py-1 rounded truncate block max-w-full">
                    {displayTitle}
                    {item.custom_subtitle && (
                      <span className="text-white/70 ml-1">• {item.custom_subtitle}</span>
                    )}
                  </span>
                </div>

                {/* Hover actions only */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button 
                    size="icon" 
                    variant="secondary"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="destructive"
                    onClick={() => removeItem.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          
          {/* Add button */}
          <button
            onClick={() => setShowAddDialog(true)}
            className="border-2 border-dashed rounded-lg min-h-[120px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs">Adicionar</span>
          </button>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Categoria</DialogTitle>
          </DialogHeader>
          
          <Command className="border rounded-lg">
            <CommandInput 
              placeholder="Buscar categoria..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
              <CommandGroup heading="Categorias">
                {filteredCategories.map((category) => (
                  <CommandItem
                    key={category.id}
                    onSelect={() => handleAddItem(category.id)}
                    className="cursor-pointer"
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    {category.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => {
        if (!open) {
          setEditingItem(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personalizar Categoria</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem Personalizada</Label>
              {formData.custom_image_url ? (
                <div className="relative rounded-lg overflow-hidden border bg-muted/30 group max-w-[200px]">
                  <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
                    <img src={formData.custom_image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadImage(file); }} />
                      <Button type="button" size="sm" variant="secondary" asChild><span><Upload className="h-4 w-4 mr-1" /> Trocar</span></Button>
                    </label>
                    <Button type="button" size="sm" variant="destructive" onClick={() => setFormData(prev => ({ ...prev, custom_image_url: '' }))}>
                      <X className="h-4 w-4 mr-1" /> Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadImage(file); }} />
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium mb-1">Clique para enviar a imagem</p>
                    <p className="text-xs text-muted-foreground">Recomendado: proporção 3:4 de alta qualidade</p>
                  </div>
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título Personalizado</Label>
                <Input
                  value={formData.custom_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_title: e.target.value }))}
                  placeholder={editingItem ? getCategoryDetails(editingItem.item_id)?.name : ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input
                  value={formData.custom_subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_subtitle: e.target.value }))}
                  placeholder="Ex: 20% OFF"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Texto do Botão</Label>
                <Input
                  value={formData.custom_button_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_button_text: e.target.value }))}
                  placeholder="Ex: Ver coleção"
                />
              </div>
              <div className="space-y-2">
                <Label>Link Personalizado</Label>
                <Input
                  value={formData.custom_button_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_button_link: e.target.value }))}
                  placeholder="Deixe vazio para usar padrão"
                />
              </div>
            </div>

            {/* Button Style */}
            <div className="space-y-2">
              <Label>Estilo do Botão</Label>
              <Select
                value={formData.button_style}
                onValueChange={(v) => setFormData(prev => ({ ...prev, button_style: v as any }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Sólido (com fundo)</SelectItem>
                  <SelectItem value="outline">Bordas (sem fundo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cores */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-medium">Cores do Texto e Botão</Label>
              <p className="text-xs text-muted-foreground -mt-2">Ajuste as cores para destacar sobre sua imagem</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cor do Título</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.title_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, title_color: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.title_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, title_color: e.target.value }))}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor do Subtítulo</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.subtitle_color.replace('cc', '')}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitle_color: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.subtitle_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, subtitle_color: e.target.value }))}
                      placeholder="#ffffffcc"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{formData.button_style === 'solid' ? 'Fundo do Botão' : 'Cor da Borda'}</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.button_style === 'outline' ? formData.button_border_color : formData.button_bg_color}
                      onChange={(e) => {
                        if (formData.button_style === 'outline') {
                          setFormData(prev => ({ ...prev, button_border_color: e.target.value }));
                        } else {
                          setFormData(prev => ({ ...prev, button_bg_color: e.target.value }));
                        }
                      }}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.button_style === 'outline' ? formData.button_border_color : formData.button_bg_color}
                      onChange={(e) => {
                        if (formData.button_style === 'outline') {
                          setFormData(prev => ({ ...prev, button_border_color: e.target.value }));
                        } else {
                          setFormData(prev => ({ ...prev, button_bg_color: e.target.value }));
                        }
                      }}
                      placeholder={formData.button_style === 'outline' ? '#ffffff' : '#000000'}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor do Texto do Botão</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.button_text_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, button_text_color: e.target.value }))}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={formData.button_text_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, button_text_color: e.target.value }))}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingItem(null);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItem} disabled={uploading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}