import { useState, useEffect } from "react";
import { useStore } from "@/features/stores/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { useHomeSections, SectionType, SectionWithDetails } from "@/features/storefront/hooks/useHomeSections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, GripVertical, Trash2, Eye, EyeOff, Image, Grid3X3, Package, Sparkles, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BannerEditor } from "@/features/storefront/components/home/BannerEditor";
import { ItemsEditor } from "@/features/storefront/components/home/ItemsEditor";
import { CategoryItemEditor } from "@/features/storefront/components/home/CategoryItemEditor";
import { SectionSettings } from "@/features/storefront/components/home/SectionSettings";
import type { Store } from "@/features/stores/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

const SECTION_TYPES: { type: SectionType; label: string; description: string; icon: React.ReactNode }[] = [
  { type: 'banner_carousel', label: 'Banner Carousel', description: 'Slides rotativos com imagens, textos e CTAs', icon: <Image className="h-5 w-5" /> },
  { type: 'featured_categories', label: 'Categorias em Destaque', description: 'Cards com imagens das categorias principais', icon: <Grid3X3 className="h-5 w-5" /> },
  { type: 'featured_products', label: 'Produtos em Destaque', description: 'Produtos selecionados manualmente', icon: <Package className="h-5 w-5" /> },
  { type: 'new_arrivals', label: 'Novidades / Lançamentos', description: 'Produtos mais recentes da loja', icon: <Sparkles className="h-5 w-5" /> },
];

