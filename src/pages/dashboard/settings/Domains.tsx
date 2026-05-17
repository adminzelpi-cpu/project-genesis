import { useState, useEffect } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Globe, Plus, Trash2, ExternalLink, AlertCircle, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';

interface CustomDomain {
  id: string;
  domain: string;
  is_verified: boolean;
  is_primary: boolean;
  created_at: string;
  cloudflare_hostname_id?: string | null;
  cloudflare_www_hostname_id?: string | null;
}

const FALLBACK_ORIGIN = 'fallback.zelpi.com.br';

export default function SettingsDomains() {
  const { store } = useActiveStore();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (store?.id) loadDomains();
  }, [store?.id]);

  const loadDomains = async () => {
    if (!store?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setDomains((data as CustomDomain[]) || []);
    } catch (error) {
      console.error('Error loading domains:', error);
      toast.error('Erro ao carregar domínios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDomain = async () => {
    if (!store?.id || !newDomain.trim()) return;

    const cleaned = newDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');

    if (!cleaned || !cleaned.includes('.')) {
      toast.error('Digite um domínio válido (ex: meudominio.com.br)');
      return;
    }

    setIsAdding(true);
    try {
      const { data: inserted, error } = await supabase
        .from('custom_domains')
        .insert({
          store_id: store.id,
          domain: cleaned,
          is_primary: domains.length === 0,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este domínio já está cadastrado');
        } else {
          throw error;
        }
        return;
      }

      // Chamar automação Cloudflare for SaaS
      toast.info('Configurando SSL automático no Cloudflare...');
      const { data: cfData, error: cfError } = await supabase.functions.invoke('cloudflare-saas-hostname', {
        body: { action: 'create', domain_id: inserted.id },
      });

      if (cfError || cfData?.error) {
        console.error('CF error:', cfError, cfData);
        toast.warning('Domínio adicionado, mas a configuração automática falhou. Verifique os logs ou contate o suporte.');
      } else {
        toast.success('Domínio adicionado e SSL provisionado! Configure o CNAME conforme as instruções abaixo.');
      }

      setNewDomain('');
      loadDomains();
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error('Erro ao adicionar domínio');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    try {
      // Limpar custom hostname no Cloudflare antes de deletar
      try {
        await supabase.functions.invoke('cloudflare-saas-hostname', {
          body: { action: 'delete', domain_id: domainId },
        });
      } catch (e) {
        console.warn('CF cleanup failed (non-critical):', e);
      }

      const { error } = await supabase
        .from('custom_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
      toast.success('Domínio removido');
      loadDomains();
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Erro ao remover domínio');
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingId(domainId);
    try {
      const domain = domains.find((d) => d.id === domainId);

      // Se já tem hostname no Cloudflare, consulta status SaaS
      if (domain?.cloudflare_hostname_id) {
        const { data, error } = await supabase.functions.invoke('cloudflare-saas-hostname', {
          body: { action: 'status', domain_id: domainId },
        });

        if (error) throw error;

        if (data?.is_active) {
          toast.success('Domínio ativo com SSL provisionado!');
        } else if (data?.cf_ssl_status === 'pending_validation') {
          toast.info('SSL aguardando validação. Confirme se o CNAME está apontando para fallback.zelpi.com.br.');
        } else if (data?.cf_status === 'pending') {
          toast.info(`Aguardando validação de propriedade. Status: ${data?.cf_ssl_status || data?.cf_status}.`);
        } else {
          toast.info(`Status atual: ${data?.cf_status} / SSL: ${data?.cf_ssl_status}`);
        }

        loadDomains();
        return;
      }

      // Fallback: verificação DNS antiga
      const { data, error } = await supabase.functions.invoke('verify-domain-dns', {
        body: { domain_id: domainId },
      });

      if (error) throw error;

      if (data?.is_verified) {
        toast.success('Domínio validado com sucesso!');
      } else {
        toast.info(data?.verification_message || 'DNS ainda não está apontando corretamente.');
      }

      loadDomains();
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('Erro ao verificar status');
    } finally {
      setVerifyingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (!store) {
    return (
      <SettingsLayout title="Domínios" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Domínios" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      title="Domínios"
      description="Configure domínios personalizados para sua loja"
      showSaveButton={false}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domínio Personalizado
          </CardTitle>
          <CardDescription>
            Use seu próprio domínio (ex: minhaloja.com.br). O SSL é provisionado automaticamente — basta apontar o CNAME.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="new-domain" className="sr-only">Novo domínio</Label>
              <Input
                id="new-domain"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="minhaloja.com.br"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              />
            </div>
            <Button onClick={handleAddDomain} disabled={isAdding || !newDomain.trim()}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Adicionar
            </Button>
          </div>

          {domains.length > 0 ? (
            <div className="space-y-3">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{domain.domain}</span>
                        {domain.is_primary && (
                          <Badge variant="secondary" className="text-xs">Principal</Badge>
                        )}
                        <Badge
                          variant={domain.is_verified ? "default" : "outline"}
                          className={`text-xs ${domain.is_verified ? 'bg-green-600 hover:bg-green-700' : 'text-yellow-600 border-yellow-400'}`}
                        >
                          {domain.is_verified ? '✓ Ativo' : '⏳ Aguardando DNS'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleVerifyDomain(domain.id)}
                      disabled={verifyingId === domain.id}
                      title="Verificar status"
                    >
                      <RefreshCw className={`h-4 w-4 ${verifyingId === domain.id ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                      title="Abrir domínio"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDomain(domain.id)}
                      title="Remover domínio"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum domínio personalizado configurado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instruções DNS — só aparece se houver domínios */}
      {domains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Configuração de DNS (single CNAME)
            </CardTitle>
            <CardDescription>
              Aponte os registros abaixo no provedor de DNS do seu domínio. O SSL é emitido automaticamente em poucos minutos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {domains.map((d) => (
              <div key={d.id} className="space-y-2">
                <p className="text-sm font-medium">{d.domain}</p>
                <div className="bg-muted rounded-lg p-4 space-y-2 text-sm font-mono">
                  <div className="grid grid-cols-[80px_80px_1fr_auto] gap-2 font-semibold text-foreground">
                    <span>Tipo</span>
                    <span>Nome</span>
                    <span>Valor</span>
                    <span></span>
                  </div>
                  <div className="grid grid-cols-[80px_80px_1fr_auto] gap-2 items-center text-muted-foreground">
                    <span>CNAME</span>
                    <span>@</span>
                    <span className="truncate">{FALLBACK_ORIGIN}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(FALLBACK_ORIGIN, 'CNAME')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-[80px_80px_1fr_auto] gap-2 items-center text-muted-foreground">
                    <span>CNAME</span>
                    <span>www</span>
                    <span className="truncate">{FALLBACK_ORIGIN}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(FALLBACK_ORIGIN, 'CNAME')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground space-y-1">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  Alguns provedores não aceitam CNAME na raiz (@). Nesse caso, use <strong>CNAME flattening</strong>, <strong>ALIAS</strong> ou <strong>ANAME</strong> com o mesmo valor.
                </span>
              </p>
              <p className="pl-5">
                A propagação de DNS pode levar até 24h. Após apontar, clique em <RefreshCw className="inline h-3 w-3" /> para verificar o status.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">URL padrão da loja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <code className="text-sm">{store.slug}.zelpi.com.br</code>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => window.open(`https://${store.slug}.zelpi.com.br`, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
