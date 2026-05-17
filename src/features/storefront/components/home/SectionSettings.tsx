import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { SectionWithDetails, SectionType } from "@/features/storefront/hooks/useHomeSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";

interface SectionSettingsProps {
  section: SectionWithDetails;
  onSave: (settings: Record<string, unknown>, title?: string, subtitle?: string) => void;
}

interface SectionSettingsState {
  title: string;
  subtitle: string;
  // Carousel settings
  carousel_autoplay: boolean;
  carousel_autoplay_interval: number;
  carousel_visible_mobile: number;
  carousel_visible_tablet: number;
  carousel_visible_desktop: number;
  // Banner height settings
  banner_height_desktop: number;
  banner_height_mobile: number;
  // Category image settings
  category_image_aspect: '1:1' | '3:4' | '2:3';
  // Display settings
  title_alignment: 'left' | 'center' | 'right';
  show_button: boolean;
  button_text: string;
  button_link: string;
}

const DEFAULT_SETTINGS: Record<SectionType, Partial<SectionSettingsState>> = {
  banner_carousel: {
    carousel_autoplay: true,
    carousel_autoplay_interval: 5000,
    banner_height_desktop: 500,
    banner_height_mobile: 400,
  },
  featured_categories: {
    carousel_visible_mobile: 1.3,
    carousel_visible_tablet: 2.5,
    carousel_visible_desktop: 4,
    category_image_aspect: '3:4',
    title_alignment: 'left',
    show_button: true,
    button_text: 'Ver todas',
    button_link: '',
  },
  featured_products: {
    carousel_visible_mobile: 1.5,
    carousel_visible_tablet: 2.5,
    carousel_visible_desktop: 4,
    title_alignment: 'left',
    show_button: true,
    button_text: 'Ver todos',
    button_link: '',
  },
  new_arrivals: {
    carousel_visible_mobile: 1.5,
    carousel_visible_tablet: 2.5,
    carousel_visible_desktop: 4,
    title_alignment: 'left',
    show_button: true,
    button_text: 'Ver novidades',
    button_link: '',
  },
};

