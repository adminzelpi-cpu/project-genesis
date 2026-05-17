import { useState, useEffect } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { SettingsLayout } from '@/components/settings';

export default function SettingsBusiness() {
  const { store, refreshStore } = useActiveStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPolicies, setIsGeneratingPolicies] = useState(false);
  const [settings, setSettings] = useState({
    business_name: '',
    document: '',
    document_type: 'cpf',
    order_prefix: 'PED',
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
        .select('business_name, document, document_type, order_prefix')
        .eq('id', store.id)
        .single();

      if (error) throw error;

      setSettings({
        business_name: data.business_name || '',
        document: data.document || '',
        document_type: data.document_type || 'cpf',
        order_prefix: data.order_prefix || 'PED',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const autoGeneratePolicies = async () => {
    if (!store?.id) return;
    
    // Check if policies already exist
    const { data: existingPolicies } = await supabase
      .from('store_policies')
      .select('id')
      .eq('store_id', store.id)
      .limit(1);

    if (existingPolicies && existingPolicies.length > 0) return;

    // Only generate if business_name and document are filled
    if (!settings.business_name || !settings.document) return;

    setIsGeneratingPolicies(true);
    toast.info('Gerando páginas legais automaticamente...', { 
      icon: <Sparkles className="h-4 w-4" />,
      duration: 10000,
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-policies', {
        body: { storeId: store.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${data.count} página(s) legal(is) gerada(s) e adicionada(s) ao rodapé!`, {
        icon: <Sparkles className="h-4 w-4" />,
      });
    } catch (error) {
      console.error('Error auto-generating policies:', error);
      // Silent fail - user can still generate manually later
    } finally {
      setIsGeneratingPolicies(false);
    }
  };

  const handleSave = async () => {
    if (!store?.id) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          business_name: settings.business_name || null,
          document: settings.document || null,
          document_type: settings.document_type,
          order_prefix: settings.order_prefix,
        })
        .eq('id', store.id);

      if (error) throw error;

      toast.success('Configurações salvas com sucesso!');
      refreshStore();

      // Auto-generate policies after saving business data (if not already generated)
      autoGeneratePolicies();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDocument = (value: string, type: string) => {
    const numbers = value.replace(/\D/g, '');
    if (type === 'cpf') {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    } else {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
      if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
      if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
    }
  };

  if (!store) {
    return (
      <SettingsLayout title="Dados da Empresa" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Dados da Empresa" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Dados da Empresa" 
      description="Informações fiscais e comerciais"
      onSave={handleSave}
      isSaving={isSaving || isGeneratingPolicies}
    >
      <Card>
        <CardHeader>
          <CardTitle>Informações Fiscais</CardTitle>
          <CardDescription>Dados para notas fiscais e documentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Razão Social / Nome</Label>
            <Input
              id="business_name"
              value={settings.business_name}
              onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
              placeholder="Nome da empresa ou pessoa física"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select
                value={settings.document_type}
                onValueChange={(value) => setSettings({ ...settings, document_type: value, document: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">{settings.document_type === 'cpf' ? 'CPF' : 'CNPJ'}</Label>
              <Input
                id="document"
                value={settings.document}
                onChange={(e) => setSettings({ ...settings, document: formatDocument(e.target.value, settings.document_type) })}
                placeholder={settings.document_type === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                maxLength={settings.document_type === 'cpf' ? 14 : 18}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order_prefix">Prefixo dos Pedidos</Label>
            <Input
              id="order_prefix"
              value={settings.order_prefix}
              onChange={(e) => setSettings({ ...settings, order_prefix: e.target.value.toUpperCase() })}
              placeholder="PED"
              maxLength={5}
            />
            <p className="text-xs text-muted-foreground">Ex: {settings.order_prefix}-001, {settings.order_prefix}-002...</p>
          </div>

          {isGeneratingPolicies && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Gerando páginas legais e configurando rodapé...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}