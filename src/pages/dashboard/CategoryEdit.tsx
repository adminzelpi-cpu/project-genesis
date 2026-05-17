import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCategories } from "@/features/categories";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductCategory } from "@/features/categories";

/** Convert any text into a URL-safe slug */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CategoryEdit() {
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { store, isLoading: storeLoading } = useActiveStore();
  const { getStoreCategories, loading: categoriesLoading } = useCategories();
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [tempSlug, setTempSlug] = useState("");
  const [storeBaseUrl, setStoreBaseUrl] = useState("");
  
  // AI generation modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalField, setAiModalField] = useState<'description' | 'seo_title' | 'seo_description' | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    google_category: "",
    seo_title: "",
    seo_description: "",
    parent_id: "" as string,
    is_active: true,
  });

  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);

  const storeIdFromParams = searchParams.get('storeId');
  const currentStoreId = store?.id || storeIdFromParams;

  // Auto-sync slug with name for new categories
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (!categoryId && !slugManuallyEdited) {
      setSlug(toSlug(formData.name));
    }
  }, [formData.name, categoryId, slugManuallyEdited]);

  // Load store base URL
  useEffect(() => {
    if (!currentStoreId) return;
    const loadStoreUrl = async () => {
      const { data: storeData } = await supabase
        .from('stores')
        .select('slug')
        .eq('id', currentStoreId)
        .single();

      const { data: customDomain } = await supabase
        .from('custom_domains')
        .select('domain')
        .eq('store_id', currentStoreId)
        .eq('is_verified', true)
        .eq('is_primary', true)
        .maybeSingle();

      if (customDomain?.domain) {
        setStoreBaseUrl(`https://${customDomain.domain}`);
      } else if (storeData?.slug) {
        setStoreBaseUrl(`https://${storeData.slug}.zelpi.com.br`);
      }
    };
    loadStoreUrl();
  }, [currentStoreId]);

  useEffect(() => {
    if (!currentStoreId) return;
    // Always load all categories for the parent selector
    getStoreCategories(currentStoreId, { includeInactive: true }).then(setAllCategories);
    if (categoryId) {
      loadCategory();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, currentStoreId]);

  const loadCategory = async () => {
    if (!categoryId || !currentStoreId) return;

    setLoading(true);
    try {
      const categories = await getStoreCategories(currentStoreId, { includeInactive: true });
      const foundCategory = categories.find((c) => c.id === categoryId);

      if (foundCategory) {
        setCategory(foundCategory);
        setSlug(foundCategory.slug || toSlug(foundCategory.name));
        setSlugManuallyEdited(true); // existing category, don't auto-sync
        setFormData({
          name: foundCategory.name,
          description: foundCategory.description || "",
          google_category: foundCategory.google_category || "",
          seo_title: foundCategory.seo_title || "",
          seo_description: foundCategory.seo_description || "",
          parent_id: foundCategory.parent_id || "",
          is_active: foundCategory.is_active,
        });
      } else {
        toast.error("Categoria não encontrada");
        navigate("/dashboard/categories");
      }
    } catch (error) {
      toast.error("Erro ao carregar categoria");
      navigate("/dashboard/categories");
    } finally {
      setLoading(false);
    }
  };

  const openAiModal = (field: 'description' | 'seo_title' | 'seo_description') => {
    setAiModalField(field);
    setAiPrompt("");
    setAiModalOpen(true);
  };

  const handleAiGenerate = async () => {
    if (!formData.name.trim() || !aiModalField) return;
    
    setAiModalOpen(false);
    setGeneratingField(aiModalField);
    
    try {
      const contextHint = aiPrompt.trim() ? ` Contexto adicional: ${aiPrompt}` : '';
      
      const fieldPrompts = {
        description: `Categoria de produtos: ${formData.name}.${contextHint} Crie uma descrição atraente e informativa em HTML para esta categoria de produtos de e-commerce. Use tags HTML como <p>, <strong>, <ul>, <li> para estruturar o conteúdo.`,
        seo_title: `Categoria de produtos: ${formData.name}.${contextHint} Crie um título SEO otimizado (máx 60 caracteres) para esta categoria de e-commerce. Retorne APENAS o texto do título, sem tags HTML.`,
        seo_description: `Categoria de produtos: ${formData.name}.${contextHint} Crie uma meta description SEO otimizada (máx 160 caracteres) para esta categoria de e-commerce. Retorne APENAS o texto da descrição, sem tags HTML.`
      };

      const { data, error } = await supabase.functions.invoke('generate-product-content', {
        body: { 
          productName: formData.name,
          shortDescription: fieldPrompts[aiModalField]
        }
      });

      if (error) throw error;

      if (data) {
        const fieldMap = {
          description: data.fullDescription,
          seo_title: data.metaTitle,
          seo_description: data.metaDescription
        };
        
        setFormData(prev => ({ ...prev, [aiModalField]: fieldMap[aiModalField] || '' }));
        toast.success("Conteúdo gerado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao gerar com IA:", error);
      toast.error("Erro ao gerar conteúdo. Tente novamente.");
    } finally {
      setGeneratingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStoreId) return;

    setSaving(true);
    try {
      const finalSlug = toSlug(slug || formData.name);
      const payload = {
        ...formData,
        parent_id: formData.parent_id || null,
        slug: finalSlug,
      };

      if (categoryId) {
        const { error } = await supabase
          .from('product_categories')
          .update(payload)
          .eq('id', categoryId);

        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert({ ...payload, store_id: currentStoreId });

        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }

      navigate("/dashboard/categories");
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      toast.error("Erro ao salvar categoria");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSlug = () => {
    setTempSlug(slug);
    setIsEditingSlug(true);
  };

  const handleSaveSlug = () => {
    const cleaned = toSlug(tempSlug);
    setSlug(cleaned);
    setSlugManuallyEdited(true);
    setIsEditingSlug(false);
  };

  const handleCancelSlug = () => {
    setTempSlug(slug);
    setIsEditingSlug(false);
  };

  const displayBase = storeBaseUrl
    ? `${storeBaseUrl}/categoria`
    : 'https://minhaloja.com.br/categoria';

  const displayDomain = storeBaseUrl
    ? storeBaseUrl.replace(/^https?:\/\//, '')
    : 'www.minhaloja.com.br';

  const aiFieldLabels: Record<string, string> = {
    description: 'Descrição',
    seo_title: 'Título SEO',
    seo_description: 'Descrição SEO',
  };

  // Build list of valid parent options (exclude self and any descendants to avoid cycles)
  const descendantIds = new Set<string>();
  if (categoryId) {
    const collect = (id: string) => {
      descendantIds.add(id);
      allCategories
        .filter((c) => c.parent_id === id)
        .forEach((c) => collect(c.id));
    };
    collect(categoryId);
  }
  const parentOptions = allCategories.filter((c) => !descendantIds.has(c.id));

  if (!currentStoreId && !storeLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/categories")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Selecione uma loja primeiro</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/categories")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando categoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard/categories")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {categoryId ? 'Editar Categoria' : 'Nova Categoria'}
            </h1>
            <p className="text-muted-foreground">
              {categoryId ? 'Atualize as informações da categoria' : 'Adicione uma nova categoria à sua loja'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Configure os detalhes principais da categoria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Categoria *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Eletrônicos"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">Categoria pai (opcional)</Label>
              <Select
                value={formData.parent_id || "__none__"}
                onValueChange={(value) =>
                  setFormData({ ...formData, parent_id: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger id="parent_id">
                  <SelectValue placeholder="Nenhuma (categoria principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma (categoria principal)</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Use para criar subcategorias (ex: "Masculino" → "Camisetas").
              </p>
            </div>

            {/* Slug / Link permanente */}
            {slug && (
              <div className="space-y-2">
                <Label>Link permanente</Label>
                <div className="flex items-center gap-2">
                  {!isEditingSlug ? (
                    <>
                      <p className="text-sm text-muted-foreground break-all">
                        <span className="text-foreground">{displayBase}/{slug}/</span>
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleEditSlug}
                        className="text-xs h-auto py-1 px-3 shrink-0"
                      >
                        Editar
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <p className="text-sm text-muted-foreground whitespace-nowrap">
                        {displayBase}/
                      </p>
                      <Input
                        value={tempSlug}
                        onChange={(e) => setTempSlug(e.target.value)}
                        placeholder="digite o nome ou slug desejado"
                        className="flex-1 min-w-[200px]"
                      />
                      <p className="text-sm text-muted-foreground">/</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSaveSlug}
                        className="h-auto py-1 px-3"
                      >
                        OK
                      </Button>
                      <button
                        type="button"
                        onClick={handleCancelSlug}
                        className="text-sm text-primary underline hover:no-underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Label htmlFor="description">Descrição</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openAiModal('description')}
                  disabled={generatingField === 'description' || !formData.name.trim()}
                  className="text-primary hover:text-primary/80 h-auto py-1"
                >
                  {generatingField === 'description' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Gerar com IA
                    </>
                  )}
                </Button>
              </div>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Descrição da categoria..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground">Categoria ativa na loja</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Shopping</CardTitle>
            <CardDescription>Otimize para o Google Shopping</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google_category">Categoria do Google Shopping</Label>
              <Input
                id="google_category"
                value={formData.google_category}
                onChange={(e) => setFormData({ ...formData, google_category: e.target.value })}
                placeholder="Ex: Vestuário e acessórios > Roupas"
              />
              <p className="text-xs text-muted-foreground">
                O texto deve ser igual ao do{' '}
                <a 
                  href="https://support.google.com/merchants/answer/6324436" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
            <CardDescription>Otimize para mecanismos de busca</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SEO Preview */}
            <div className="border rounded-lg p-4 bg-background max-w-sm">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {displayDomain} › categorias › {slug || 'categoria'}
                </div>
                <div className="font-medium text-primary hover:underline cursor-pointer text-base">
                  {formData.seo_title || formData.name || 'Título da Categoria'}
                </div>
                <div className="text-muted-foreground text-sm">
                  {formData.seo_description || 'Descrição da categoria aparecerá aqui nos resultados de busca.'}
                </div>
              </div>
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label>Slug (URL amigável)</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="ex-eletronicos"
              />
              <p className="text-xs text-muted-foreground">
                URL: {displayDomain}/categorias/{slug || 'categoria-exemplo'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <Label htmlFor="seo_title">Título SEO</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openAiModal('seo_title')}
                  disabled={generatingField === 'seo_title' || !formData.name.trim()}
                  className="text-primary hover:text-primary/80 h-auto py-1"
                >
                  {generatingField === 'seo_title' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Gerar com IA
                    </>
                  )}
                </Button>
              </div>
              <Input
                id="seo_title"
                value={formData.seo_title}
                onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                placeholder="Ex: Comprar Eletrônicos - Loja Online"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                {formData.seo_title.length}/60 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <Label htmlFor="seo_description">Descrição SEO</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openAiModal('seo_description')}
                  disabled={generatingField === 'seo_description' || !formData.name.trim()}
                  className="text-primary hover:text-primary/80 h-auto py-1"
                >
                  {generatingField === 'seo_description' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Gerar com IA
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="seo_description"
                value={formData.seo_description}
                onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                placeholder="Descrição para mecanismos de busca..."
                maxLength={160}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.seo_description.length}/160 caracteres
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/categories")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !formData.name.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              categoryId ? 'Atualizar Categoria' : 'Criar Categoria'
            )}
          </Button>
        </div>
      </form>

      {/* AI Generation Modal */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerar {aiModalField ? aiFieldLabels[aiModalField] : ''} com IA
            </DialogTitle>
            <DialogDescription>
              Adicione um contexto ou descrição breve para que a IA gere um conteúdo mais assertivo para a categoria <strong>{formData.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Breve descrição (opcional)</Label>
              <Textarea
                id="ai-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`Ex: Categoria de ${formData.name || 'produtos'} para público feminino, foco em qualidade e preço acessível...`}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Quanto mais contexto você der, melhor será o resultado gerado pela IA.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAiModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleAiGenerate} disabled={!formData.name.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