export function SectionSettings({ section, onSave }: SectionSettingsProps) {
  const [open, setOpen] = useState(false);
  
  const existingSettings = (section.settings || {}) as Partial<SectionSettingsState>;
  const defaults = DEFAULT_SETTINGS[section.section_type] || {};
  
  const [settings, setSettings] = useState<SectionSettingsState>({
    title: section.title || '',
    subtitle: section.subtitle || '',
    carousel_autoplay: existingSettings.carousel_autoplay ?? defaults.carousel_autoplay ?? true,
    carousel_autoplay_interval: existingSettings.carousel_autoplay_interval ?? defaults.carousel_autoplay_interval ?? 5000,
    carousel_visible_mobile: existingSettings.carousel_visible_mobile ?? defaults.carousel_visible_mobile ?? 1.3,
    carousel_visible_tablet: existingSettings.carousel_visible_tablet ?? defaults.carousel_visible_tablet ?? 2.5,
    carousel_visible_desktop: existingSettings.carousel_visible_desktop ?? defaults.carousel_visible_desktop ?? 4,
    banner_height_desktop: existingSettings.banner_height_desktop ?? defaults.banner_height_desktop ?? 500,
    banner_height_mobile: existingSettings.banner_height_mobile ?? defaults.banner_height_mobile ?? 400,
    category_image_aspect: (existingSettings as any).category_image_aspect ?? (defaults as any).category_image_aspect ?? '3:4',
    title_alignment: existingSettings.title_alignment ?? defaults.title_alignment ?? 'left',
    show_button: existingSettings.show_button ?? defaults.show_button ?? true,
    button_text: existingSettings.button_text ?? defaults.button_text ?? 'Ver mais',
    button_link: existingSettings.button_link ?? defaults.button_link ?? '',
  });

  const handleSave = () => {
    const { title, subtitle, ...settingsOnly } = settings;
    onSave(settingsOnly, title || undefined, subtitle || undefined);
    setOpen(false);
  };

  const isBannerCarousel = section.section_type === 'banner_carousel';
  const isFeaturedCategories = section.section_type === 'featured_categories';
  const isCategoryOrProduct = ['featured_categories', 'featured_products', 'new_arrivals'].includes(section.section_type);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurações da Seção</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Title & Subtitle */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Seção</Label>
                <Input
                  id="title"
                  value={settings.title}
                  onChange={(e) => setSettings(s => ({ ...s, title: e.target.value }))}
                  placeholder="Ex: Produtos em Destaque"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtítulo (opcional)</Label>
                <Input
                  id="subtitle"
                  value={settings.subtitle}
                  onChange={(e) => setSettings(s => ({ ...s, subtitle: e.target.value }))}
                  placeholder="Ex: Os favoritos dos nossos clientes"
                />
              </div>
            </div>

            {/* Banner Carousel Settings */}
            {isBannerCarousel && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Configurações do Carousel</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Rotação Automática</Label>
                    <p className="text-xs text-muted-foreground">Trocar slides automaticamente</p>
                  </div>
                  <Switch
                    checked={settings.carousel_autoplay}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, carousel_autoplay: checked }))}
                  />
                </div>

                {settings.carousel_autoplay && (
                  <div className="space-y-2">
                    <Label>Intervalo (segundos)</Label>
                    <Select
                      value={String(settings.carousel_autoplay_interval / 1000)}
                      onValueChange={(v) => setSettings(s => ({ ...s, carousel_autoplay_interval: Number(v) * 1000 }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 segundos</SelectItem>
                        <SelectItem value="5">5 segundos</SelectItem>
                        <SelectItem value="7">7 segundos</SelectItem>
                        <SelectItem value="10">10 segundos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm">Altura do Banner</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Desktop</Label>
                        <span className="text-xs text-muted-foreground">{settings.banner_height_desktop}px</span>
                      </div>
                      <Slider
                        value={[settings.banner_height_desktop]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, banner_height_desktop: v }))}
                        min={300}
                        max={700}
                        step={25}
                      />
                      <p className="text-[10px] text-muted-foreground">Min: 300px — Max: 700px</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Mobile</Label>
                        <span className="text-xs text-muted-foreground">{settings.banner_height_mobile}px</span>
                      </div>
                      <Slider
                        value={[settings.banner_height_mobile]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, banner_height_mobile: v }))}
                        min={200}
                        max={500}
                        step={25}
                      />
                      <p className="text-[10px] text-muted-foreground">Min: 200px — Max: 500px</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Category/Product Carousel Settings */}
            {isCategoryOrProduct && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium text-sm">Itens Visíveis no Carousel</h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Mobile</Label>
                    <Select
                      value={String(settings.carousel_visible_mobile)}
                      onValueChange={(v) => setSettings(s => ({ ...s, carousel_visible_mobile: Number(v) }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="1.3">1.3</SelectItem>
                        <SelectItem value="1.5">1.5</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tablet</Label>
                    <Select
                      value={String(settings.carousel_visible_tablet)}
                      onValueChange={(v) => setSettings(s => ({ ...s, carousel_visible_tablet: Number(v) }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="2.5">2.5</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="3.5">3.5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Desktop</Label>
                    <Select
                      value={String(settings.carousel_visible_desktop)}
                      onValueChange={(v) => setSettings(s => ({ ...s, carousel_visible_desktop: Number(v) }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="3.5">3.5</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                      </SelectContent>
                    </Select>
                </div>

                {/* Category Image Aspect Ratio */}
                {isFeaturedCategories && (
                  <div className="space-y-2">
                    <Label>Formato da Imagem</Label>
                    <Select
                      value={settings.category_image_aspect}
                      onValueChange={(v) => setSettings(s => ({ ...s, category_image_aspect: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">Quadrado (1:1) — 800×800px</SelectItem>
                        <SelectItem value="3:4">Vertical (3:4) — 800×1067px</SelectItem>
                        <SelectItem value="2:3">Vertical Alto (2:3) — 800×1200px</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Recomendado: envie imagens de ~800px de largura no formato escolhido
                    </p>
                  </div>
                )}
                </div>

                <div className="space-y-2">
                  <Label>Alinhamento do Título</Label>
                  <Select
                    value={settings.title_alignment}
                    onValueChange={(v) => setSettings(s => ({ ...s, title_alignment: v as 'left' | 'center' | 'right' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar Botão "Ver Mais"</Label>
                    <p className="text-xs text-muted-foreground">Exibir link para ver mais itens</p>
                  </div>
                  <Switch
                    checked={settings.show_button}
                    onCheckedChange={(checked) => setSettings(s => ({ ...s, show_button: checked }))}
                  />
                </div>

                {settings.show_button && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Texto do Botão</Label>
                      <Input
                        value={settings.button_text}
                        onChange={(e) => setSettings(s => ({ ...s, button_text: e.target.value }))}
                        placeholder="Ver todos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Link (opcional)</Label>
                      <Input
                        value={settings.button_link}
                        onChange={(e) => setSettings(s => ({ ...s, button_link: e.target.value }))}
                        placeholder="/category/slug"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}