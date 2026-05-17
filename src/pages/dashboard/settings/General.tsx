import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { SettingsLayout } from '@/components/settings';
import { useCallback, useRef } from 'react';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function SettingsGeneral() {
  const { store, isLoading: isStoreLoading, refreshStore } = useActiveStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [settings, setSettings] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    low_stock_threshold: 5,
    email: '',
    phone: '',
    whatsapp: '',
    meta_title: '',
    meta_description: '',
  });
  const [originalSlug, setOriginalSlug] = useState('');

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
        .select('*')
        .eq('id', store.id)
        .single();

      if (error) throw error;

      setSettings({
        name: data.name || '',
        slug: data.slug || '',
        description: data.description || '',
        is_active: data.is_active ?? true,
        low_stock_threshold: data.low_stock_threshold || 5,
        email: data.email || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        meta_title: (data as any).meta_title || '',
        meta_description: (data as any).meta_description || '',
      });
      setOriginalSlug(data.slug || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugStatus('idle');
      return;
    }
    if (slug === originalSlug) {
      setSlugStatus('available');
      return;
    }

    setSlugStatus('checking');
    try {
      const { data, error } = await supabase.rpc('generate_unique_store_slug', {
        store_name: slug,
        exclude_store_id: store?.id || null,
      });
      if (error) { setSlugStatus('idle'); return; }
      setSlugStatus(data === slug ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  }, [store?.id, originalSlug]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (settings.slug && settings.slug.length >= 2) {
      debounceRef.current = setTimeout(() => checkSlugAvailability(settings.slug), 500);
    } else {
      setSlugStatus('idle');
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [settings.slug, checkSlugAvailability]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSave = async () => {
    if (!store?.id) return;
    if (slugStatus === 'taken') {
      toast.error('A URL escolhida já está em uso. Escolha outra.');
      return;
    }
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: settings.name,
          slug: settings.slug,
          description: settings.description,
          is_active: settings.is_active,
          low_stock_threshold: settings.low_stock_threshold,
          email: settings.email || null,
          phone: settings.phone || null,
          whatsapp: settings.whatsapp || null,
          meta_title: settings.meta_title || null,
          meta_description: settings.meta_description || null,
        } as any)
        .eq('id', store.id);

      if (error) throw error;

      setOriginalSlug(settings.slug);
      toast.success('Configurações salvas com sucesso!');
      refreshStore();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (isStoreLoading) {
    return (
      <SettingsLayout title="Informações Gerais" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  if (!store) {
    return (
      <SettingsLayout title="Informações Gerais" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground mt-1">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Informações Gerais" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Informações Gerais" 
      description="Configure as informações básicas da sua loja"
      onSave={handleSave}
      isSaving={isSaving}
    >
      <Card>
        <CardHeader>
          <CardTitle>Dados da Loja</CardTitle>
          <CardDescription>Informações que aparecem na sua loja</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja *</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                placeholder="Minha Loja"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL da Loja *</Label>
              <div className="relative">
                <Input
                  id="slug"
                  value={settings.slug}
                  onChange={(e) => setSettings({ ...settings, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="minha-loja"
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {slugStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {slugStatus === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.slug ? (
                  <>Sua loja: <span className="font-medium text-foreground">{settings.slug}.zelpi.com.br</span></>
                ) : (
                  'Digite a URL da sua loja'
                )}
              </p>
              {slugStatus === 'taken' && (
                <p className="text-xs text-destructive">Esta URL já está em uso. Tente outra.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              placeholder="Descreva sua loja..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <Label>Loja Ativa</Label>
              <p className="text-sm text-muted-foreground">Ativar ou desativar a loja para visitantes</p>
            </div>
            <Switch
              checked={settings.is_active}
              onCheckedChange={(checked) => setSettings({ ...settings, is_active: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contato - merged from Contact page */}
      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>Como seus clientes podem entrar em contato</CardDescription>
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

      {/* SEO da Loja */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            SEO da Página Inicial
          </CardTitle>
          <CardDescription>Configure como sua loja aparece nos resultados de busca do Google</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta_title">Título SEO</Label>
            <Input
              id="meta_title"
              value={settings.meta_title}
              onChange={(e) => setSettings({ ...settings, meta_title: e.target.value })}
              placeholder={settings.name || 'Título para buscadores'}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {settings.meta_title.length}/60 caracteres. Se vazio, será usado o nome da loja.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta_description">Descrição SEO</Label>
            <Textarea
              id="meta_description"
              value={settings.meta_description}
              onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })}
              placeholder={settings.description || 'Descrição para buscadores...'}
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">
              {settings.meta_description.length}/160 caracteres. Se vazio, será usada a descrição da loja.
            </p>
          </div>

          {/* Google Preview */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Prévia no Google</p>
            <p className="text-blue-600 text-lg leading-tight truncate">
              {settings.meta_title || settings.name || 'Nome da Loja'}
            </p>
            <p className="text-green-700 text-sm truncate">
              {settings.slug ? `${settings.slug}.zelpi.com.br` : 'sualojaaqui.zelpi.com.br'}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {settings.meta_description || settings.description || 'Descrição da sua loja aparecerá aqui...'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alertas de Estoque</CardTitle>
          <CardDescription>Configure quando receber alertas de estoque baixo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="low_stock_threshold">Limite de Estoque Baixo</Label>
            <Input
              id="low_stock_threshold"
              type="number"
              min="0"
              value={settings.low_stock_threshold}
              onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 0 })}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              Você receberá um alerta quando o estoque de um produto ficar abaixo deste valor
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
