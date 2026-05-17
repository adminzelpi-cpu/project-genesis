import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

/** Convert any text into a URL-safe slug */
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface ProductBasicInfoProps {
  name: string;
  slug: string;
  description: string;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onGenerateDescription: () => void;
  isGenerating: boolean;
  productId?: string;
  /** The real store URL base, e.g. "https://larrizi.zelpi.com.br" */
  storeBaseUrl?: string;
}

export const ProductBasicInfo = ({
  name,
  slug,
  description,
  onNameChange,
  onSlugChange,
  onDescriptionChange,
  onGenerateDescription,
  isGenerating,
  productId,
  storeBaseUrl,
}: ProductBasicInfoProps) => {
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [tempSlug, setTempSlug] = useState(slug);

  // Keep tempSlug in sync when slug changes externally
  useEffect(() => {
    if (!isEditingSlug) {
      setTempSlug(slug);
    }
  }, [slug, isEditingSlug]);

  const handleEditSlug = () => {
    setTempSlug(slug);
    setIsEditingSlug(true);
  };

  const handleSaveSlug = () => {
    // Always slugify whatever the user typed
    const cleaned = toSlug(tempSlug);
    onSlugChange(cleaned);
    setIsEditingSlug(false);
  };

  const handleCancelSlug = () => {
    setTempSlug(slug);
    setIsEditingSlug(false);
  };

  // Build display base URL
  const displayBase = storeBaseUrl
    ? `${storeBaseUrl}/produto`
    : 'https://minhaloja.com.br/produto';

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-4">
      <div>
        <Label htmlFor="name">Nome do Produto *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={200}
          required
          className="mt-1.5"
        />
      </div>

      {productId && slug && (
        <div className="flex items-center gap-2">
          {!isEditingSlug ? (
            <>
              <p className="text-sm text-muted-foreground break-all">
                Link permanente: <span className="text-foreground">{displayBase}/{slug}/</span>
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
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Descrição</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onGenerateDescription}
            disabled={isGenerating}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {isGenerating ? 'Gerando...' : 'Gerar com IA'}
          </Button>
        </div>
        <RichTextEditor
          value={description}
          onChange={onDescriptionChange}
          placeholder="Escreva uma descrição detalhada do produto..."
        />
      </div>
    </div>
  );
};