export default function StoreHome() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { getMyStores, loading: storeLoading } = useStore();
  const [store, setStore] = useState<Store | null>(null);
  const [storeThemeColors, setStoreThemeColors] = useState<{ button_color?: string; button_text_color?: string } | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  
  const { sections, isLoading, createSection, updateSection, deleteSection, reorderSections } = useHomeSections(store?.id);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSectionType, setNewSectionType] = useState<SectionType | null>(null);

  useEffect(() => {
    const loadStore = async () => {
      if (!user) return;
      setLoadingStore(true);
      const { stores } = await getMyStores();
      if (stores && stores.length > 0) {
        const s = stores[0] as Store;
        setStore(s);
        // Fetch theme colors for default banner/category colors
        const { data: themeData } = await supabase
          .from('stores')
          .select('button_color, button_text_color')
          .eq('id', s.id)
          .single();
        if (themeData) {
          setStoreThemeColors({
            button_color: (themeData as any).button_color || undefined,
            button_text_color: (themeData as any).button_text_color || undefined,
          });
        }
      }
      setLoadingStore(false);
    };
    loadStore();
  }, [user]);

  // Create default sections for new stores
  const createDefaultSections = async () => {
    if (!store?.id || sections.length > 0) return;
    
    try {
      // Create banner carousel
      await supabase.from('store_home_sections').insert({
        store_id: store.id,
        section_type: 'banner_carousel',
        title: null,
        subtitle: null,
        position: 0,
        settings: { carousel_autoplay: true, carousel_autoplay_interval: 5000 },
      });

      // Create featured categories
      await supabase.from('store_home_sections').insert({
        store_id: store.id,
        section_type: 'featured_categories',
        title: 'Categorias',
        subtitle: 'Explore nossas categorias',
        position: 1,
        settings: { carousel_visible_mobile: 1.3, carousel_visible_tablet: 2.5, carousel_visible_desktop: 4 },
      });

      // Create featured products
      await supabase.from('store_home_sections').insert({
        store_id: store.id,
        section_type: 'featured_products',
        title: 'Produtos em Destaque',
        subtitle: 'Os favoritos dos nossos clientes',
        position: 2,
        settings: { carousel_visible_mobile: 1.5, carousel_visible_tablet: 2.5, carousel_visible_desktop: 4 },
      });

      // Create new arrivals
      await supabase.from('store_home_sections').insert({
        store_id: store.id,
        section_type: 'new_arrivals',
        title: 'Novidades',
        subtitle: 'Confira os últimos lançamentos',
        position: 3,
        settings: { carousel_visible_mobile: 1.5, carousel_visible_tablet: 2.5, carousel_visible_desktop: 4 },
      });

      toast({ title: "Estrutura padrão criada", description: "Personalize as seções da sua home" });
      window.location.reload();
    } catch (error) {
      console.error('Error creating default sections:', error);
    }
  };

  const handleAddSection = () => {
    if (!newSectionType) return;
    
    const defaultSettings = SECTION_TYPES.find(t => t.type === newSectionType);
    
    createSection.mutate({
      section_type: newSectionType,
      title: defaultSettings?.label || undefined,
      subtitle: undefined,
    }, {
      onSuccess: () => {
        setShowAddDialog(false);
        setNewSectionType(null);
      }
    });
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    const newOrder = [...sections];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    
    reorderSections.mutate(newOrder.map(s => s.id));
  };

  const handleToggleActive = (section: SectionWithDetails) => {
    updateSection.mutate({ id: section.id, is_active: !section.is_active });
  };

  const handleSaveSettings = (sectionId: string, settings: Record<string, unknown>, title?: string, subtitle?: string) => {
    updateSection.mutate({ 
      id: sectionId, 
      title: title || null,
      subtitle: subtitle || null,
    });
    // Update settings separately via direct update
    supabase
      .from('store_home_sections')
      .update({ settings: settings as unknown as Json })
      .eq('id', sectionId)
      .then(() => {
        toast({ title: "Configurações salvas" });
      });
  };

  const getSectionIcon = (type: SectionType) => {
    const found = SECTION_TYPES.find(s => s.type === type);
    return found?.icon || <Package className="h-5 w-5" />;
  };

  const getSectionLabel = (type: SectionType) => {
    const found = SECTION_TYPES.find(s => s.type === type);
    return found?.label || type;
  };

  if (loadingStore || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Você precisa ter uma loja para configurar a home.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Página Inicial</h1>
          <p className="text-muted-foreground">Configure as seções da home da sua loja</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/store/${store.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Loja
            </a>
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Seção
          </Button>
        </div>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Image className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-2">Nenhuma seção configurada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie uma estrutura padrão ou adicione seções manualmente
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={createDefaultSections}>
                <Sparkles className="h-4 w-4 mr-2" />
                Criar Estrutura Padrão
              </Button>
              <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card key={section.id} className={!section.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  {/* Drag Handle + Icon */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    <div className="p-2 rounded-lg bg-muted">
                      {getSectionIcon(section.section_type)}
                    </div>
                  </div>
                  
                  {/* Title and Type */}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {section.title || getSectionLabel(section.section_type)}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {section.subtitle || getSectionLabel(section.section_type)}
                    </CardDescription>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Settings */}
                    <SectionSettings 
                      section={section} 
                      onSave={(settings, title, subtitle) => handleSaveSettings(section.id, settings, title, subtitle)}
                    />

                    {/* Move buttons */}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === 0}
                      onClick={() => handleMoveSection(section.id, 'up')}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === sections.length - 1}
                      onClick={() => handleMoveSection(section.id, 'down')}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    {/* Toggle visibility */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(section)}
                    >
                      {section.is_active ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSection.mutate(section.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Section-specific editor */}
                {section.section_type === 'banner_carousel' && (
                  <BannerEditor section={section} storeId={store.id} themeColors={storeThemeColors} />
                )}
                {section.section_type === 'featured_categories' && (
                  <CategoryItemEditor section={section} storeId={store.id} themeColors={storeThemeColors} />
                )}
                {(section.section_type === 'featured_products' ||
                  section.section_type === 'new_arrivals') && (
                  <ItemsEditor section={section} storeId={store.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Section Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Seção</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Section Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              {SECTION_TYPES.map((type) => (
                <button
                  key={type.type}
                  onClick={() => setNewSectionType(type.type)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    newSectionType === type.type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {type.icon}
                    <span className="font-medium text-sm">{type.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddSection} 
              disabled={!newSectionType || createSection.isPending}
            >
              Adicionar Seção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}