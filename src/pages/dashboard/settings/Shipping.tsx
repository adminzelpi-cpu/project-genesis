import { useState, useEffect } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SettingsLayout } from '@/components/settings';
import { FrenetGateway } from '@/features/shipping';

export default function SettingsShipping() {
  const { store, refreshStore } = useActiveStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    default_shipping_cost: 0,
    free_shipping_threshold: null as number | null,
    address_zip: '',
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
        .select('default_shipping_cost, free_shipping_threshold, address_zip')
        .eq('id', store.id)
        .single();

      if (error) throw error;

      setSettings({
        default_shipping_cost: data.default_shipping_cost || 0,
        free_shipping_threshold: data.free_shipping_threshold || null,
        address_zip: data.address_zip || '',
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
          default_shipping_cost: settings.default_shipping_cost,
          free_shipping_threshold: settings.free_shipping_threshold,
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
      <SettingsLayout title="Meios de Envio" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Meios de Envio" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Meios de Envio" 
      description="Configure as opções de frete da sua loja"
      onSave={handleSave}
      isSaving={isSaving}
    >
      <FrenetGateway
        storeId={store.id}
        shippingConfig={(store as any).shipping_config || {}}
        addressZip={settings.address_zip}
        onRefresh={refreshStore}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Frete Padrão</CardTitle>
          <CardDescription>Valores usados quando a Frenet não está configurada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default_shipping_cost">Frete Padrão (R$)</Label>
              <Input
                id="default_shipping_cost"
                type="number"
                min="0"
                step="0.01"
                value={settings.default_shipping_cost}
                onChange={(e) => setSettings({ ...settings, default_shipping_cost: parseFloat(e.target.value) || 0 })}
                placeholder="19.90"
              />
              <p className="text-xs text-muted-foreground">Valor usado quando Frenet não está ativa</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="free_shipping_threshold">Frete Grátis acima de (R$)</Label>
              <Input
                id="free_shipping_threshold"
                type="number"
                min="0"
                step="0.01"
                value={settings.free_shipping_threshold || ''}
                onChange={(e) => setSettings({ ...settings, free_shipping_threshold: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="199.00"
              />
              <p className="text-xs text-muted-foreground">Deixe vazio para desativar</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
