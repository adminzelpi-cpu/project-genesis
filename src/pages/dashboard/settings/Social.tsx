import { useState, useEffect } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SettingsLayout } from '@/components/settings';

export default function SettingsSocial() {
  const { store, refreshStore } = useActiveStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    instagram: '',
    facebook: '',
    tiktok: '',
  });

  useEffect(() => {
    if (store) {
      loadSettings();
    }
  }, [store?.id]);

  const loadSettings = async () => {
    if (!store?.id) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('instagram, facebook, tiktok')
        .eq('id', store.id)
        .single();

      if (error) throw error;

      setSettings({
        instagram: data.instagram || '',
        facebook: data.facebook || '',
        tiktok: data.tiktok || '',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!store?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          instagram: settings.instagram || null,
          facebook: settings.facebook || null,
          tiktok: settings.tiktok || null,
        })
        .eq('id', store.id);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
      refreshStore();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (!store) {
    return (
      <SettingsLayout title="Redes Sociais" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Redes Sociais" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Redes Sociais" 
      description="Links para suas redes sociais"
      onSave={handleSave}
      isSaving={isSaving}
    >
      <Card>
        <CardHeader>
          <CardTitle>Perfis Sociais</CardTitle>
          <CardDescription>Configure os links que aparecem na sua loja</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                instagram.com/
              </span>
              <Input
                id="instagram"
                value={settings.instagram}
                onChange={(e) => setSettings({ ...settings, instagram: e.target.value.replace('@', '') })}
                className="rounded-l-none"
                placeholder="minhaloja"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                facebook.com/
              </span>
              <Input
                id="facebook"
                value={settings.facebook}
                onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                className="rounded-l-none"
                placeholder="minhaloja"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tiktok">TikTok</Label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                tiktok.com/@
              </span>
              <Input
                id="tiktok"
                value={settings.tiktok}
                onChange={(e) => setSettings({ ...settings, tiktok: e.target.value.replace('@', '') })}
                className="rounded-l-none"
                placeholder="minhaloja"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
