import { useState, useEffect } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SettingsLayout } from '@/components/settings';

export default function SettingsContact() {
  const { store, refreshStore } = useActiveStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    email: '',
    phone: '',
    whatsapp: '',
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
        .select('email, phone, whatsapp')
        .eq('id', store.id)
        .single();

      if (error) throw error;

      setSettings({
        email: data.email || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
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
          email: settings.email || null,
          phone: settings.phone || null,
          whatsapp: settings.whatsapp || null,
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

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  if (!store) {
    return (
      <SettingsLayout title="Contato" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Contato" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Contato" 
      description="Configure como seus clientes podem entrar em contato"
      onSave={handleSave}
      isSaving={isSaving}
    >
      <Card>
        <CardHeader>
          <CardTitle>Informações de Contato</CardTitle>
          <CardDescription>Dados de contato exibidos na loja</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              placeholder="contato@minhaloja.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: formatPhone(e.target.value) })}
                placeholder="(11) 99999-9999"
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: formatPhone(e.target.value) })}
                placeholder="(11) 99999-9999"
                maxLength={15}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
