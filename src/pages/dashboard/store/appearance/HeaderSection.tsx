import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { HexColorPicker } from "@/components/ui/hex-color-picker";
import { Image, Upload, Trash2, Loader2, Store, Search, Heart, ShoppingCart, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { HeaderLayout, MobileLogoPosition } from "./types";

interface HeaderSectionProps {
  storeName: string;
  storeId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  headerBgColor: string;
  headerTextColor: string;
  headerLayout: HeaderLayout;
  headerShowFavorites: boolean;
  headerShowSearch: boolean;
  headerMobileLogoPosition: MobileLogoPosition;
  onLogoChange: (url: string | null) => void;
  onFaviconChange: (url: string | null) => void;
  onHeaderBgColorChange: (v: string) => void;
  onHeaderTextColorChange: (v: string) => void;
  onHeaderLayoutChange: (v: HeaderLayout) => void;
  onHeaderShowFavoritesChange: (v: boolean) => void;
  onHeaderShowSearchChange: (v: boolean) => void;
  onHeaderMobileLogoPositionChange: (v: MobileLogoPosition) => void;
  refreshStore: () => void;
}

export function HeaderSection({
  storeName, storeId, logoUrl, faviconUrl,
  headerBgColor, headerTextColor, headerLayout,
  headerShowFavorites, headerShowSearch, headerMobileLogoPosition,
  onLogoChange, onFaviconChange,
  onHeaderBgColorChange, onHeaderTextColorChange, onHeaderLayoutChange,
  onHeaderShowFavoritesChange, onHeaderShowSearchChange, onHeaderMobileLogoPositionChange,
  refreshStore,
}: HeaderSectionProps) {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 2MB"); return; }
    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}/logo.${fileExt}`;
      if (logoUrl) {
        const oldPath = logoUrl.split('/store-logos/')[1];
        if (oldPath) await supabase.storage.from('store-logos').remove([oldPath]);
      }
      const { error: uploadError } = await supabase.storage.from('store-logos').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('store-logos').getPublicUrl(fileName);
      onLogoChange(publicUrl);
      toast.success("Logo atualizado!");
    } catch { toast.error("Erro ao fazer upload do logo"); }
    finally { setIsUploadingLogo(false); if (headerLogoInputRef.current) headerLogoInputRef.current.value = ''; }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl) return;
    setIsUploadingLogo(true);
    try {
      const oldPath = logoUrl.split('/store-logos/')[1];
      if (oldPath) await supabase.storage.from('store-logos').remove([oldPath]);
      onLogoChange(null);
      toast.success("Logo removido!");
    } catch { toast.error("Erro ao remover logo"); }
    finally { setIsUploadingLogo(false); }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size > 500 * 1024) { toast.error("O favicon deve ter no máximo 500KB"); return; }
    setIsUploadingFavicon(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${storeId}/favicon.${fileExt}`;
      if (faviconUrl) {
        const oldPath = faviconUrl.split('/store-logos/')[1];
        if (oldPath) await supabase.storage.from('store-logos').remove([oldPath]);
      }
      const { error: uploadError } = await supabase.storage.from('store-logos').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('store-logos').getPublicUrl(fileName);
      onFaviconChange(publicUrl);
      toast.success("Favicon atualizado!");
    } catch { toast.error("Erro ao fazer upload do favicon"); }
    finally { setIsUploadingFavicon(false); if (faviconInputRef.current) faviconInputRef.current.value = ''; }
  };

  const handleRemoveFavicon = async () => {
    if (!faviconUrl) return;
    setIsUploadingFavicon(true);
    try {
      const oldPath = faviconUrl.split('/store-logos/')[1];
      if (oldPath) await supabase.storage.from('store-logos').remove([oldPath]);
      onFaviconChange(null);
      toast.success("Favicon removido!");
    } catch { toast.error("Erro ao remover favicon"); }
    finally { setIsUploadingFavicon(false); }
  };

  return (
    <div className="space-y-8">
      {/* Logo + Favicon side by side */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Logo da Loja</Label>
          {logoUrl ? (
            <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-4">
              <div className="bg-background rounded-md p-2 border">
                <img src={logoUrl} alt="Logo" className="max-h-10 max-w-[120px] object-contain" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => headerLogoInputRef.current?.click()} disabled={isUploadingLogo}>
                  {isUploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRemoveLogo} disabled={isUploadingLogo} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-foreground/30 transition-colors"
              onClick={() => headerLogoInputRef.current?.click()}
            >
              {isUploadingLogo ? <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" /> : <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}
              <p className="text-xs text-muted-foreground">PNG, JPG ou SVG • Máx 2MB</p>
            </div>
          )}
          <input ref={headerLogoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>

        {/* Favicon */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Favicon</Label>
          {faviconUrl ? (
            <div className="flex items-center gap-4 rounded-lg border bg-muted/20 p-4">
              <div className="bg-background rounded-md p-2 border">
                <img src={faviconUrl} alt="Favicon" className="h-6 w-6 object-contain" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => faviconInputRef.current?.click()} disabled={isUploadingFavicon}>
                  {isUploadingFavicon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="outline" size="sm" onClick={handleRemoveFavicon} disabled={isUploadingFavicon} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-foreground/30 transition-colors"
              onClick={() => faviconInputRef.current?.click()}
            >
              {isUploadingFavicon ? <Loader2 className="h-6 w-6 mx-auto text-muted-foreground mb-2 animate-spin" /> : <Image className="h-6 w-6 mx-auto text-muted-foreground mb-2" />}
              <p className="text-xs text-muted-foreground">32×32px • PNG, ICO ou SVG</p>
            </div>
          )}
          <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/svg+xml,.ico" onChange={handleFaviconUpload} className="hidden" />
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Cores</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Fundo</Label>
            <HexColorPicker value={headerBgColor} onChange={onHeaderBgColorChange} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Texto / Ícones</Label>
            <HexColorPicker value={headerTextColor} onChange={onHeaderTextColorChange} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Prévia</Label>
        <div className="rounded-lg border overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: headerBgColor, color: headerTextColor }}>
            <div className="flex items-center gap-2">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="h-7 object-contain" /> : <><Store className="h-4 w-4" /><span className="font-bold text-sm">{storeName}</span></>}
            </div>
            <div className="flex items-center gap-2.5">
              {headerShowSearch && <Search className="h-4 w-4" />}
              <User className="h-4 w-4" />
              {headerShowFavorites && <Heart className="h-4 w-4" />}
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Layout Options */}
      <div className="space-y-4">
        <Label className="text-sm font-semibold">Opções</Label>
        
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Largura do conteúdo</Label>
          <RadioGroup value={headerLayout} onValueChange={(v) => onHeaderLayoutChange(v as HeaderLayout)} className="flex flex-wrap gap-3">
            {[
              { value: 'default', label: 'Padrão' },
              { value: 'wide', label: 'Largo' },
              { value: 'full', label: 'Tela cheia' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value={opt.value} />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground">Logo no mobile</Label>
          <RadioGroup value={headerMobileLogoPosition} onValueChange={(v) => onHeaderMobileLogoPositionChange(v as MobileLogoPosition)} className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="center" /><span className="text-sm">Centralizada</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="left" /><span className="text-sm">Esquerda</span></label>
          </RadioGroup>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Mostrar busca</Label>
            <Switch checked={headerShowSearch} onCheckedChange={onHeaderShowSearchChange} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Mostrar favoritos (desktop)</Label>
            <Switch checked={headerShowFavorites} onCheckedChange={onHeaderShowFavoritesChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
