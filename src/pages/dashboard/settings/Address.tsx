import { useState, useEffect } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SettingsLayout } from '@/components/settings';

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function SettingsAddress() {
  const { store, refreshStore } = useActiveStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
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
        .select('address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip')
        .eq('id', store.id)
        .single();

      if (error) throw error;

      setSettings({
        address_street: data.address_street || '',
        address_number: data.address_number || '',
        address_complement: data.address_complement || '',
        address_neighborhood: data.address_neighborhood || '',
        address_city: data.address_city || '',
        address_state: data.address_state || '',
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
          address_street: settings.address_street || null,
          address_number: settings.address_number || null,
          address_complement: settings.address_complement || null,
          address_neighborhood: settings.address_neighborhood || null,
          address_city: settings.address_city || null,
          address_state: settings.address_state || null,
          address_zip: settings.address_zip || null,
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

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  if (!store) {
    return (
      <SettingsLayout title="Endereço" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Endereço" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Endereço" 
      description="Endereço para exibição no rodapé e notas fiscais"
      onSave={handleSave}
      isSaving={isSaving}
    >
      <Card>
        <CardHeader>
          <CardTitle>Endereço da Loja</CardTitle>
          <CardDescription>Localização física da sua loja ou empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address_street">Rua</Label>
              <Input
                id="address_street"
                value={settings.address_street}
                onChange={(e) => setSettings({ ...settings, address_street: e.target.value })}
                placeholder="Rua das Flores"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_number">Número</Label>
              <Input
                id="address_number"
                value={settings.address_number}
                onChange={(e) => setSettings({ ...settings, address_number: e.target.value })}
                placeholder="123"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_complement">Complemento</Label>
              <Input
                id="address_complement"
                value={settings.address_complement}
                onChange={(e) => setSettings({ ...settings, address_complement: e.target.value })}
                placeholder="Sala 101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_neighborhood">Bairro</Label>
              <Input
                id="address_neighborhood"
                value={settings.address_neighborhood}
                onChange={(e) => setSettings({ ...settings, address_neighborhood: e.target.value })}
                placeholder="Centro"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_city">Cidade</Label>
              <Input
                id="address_city"
                value={settings.address_city}
                onChange={(e) => setSettings({ ...settings, address_city: e.target.value })}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={settings.address_state}
                onValueChange={(value) => setSettings({ ...settings, address_state: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_zip">CEP</Label>
              <Input
                id="address_zip"
                value={settings.address_zip}
                onChange={(e) => setSettings({ ...settings, address_zip: formatCEP(e.target.value) })}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
