import { useState } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { useFeedConfigurations, useFeedValidation, useFeedAnalytics } from '@/features/feeds';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Copy, 
  ExternalLink, 
  Settings2, 
  CheckCircle2, 
  AlertTriangle,
  BarChart3,
  FileWarning,
  Package
} from 'lucide-react';
import { FeedSettingsDialog } from '@/features/feeds/components/FeedSettingsDialog';
import { FeedValidationTable } from '@/features/feeds/components/FeedValidationTable';

// Platform icons and colors
const platformConfig: Record<string, { icon: string; color: string; name: string; description: string }> = {
  meta: { 
    icon: 'M', 
    color: '#1877F2', 
    name: 'Meta (Facebook/Instagram)',
    description: 'Feed para Facebook Ads e Instagram Shopping'
  },
  google: { 
    icon: 'G', 
    color: '#4285F4', 
    name: 'Google Merchant Center',
    description: 'Feed para Google Shopping e campanhas Performance Max'
  },
  pinterest: { 
    icon: 'P', 
    color: '#E60023', 
    name: 'Pinterest',
    description: 'Catálogo para Pinterest Shopping'
  },
  tiktok: { 
    icon: 'T', 
    color: '#000000', 
    name: 'TikTok Shop',
    description: 'Feed para TikTok Ads e TikTok Shop'
  },
};

export default function Feeds() {
  const { store, isLoading: storeLoading } = useActiveStore();
  const { configurations, templates, loading: configsLoading, toggleFeed, updateSettings } = useFeedConfigurations(store?.id);
  const { totalProducts, eligibleProducts, productsWithIssues, products: validatedProducts, loading: validationLoading } = useFeedValidation(store?.id);
  const { totalAccesses, loading: analyticsLoading } = useFeedAnalytics(store?.id);
  const { toast } = useToast();
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  // Buscar domínio customizado da loja (se existir)
  const { data: customDomain } = useQuery({
    queryKey: ['store-custom-domain', store?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('custom_domains')
        .select('domain')
        .eq('store_id', store!.id)
        .eq('is_verified', true)
        .eq('is_primary', true)
        .limit(1)
        .maybeSingle();
      return data?.domain || null;
    },
    enabled: !!store?.id,
  });

  const loading = storeLoading || configsLoading;

  const getFeedUrl = (platform: string) => {
    if (!store) return '';
    // Prioriza domínio customizado, senão usa subdomínio zelpi
    const domain = customDomain || `${store.slug}.zelpi.com.br`;
    return `https://${domain}/feed/${platform}.xml`;
  };

  const copyFeedUrl = (platform: string) => {
    navigator.clipboard.writeText(getFeedUrl(platform));
    toast({
      title: 'URL copiada!',
      description: 'A URL do feed foi copiada para a área de transferência.',
    });
  };

  const openSettings = (platform: string) => {
    setSelectedPlatform(platform);
    setSettingsOpen(true);
  };

  const getConfigForPlatform = (platform: string) => {
    return configurations.find(c => c.platform === platform);
  };

  const formatLastAccessed = (date: string | null) => {
    if (!date) return 'Nunca acessado';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Há menos de 1 hora';
    if (hours < 24) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Há ${days} dia${days > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Feeds de Catálogo</h1>
        <p className="text-muted-foreground">
          Gere feeds XML automáticos para anunciar seus produtos nas principais plataformas de anúncios
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Produtos</p>
                <p className="text-2xl font-bold">{validationLoading ? '-' : totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prontos para Anúncio</p>
                <p className="text-2xl font-bold text-green-600">{validationLoading ? '-' : eligibleProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Com Problemas</p>
                <p className="text-2xl font-bold text-amber-600">{validationLoading ? '-' : productsWithIssues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Acessos (7 dias)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsLoading ? '-' : Object.values(totalAccesses).reduce((a, b) => a + b, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="feeds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feeds">Feeds Ativos</TabsTrigger>
          <TabsTrigger value="validation">
            Validação
            {productsWithIssues > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {productsWithIssues}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feeds">
          {/* Platform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(platformConfig).map(([platform, config]) => {
              const feedConfig = getConfigForPlatform(platform);
              const isActive = feedConfig?.is_active ?? false;
              const accessCount = feedConfig?.access_count ?? 0;
              const lastAccessed = feedConfig?.last_accessed_at ?? null;

              return (
                <Card key={platform} className="overflow-hidden">
                  <div 
                    className="h-1" 
                    style={{ backgroundColor: isActive ? config.color : '#e5e7eb' }} 
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: config.color }}
                        >
                          {config.icon}
                        </div>
                        <div>
                          <CardTitle className="text-base">{config.name}</CardTitle>
                          <CardDescription className="text-xs">{config.description}</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => toggleFeed(platform, checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isActive && (
                      <>
                        {/* Feed URL */}
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <code className="text-xs flex-1 truncate text-muted-foreground">
                            {getFeedUrl(platform)}
                          </code>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyFeedUrl(platform)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span>Última consulta: {formatLastAccessed(lastAccessed)}</span>
                            <span>•</span>
                            <span>{accessCount} acessos</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(getFeedUrl(platform), '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Testar Feed
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openSettings(platform)}
                          >
                            <Settings2 className="h-3.5 w-3.5 mr-1" />
                            Configurações
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {!isActive && (
                      <p className="text-sm text-muted-foreground">
                        Ative para gerar o feed de produtos para {config.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="h-5 w-5" />
                Validação de Produtos
              </CardTitle>
              <CardDescription>
                Produtos precisam ter imagem, estoque, preço, marca e descrição para aparecerem nos feeds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedValidationTable 
                products={validatedProducts} 
                loading={validationLoading}
                storeId={store?.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <FeedSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        platform={selectedPlatform}
        config={selectedPlatform ? getConfigForPlatform(selectedPlatform) : undefined}
        template={templates.find(t => t.platform_name === selectedPlatform)}
        onSave={(settings) => {
          if (selectedPlatform) {
            updateSettings(selectedPlatform, settings);
          }
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}
