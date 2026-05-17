import { useState } from 'react';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { useStorePolicies } from '@/features/policies/hooks/useStorePolicies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, FileText, Check, AlertCircle, ExternalLink, Pencil, RefreshCw } from 'lucide-react';
import { SettingsLayout } from '@/components/settings';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sanitizeHTML } from '@/lib/sanitize';

const POLICY_LABELS: Record<string, { label: string; icon: string }> = {
  terms: { label: "Termos de Uso", icon: "📜" },
  privacy: { label: "Política de Privacidade", icon: "🔒" },
  returns: { label: "Trocas e Devoluções", icon: "🔄" },
  shipping: { label: "Política de Envio", icon: "📦" },
};

export default function SettingsPolicies() {
  const { store } = useActiveStore();
  const { policies, isLoading, generatePolicies, updatePolicy, hasGeneratedPolicies } = useStorePolicies();
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editTab, setEditTab] = useState<'content' | 'summary'>('content');
  const [previewPolicy, setPreviewPolicy] = useState<string | null>(null);

  const currentEditPolicy = policies.find(p => p.id === editingPolicy);
  const currentPreviewPolicy = policies.find(p => p.id === previewPolicy);

  const handleEditOpen = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (policy) {
      setEditContent(policy.content || "");
      setEditSummary(policy.summary || "");
      setEditTab('content');
      setEditingPolicy(policyId);
    }
  };

  const handleEditSave = async () => {
    if (!editingPolicy) return;
    await updatePolicy.mutateAsync({ id: editingPolicy, content: editContent, summary: editSummary || undefined });
    setEditingPolicy(null);
  };

  const handleTogglePublish = async (policyId: string, currentStatus: boolean) => {
    await updatePolicy.mutateAsync({ id: policyId, is_published: !currentStatus });
  };

  const handleGenerateAll = async () => {
    await generatePolicies.mutateAsync(undefined);
  };

  const handleRegenerateOne = async (policyType: string) => {
    await generatePolicies.mutateAsync([policyType]);
  };

  if (!store) {
    return (
      <SettingsLayout title="Políticas e Termos" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Políticas e Termos" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Políticas e Termos" 
      description="Páginas legais geradas automaticamente"
      showSaveButton={false}
    >
      <div className="space-y-6">
        {/* Info Card */}
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            As políticas são geradas automaticamente com base nas informações da sua loja (nome, CNPJ, endereço, etc.). 
            Preencha os dados em <strong>Configurações &gt; Dados da Empresa</strong> e <strong>Endereço</strong> para melhores resultados.
          </AlertDescription>
        </Alert>

        {/* Generate Button */}
        {!hasGeneratedPolicies ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Gerar Políticas Automaticamente
              </CardTitle>
              <CardDescription>
                Clique abaixo para gerar todas as páginas de políticas da sua loja usando IA.
                Os textos são baseados na legislação brasileira (CDC e LGPD).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button 
                onClick={handleGenerateAll}
                disabled={generatePolicies.isPending}
                size="lg"
              >
                {generatePolicies.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando políticas...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Todas as Políticas
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-end">
            <Button 
              variant="outline"
              onClick={handleGenerateAll}
              disabled={generatePolicies.isPending}
            >
              {generatePolicies.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerar Todas
                </>
              )}
            </Button>
          </div>
        )}

        {/* Policies List */}
        {hasGeneratedPolicies && (
          <div className="grid gap-4">
            {policies.map((policy) => {
              const policyInfo = POLICY_LABELS[policy.policy_type] || { label: policy.title, icon: "📄" };
              
              return (
                <Card key={policy.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{policyInfo.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{policyInfo.label}</h3>
                          {policy.is_auto_generated ? (
                            <Badge variant="secondary" className="text-xs">
                              <Sparkles className="mr-1 h-3 w-3" />
                              IA
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Pencil className="mr-1 h-3 w-3" />
                              Editado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          /{store.slug}/pagina/{policy.slug}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`publish-${policy.id}`}
                          checked={policy.is_published}
                          onCheckedChange={() => handleTogglePublish(policy.id, policy.is_published)}
                        />
                        <Label htmlFor={`publish-${policy.id}`} className="text-sm">
                          {policy.is_published ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <Check className="h-3 w-3" /> Publicado
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> Rascunho
                            </span>
                          )}
                        </Label>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setPreviewPolicy(policy.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditOpen(policy.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRegenerateOne(policy.policy_type)}
                          disabled={generatePolicies.isPending}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Missing Policies Warning */}
        {hasGeneratedPolicies && policies.length < 4 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Algumas políticas não foram geradas. Clique em "Regenerar Todas" para tentar novamente.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPolicy} onOpenChange={(open) => !open && setEditingPolicy(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar {currentEditPolicy && POLICY_LABELS[currentEditPolicy.policy_type]?.label}
            </DialogTitle>
            <DialogDescription>
              Edite o conteúdo completo ou o resumo que aparece na página do produto.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === 'content' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setEditTab('content')}
            >
              Conteúdo completo
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setEditTab('summary')}
            >
              Resumo (página do produto)
            </button>
          </div>

          {editTab === 'content' ? (
            <>
              <p className="text-sm text-muted-foreground">
                Este é o conteúdo completo da página de política. Após editar, ela será marcada como "Editado manualmente".
              </p>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Conteúdo HTML da política..."
              />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Este resumo curto aparece na aba "Trocas e devoluções" dentro da página do produto. 
                Deve ser objetivo e focado no que o cliente precisa saber antes de comprar.
                Se vazio, será usado o conteúdo completo.
              </p>
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="min-h-[250px] font-mono text-sm"
                placeholder="Resumo curto em HTML para a página do produto..."
              />
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingPolicy(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={updatePolicy.isPending}>
              {updatePolicy.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPolicy} onOpenChange={(open) => !open && setPreviewPolicy(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentPreviewPolicy && POLICY_LABELS[currentPreviewPolicy.policy_type]?.label}
            </DialogTitle>
          </DialogHeader>
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(currentPreviewPolicy?.content || "") }}
          />
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
