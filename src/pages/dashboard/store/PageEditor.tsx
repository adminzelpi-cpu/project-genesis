import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ArrowLeft, Save, Eye, Globe } from "lucide-react";
import { useStorePages, type StorePage } from "@/features/store/hooks/useStorePages";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";

// Helper to generate slug from title
const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

export default function PageEditor() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { store } = useActiveStore();
  const { pages, createPage, updatePage } = useStorePages();
  const isEditing = !!pageId;

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    is_published: false,
    meta_title: "",
    meta_description: "",
  });
  const [isSlugManual, setIsSlugManual] = useState(false);

  // Load existing page data
  useEffect(() => {
    if (isEditing && pages.length > 0) {
      const page = pages.find((p) => p.id === pageId);
      if (page) {
        setFormData({
          title: page.title,
          slug: page.slug,
          content: page.content || "",
          is_published: page.is_published,
          meta_title: page.meta_title || "",
          meta_description: page.meta_description || "",
        });
        setIsSlugManual(true);
      }
    }
  }, [isEditing, pageId, pages]);

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: isSlugManual ? prev.slug : generateSlug(title),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setIsSlugManual(true);
    setFormData((prev) => ({ ...prev, slug: generateSlug(slug) }));
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      return;
    }

    if (isEditing) {
      await updatePage.mutateAsync({ id: pageId, ...formData });
    } else {
      await createPage.mutateAsync(formData);
    }
    navigate("/dashboard/store/pages");
  };

  const previewUrl = store?.slug
    ? `/store/${store.slug}/page/${formData.slug}`
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/store/pages")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Editar Página" : "Nova Página"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing ? "Atualize o conteúdo da página" : "Crie uma nova página institucional"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {previewUrl && formData.is_published && (
            <Button variant="outline" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </a>
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={createPage.isPending || updatePage.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {createPage.isPending || updatePage.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Página *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: Sobre Nós, Política de Privacidade..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL da Página *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/page/</span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="sobre-nos"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Conteúdo da Página</Label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData((prev) => ({ ...prev, content }))}
                  placeholder="Digite o conteúdo da página..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Publicação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="published">Publicar página</Label>
                  <p className="text-sm text-muted-foreground">
                    Tornar visível na loja
                  </p>
                </div>
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(is_published) =>
                    setFormData((prev) => ({ ...prev, is_published }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Card */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Título SEO</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, meta_title: e.target.value }))
                  }
                  placeholder={formData.title || "Título para buscadores"}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.meta_title.length}/60 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">Descrição SEO</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, meta_description: e.target.value }))
                  }
                  placeholder="Descrição para buscadores..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.meta_description.length}/160 caracteres
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
