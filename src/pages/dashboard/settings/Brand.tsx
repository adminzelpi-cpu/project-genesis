import { useState, useEffect, useRef } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, Image, Info } from 'lucide-react';
import { SettingsLayout } from '@/components/settings';

export default function SettingsBrand() {
  const { store, isLoading: isStoreLoading, refreshStore } = useActiveStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [isDraggingFavicon, setIsDraggingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isStoreLoading) {
      if (store) {
        setLogoUrl(store.logo_url || null);
        setFaviconUrl((store as any).favicon_url || null);
      }
      setIsLoading(false);
    }
  }, [store?.id, isStoreLoading]);

  const uploadFile = async (file: File, type: 'logo' | 'favicon') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${store!.id}/${type}.${fileExt}`;
    const currentUrl = type === 'logo' ? logoUrl : faviconUrl;

    if (currentUrl) {
      const oldPath = currentUrl.split('/store-logos/')[1];
      if (oldPath) await supabase.storage.from('store-logos').remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('store-logos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 2MB"); return; }
    setIsUploadingLogo(true);
    try {
      const url = await uploadFile(file, 'logo');
      setLogoUrl(url);
      // Save immediately
      await supabase.from('stores').update({ logo_url: url }).eq('id', store!.id);
      refreshStore();
      toast.success("Logo atualizado!");
    } catch { toast.error("Erro ao fazer upload do logo"); }
    finally { setIsUploadingLogo(false); }
  };

  const handleFaviconUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size > 500 * 1024) { toast.error("O favicon deve ter no máximo 500KB"); return; }
    setIsUploadingFavicon(true);
    try {
      const url = await uploadFile(file, 'favicon');
      setFaviconUrl(url);
      await supabase.from('stores').update({ favicon_url: url } as any).eq('id', store!.id);
      refreshStore();
      toast.success("Favicon atualizado!");
    } catch { toast.error("Erro ao fazer upload do favicon"); }
    finally { setIsUploadingFavicon(false); }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl) return;
    setIsUploadingLogo(true);
    try {
      const oldPath = logoUrl.split('/store-logos/')[1];
      if (oldPath) await supabase.storage.from('store-logos').remove([oldPath]);
      setLogoUrl(null);
      await supabase.from('stores').update({ logo_url: null }).eq('id', store!.id);
      refreshStore();
      toast.success("Logo removido!");
    } catch { toast.error("Erro ao remover logo"); }
    finally { setIsUploadingLogo(false); }
  };

  const handleRemoveFavicon = async () => {
    if (!faviconUrl) return;
    setIsUploadingFavicon(true);
    try {
      const oldPath = faviconUrl.split('/store-logos/')[1];
      if (oldPath) await supabase.storage.from('store-logos').remove([oldPath]);
      setFaviconUrl(null);
      await supabase.from('stores').update({ favicon_url: null } as any).eq('id', store!.id);
      refreshStore();
      toast.success("Favicon removido!");
    } catch { toast.error("Erro ao remover favicon"); }
    finally { setIsUploadingFavicon(false); }
  };

  const handleDrop = (e: React.DragEvent, type: 'logo' | 'favicon') => {
    e.preventDefault();
    if (type === 'logo') setIsDraggingLogo(false);
    else setIsDraggingFavicon(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      type === 'logo' ? handleLogoUpload(file) : handleFaviconUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent, type: 'logo' | 'favicon') => {
    e.preventDefault();
    if (type === 'logo') setIsDraggingLogo(true);
    else setIsDraggingFavicon(true);
  };

  const handleDragLeave = (type: 'logo' | 'favicon') => {
    if (type === 'logo') setIsDraggingLogo(false);
    else setIsDraggingFavicon(false);
  };

  if (isStoreLoading || isLoading) {
    return (
      <SettingsLayout title="Marca" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  if (!store) {
    return (
      <SettingsLayout title="Marca" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground mt-1">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      title="Marca"
      description="Logo e favicon que identificam sua loja"
      showSaveButton={false}
    >
      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle>Logo da Loja</CardTitle>
          <CardDescription>
            Aparece no cabeçalho da loja, e-mails e nas redes sociais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl ? (
            <div className="flex items-center gap-6 rounded-xl border bg-muted/30 p-6">
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <img src={logoUrl} alt="Logo" className="max-h-16 max-w-[200px] object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Substituir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={handleRemoveLogo}
                  disabled={isUploadingLogo}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDraggingLogo
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-foreground/30 hover:bg-muted/30'
              }`}
              onClick={() => logoInputRef.current?.click()}
              onDrop={(e) => handleDrop(e, 'logo')}
              onDragOver={(e) => handleDragOver(e, 'logo')}
              onDragLeave={() => handleDragLeave('logo')}
            >
              {isUploadingLogo ? (
                <Loader2 className="h-10 w-10 mx-auto text-muted-foreground mb-3 animate-spin" />
              ) : (
                <Image className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              )}
              <p className="text-sm font-medium mb-1">Clique para enviar ou arraste aqui</p>
              <p className="text-xs text-muted-foreground">PNG, JPG ou SVG • Máximo 2MB</p>
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ''; }}
            className="hidden"
          />
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Recomendação:</strong> Use uma imagem horizontal com fundo transparente (PNG ou SVG). 
              Tamanho ideal: <strong>400×120px</strong> para melhor exibição no cabeçalho.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Favicon */}
      <Card>
        <CardHeader>
          <CardTitle>Favicon</CardTitle>
          <CardDescription>
            Ícone pequeno que aparece na aba do navegador e nos favoritos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {faviconUrl ? (
            <div className="flex items-center gap-6 rounded-xl border bg-muted/30 p-6">
              <div className="bg-background rounded-lg p-3 border shadow-sm">
                <img src={faviconUrl} alt="Favicon" className="h-8 w-8 object-contain" />
              </div>
              <div className="flex items-center gap-3">
                {/* Browser tab preview */}
                <div className="hidden sm:flex items-center gap-1.5 rounded-t-lg bg-muted border border-b-0 px-3 py-1.5">
                  <img src={faviconUrl} alt="" className="h-4 w-4 object-contain" />
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">{store.name}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={isUploadingFavicon}
                >
                  {isUploadingFavicon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Substituir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={handleRemoveFavicon}
                  disabled={isUploadingFavicon}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDraggingFavicon
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-foreground/30 hover:bg-muted/30'
              }`}
              onClick={() => faviconInputRef.current?.click()}
              onDrop={(e) => handleDrop(e, 'favicon')}
              onDragOver={(e) => handleDragOver(e, 'favicon')}
              onDragLeave={() => handleDragLeave('favicon')}
            >
              {isUploadingFavicon ? (
                <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-3 animate-spin" />
              ) : (
                <Image className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              )}
              <p className="text-sm font-medium mb-1">Clique para enviar ou arraste aqui</p>
              <p className="text-xs text-muted-foreground">32×32px • PNG, ICO ou SVG • Máximo 500KB</p>
            </div>
          )}
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/png,image/x-icon,image/svg+xml,.ico"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFaviconUpload(f); e.target.value = ''; }}
            className="hidden"
          />
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Recomendação:</strong> Use uma imagem quadrada de <strong>32×32px</strong> ou <strong>64×64px</strong>. 
              Formatos aceitos: PNG (com transparência) ou ICO.
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
