import { useState } from "react";
import { SectionWithDetails, useHomeSections } from "@/features/storefront/hooks/useHomeSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Image as ImageIcon, Monitor, Smartphone, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BannerEditorProps {
  section: SectionWithDetails;
  storeId: string;
  themeColors?: { button_color?: string; button_text_color?: string } | null;
}

export function BannerEditor({ section, storeId, themeColors }: BannerEditorProps) {
  const { toast } = useToast();
  const { createBanner, updateBanner, deleteBanner } = useHomeSections(storeId);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<typeof section.banners[0] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeImageTab, setActiveImageTab] = useState<'desktop' | 'mobile'>('desktop');
  
  const [formData, setFormData] = useState({
    image_url: "",
    image_url_mobile: "",
    title: "",
    subtitle: "",
    button_text: "",
    button_link: "",
    text_position: "left" as 'left' | 'center' | 'right',
    button_style: "solid" as 'solid' | 'outline',
    title_color: "#ffffff",
    subtitle_color: "#ffffffcc",
    button_bg_color: themeColors?.button_color || "#000000",
    button_text_color: themeColors?.button_text_color || "#ffffff",
    button_border_color: "#ffffff",
  });

  const handleUploadImage = async (file: File, isMobile = false) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}/banners/${Date.now()}-${isMobile ? 'mobile' : 'desktop'}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-logos')
        .getPublicUrl(fileName);

      if (isMobile) {
        setFormData(prev => ({ ...prev, image_url_mobile: publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, image_url: publicUrl }));
      }
      
      toast({ title: `Imagem ${isMobile ? 'mobile' : 'desktop'} carregada` });
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

  const handleSave = () => {
    const commonData = {
      image_url: formData.image_url,
      image_url_mobile: formData.image_url_mobile || null,
      title: formData.title || null,
      subtitle: formData.subtitle || null,
      button_text: formData.button_text || null,
      button_link: formData.button_link || null,
      title_color: formData.title_color || null,
      subtitle_color: formData.subtitle_color || null,
      button_bg_color: formData.button_bg_color || null,
      button_text_color: formData.button_text_color || null,
      button_style: formData.button_style || 'solid',
      button_border_color: formData.button_border_color || null,
      text_position: formData.text_position || 'left',
    };

    if (editingBanner) {
      updateBanner.mutate({
        id: editingBanner.id,
        ...commonData,
      }, {
        onSuccess: () => {
          setEditingBanner(null);
          resetForm();
          toast({ title: "Banner atualizado" });
        }
      });
    } else {
      if (!formData.image_url) {
        toast({ title: "Imagem desktop obrigatória", variant: "destructive" });
        return;
      }
      createBanner.mutate({
        section_id: section.id,
        ...commonData,
      }, {
        onSuccess: () => {
          setShowAddDialog(false);
          resetForm();
        }
      });
    }
  };

  const resetForm = () => {
    setFormData({
      image_url: "",
      image_url_mobile: "",
      title: "",
      subtitle: "",
      button_text: "",
      button_link: "",
      text_position: "left",
      button_style: "solid",
      title_color: "#ffffff",
      subtitle_color: "#ffffffcc",
      button_bg_color: themeColors?.button_color || "#000000",
      button_text_color: themeColors?.button_text_color || "#ffffff",
      button_border_color: "#ffffff",
    });
    setActiveImageTab('desktop');
  };

  const openEditDialog = (banner: typeof section.banners[0]) => {
    setEditingBanner(banner);
    const bannerAny = banner as any;
    setFormData({
      image_url: banner.image_url,
      image_url_mobile: banner.image_url_mobile || "",
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      button_text: banner.button_text || "",
      button_link: banner.button_link || "",
      text_position: bannerAny.text_position || "left",
      button_style: bannerAny.button_style || "solid",
      title_color: bannerAny.title_color || "#ffffff",
      subtitle_color: bannerAny.subtitle_color || "#ffffffcc",
      button_bg_color: bannerAny.button_bg_color || "#000000",
      button_text_color: bannerAny.button_text_color || "#ffffff",
      button_border_color: bannerAny.button_border_color || "#ffffff",
    });
  };

  const banners = section.banners || [];

  return (
    <div className="space-y-4">
      {banners.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-4">Nenhum banner adicionado</p>
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Banner
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {banners.map((banner, index) => (
            <div 
              key={banner.id} 
              className="relative group rounded-lg overflow-hidden border bg-white dark:bg-muted/30"
            >
              {/* Preview proporcional como aparece na loja */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/5' }}>
                <img 
                  src={banner.image_url} 
                  alt={banner.title || `Banner ${index + 1}`} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              
              {/* Hover actions only */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 bg-black/40">
                <Button 
                  size="icon" 
                  variant="secondary"
                  onClick={() => openEditDialog(banner)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="destructive"
                  onClick={() => deleteBanner.mutate(banner.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Info badge - minimal */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded truncate max-w-[70%]">
                  {banner.title || `Slide ${index + 1}`}
                </span>
                {banner.image_url_mobile && (
                  <span className="bg-primary/80 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Smartphone className="h-3 w-3" /> Mobile
                  </span>
                )}
              </div>
            </div>
          ))}
          
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

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || !!editingBanner} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setEditingBanner(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Editar Banner" : "Novo Banner"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Image Upload Tabs */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Imagens</Label>
              <Tabs value={activeImageTab} onValueChange={(v) => setActiveImageTab(v as 'desktop' | 'mobile')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="desktop" className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" /> Desktop *
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> Mobile
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="desktop" className="mt-4">
                  {formData.image_url ? (
                    <div className="relative rounded-lg overflow-hidden border bg-muted/30 group">
                      <div className="relative w-full" style={{ aspectRatio: '16/5' }}>
                        <img src={formData.image_url} alt="Preview Desktop" className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadImage(file, false); }} />
                          <Button type="button" size="sm" variant="secondary" asChild><span><Upload className="h-4 w-4 mr-1" /> Trocar</span></Button>
                        </label>
                        <Button type="button" size="sm" variant="destructive" onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}>
                          <X className="h-4 w-4 mr-1" /> Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadImage(file, false); }} />
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-medium mb-1">Clique para enviar a imagem desktop</p>
                        <p className="text-xs text-muted-foreground">
                          Recomendado: 1920×600px (proporção ~3:1)
                        </p>
                      </div>
                    </label>
                  )}
                </TabsContent>
                
                <TabsContent value="mobile" className="mt-4">
                  {formData.image_url_mobile ? (
                    <div className="relative rounded-lg overflow-hidden border bg-muted/30 group mx-auto max-w-[200px]">
                      <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
                        <img src={formData.image_url_mobile} alt="Preview Mobile" className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadImage(file, true); }} />
                          <Button type="button" size="sm" variant="secondary" asChild><span><Upload className="h-4 w-4 mr-1" /> Trocar</span></Button>
                        </label>
                        <Button type="button" size="sm" variant="destructive" onClick={() => setFormData(prev => ({ ...prev, image_url_mobile: '' }))}>
                          <X className="h-4 w-4 mr-1" /> Remover
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUploadImage(file, true); }} />
                      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                        <Smartphone className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm font-medium mb-1">Clique para enviar a imagem mobile</p>
                        <p className="text-xs text-muted-foreground">
                          Recomendado: 750×1000px (proporção 3:4). Opcional — sem ela, usa a desktop.
                        </p>
                      </div>
                    </label>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Text Content */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-medium">Texto do Banner (opcional)</Label>
              
              <div className="space-y-2">
                <Label htmlFor="banner-title">Título Principal</Label>
                <Input
                  id="banner-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Nova Coleção Verão"
                  className="text-lg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="banner-subtitle">Subtítulo</Label>
                <Textarea
                  id="banner-subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Ex: Peças leves e estilosas para o verão"
                  rows={2}
                />
              </div>
            </div>

            {/* Position & Style */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-medium">Posição e Estilo</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Posição do Conteúdo</Label>
                  <Select
                    value={formData.text_position}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, text_position: v as any }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
            </div>

            {/* Button/CTA */}
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-medium">Botão de Ação (opcional)</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Texto do Botão</Label>
                  <Input
                    value={formData.button_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                    placeholder="Ex: Ver Coleção"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Link</Label>
                  <Input
                    value={formData.button_link}
                    onChange={(e) => setFormData(prev => ({ ...prev, button_link: e.target.value }))}
                    placeholder="Ex: /category/verao"
                  />
                </div>
              </div>
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

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setEditingBanner(null);
              resetForm();
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={createBanner.isPending || updateBanner.isPending || uploading}
            >
              {editingBanner ? "Salvar" : "Adicionar Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}