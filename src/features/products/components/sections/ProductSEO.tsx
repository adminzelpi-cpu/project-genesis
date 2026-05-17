import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Monitor, Smartphone, Store } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProductSEOProps {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  productImage?: string;
  storeName?: string;
  storeBaseUrl?: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onGenerateField: (field: 'meta_title' | 'meta_description') => void;
  generatingField: string | null;
}

export const ProductSEO = ({
  metaTitle,
  metaDescription,
  slug,
  productImage,
  storeName = 'Minha Loja',
  storeBaseUrl,
  onMetaTitleChange,
  onMetaDescriptionChange,
  onSlugChange,
  onGenerateField,
  generatingField,
}: ProductSEOProps) => {
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  const displayDomain = storeBaseUrl
    ? storeBaseUrl.replace(/^https?:\/\//, '')
    : 'www.minhaloja.com.br';

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-5">
      <h3 className="font-semibold">SEO - Otimização para Mecanismos de Busca</h3>
      
      {/* Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Pré-visualização no Google</Label>
          <div className="flex gap-1 bg-muted rounded-md p-1">
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                previewDevice === 'mobile' 
                  ? 'bg-background shadow-sm' 
                  : 'hover:bg-background/50'
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors",
                previewDevice === 'desktop' 
                  ? 'bg-background shadow-sm' 
                  : 'hover:bg-background/50'
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className={cn(
          "border rounded-lg p-4 bg-background",
          previewDevice === 'mobile' && "max-w-sm"
        )}>
          {previewDevice === 'desktop' ? (
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                    <Store className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">{storeName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {displayDomain} › produtos › {slug || 'produto'}
                </div>
                <div className="font-medium text-primary hover:underline cursor-pointer text-xl">
                  {metaTitle || 'Título do Produto - Minha Loja'}
                </div>
                <div className="text-muted-foreground text-base">
                  {metaDescription || 'Descrição do produto aparecerá aqui. Máximo de 160 caracteres para melhor visualização nos resultados de busca.'}
                </div>
              </div>
              {productImage && (
                <img 
                  src={productImage} 
                  alt="Product preview" 
                  className="w-32 h-32 object-cover rounded-lg flex-shrink-0"
                />
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                  <Store className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium">{storeName}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {displayDomain} › produtos › {slug || 'produto'}
              </div>
              <div className="font-medium text-primary hover:underline cursor-pointer text-base">
                {metaTitle || 'Título do Produto - Minha Loja'}
              </div>
              <div className="flex gap-3 items-start">
                <div className="text-muted-foreground text-sm flex-1">
                  {metaDescription || 'Descrição do produto aparecerá aqui. Máximo de 160 caracteres para melhor visualização nos resultados de busca.'}
                </div>
                {productImage && (
                  <img 
                    src={productImage} 
                    alt="Product preview" 
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slug */}
      <div>
        <Label htmlFor="slug">Slug (URL amigável)</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          placeholder="produto-exemplo"
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          URL: {displayDomain}/produtos/{slug || 'produto-exemplo'}
        </p>
      </div>

      {/* Meta Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="meta_title">Título SEO</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onGenerateField('meta_title')}
            disabled={generatingField === 'meta_title'}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {generatingField === 'meta_title' ? 'Gerando...' : 'Gerar com IA'}
          </Button>
        </div>
        <Input
          id="meta_title"
          value={metaTitle}
          onChange={(e) => onMetaTitleChange(e.target.value)}
          maxLength={60}
          placeholder="Ex: Camiseta Básica Masculina - Algodão Premium"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {metaTitle.length}/60 caracteres
        </p>
      </div>

      {/* Meta Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label htmlFor="meta_description">Meta Descrição</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onGenerateField('meta_description')}
            disabled={generatingField === 'meta_description'}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {generatingField === 'meta_description' ? 'Gerando...' : 'Gerar com IA'}
          </Button>
        </div>
        <Textarea
          id="meta_description"
          value={metaDescription}
          onChange={(e) => onMetaDescriptionChange(e.target.value)}
          maxLength={160}
          rows={3}
          placeholder="Ex: Conheça nossa camiseta básica masculina em algodão premium. Conforto e qualidade com preço acessível. Frete grátis acima de R$ 100."
        />
        <p className="text-xs text-muted-foreground mt-1">
          {metaDescription.length}/160 caracteres
        </p>
      </div>
    </div>
  );
};
