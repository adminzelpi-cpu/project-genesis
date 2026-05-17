import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export interface DescriptionStyle {
  length: 'short' | 'medium' | 'long';
  format: 'paragraphs' | 'bullets' | 'mixed';
  focus: 'benefits' | 'features' | 'balanced';
  tone: 'professional' | 'casual' | 'persuasive';
  includeCTA: boolean;
}

export type GenerationMode = 'full' | 'description' | 'seo';

interface ProductInitialDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (name: string, shortDesc: string, style: DescriptionStyle) => Promise<void>;
  initialName?: string;
  initialShortDescription?: string;
  mode?: GenerationMode;
}

const modeConfig: Record<GenerationMode, { title: string; description: string; generateLabel: string }> = {
  full: {
    title: 'Criar Produto com IA',
    description: 'Informe o nome e uma breve descrição. A IA irá gerar automaticamente o título, descrição completa e SEO otimizado.',
    generateLabel: 'Gerar com IA',
  },
  description: {
    title: 'Gerar Descrição com IA',
    description: 'Informe os dados abaixo para gerar uma descrição otimizada para conversão.',
    generateLabel: 'Gerar Descrição',
  },
  seo: {
    title: 'Gerar SEO com IA',
    description: 'Informe os dados abaixo para gerar título e meta description otimizados para SEO.',
    generateLabel: 'Gerar SEO',
  },
};

export function ProductInitialDialog({ 
  open, 
  onClose, 
  onGenerate, 
  initialName = '', 
  initialShortDescription = '',
  mode = 'full' 
}: ProductInitialDialogProps) {
  const [productName, setProductName] = useState(initialName);
  const [shortDescription, setShortDescription] = useState(initialShortDescription);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStyleConfig, setShowStyleConfig] = useState(false);
  
  const [descriptionStyle, setDescriptionStyle] = useState<DescriptionStyle>(() => {
    const saved = localStorage.getItem('productDescriptionStyle');
    return saved ? JSON.parse(saved) : {
      length: 'medium',
      format: 'mixed',
      focus: 'benefits',
      tone: 'persuasive',
      includeCTA: true
    };
  });

  // Sync initial values when dialog opens
  useEffect(() => {
    if (open) {
      setProductName(initialName);
      setShortDescription(initialShortDescription);
    }
  }, [open, initialName, initialShortDescription]);

  useEffect(() => {
    localStorage.setItem('productDescriptionStyle', JSON.stringify(descriptionStyle));
  }, [descriptionStyle]);

  const handleGenerate = async () => {
    if (!productName.trim() || !shortDescription.trim()) return;

    setIsGenerating(true);
    try {
      await onGenerate(productName, shortDescription, descriptionStyle);
      onClose();
      setProductName("");
      setShortDescription("");
      setShowStyleConfig(false);
    } catch (error) {
      console.error("Erro ao gerar conteúdo:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const config = modeConfig[mode];
  const showStyleOptions = mode !== 'seo';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Nome do Produto *</Label>
            <Input
              id="product-name"
              placeholder="Ex: Polo básica preta de piquet"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={isGenerating}
              autoFocus={!initialName}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="short-desc">Descrição Curta *</Label>
            <Textarea
              id="short-desc"
              placeholder="Ex: Camisa polo em malha piquet, manga curta, com bordado no peito"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={3}
              disabled={isGenerating}
              autoFocus={!!initialName && !initialShortDescription}
            />
            <p className="text-xs text-muted-foreground">
              Dica: Mencione características principais, materiais e público-alvo
            </p>
          </div>

          {showStyleOptions && (
            <>
              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Estilo da Descrição
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStyleConfig(!showStyleConfig)}
                    disabled={isGenerating}
                  >
                    {showStyleConfig ? 'Ocultar' : 'Configurar'}
                  </Button>
                </div>

                {showStyleConfig && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tamanho</Label>
                      <RadioGroup
                        value={descriptionStyle.length}
                        onValueChange={(value: any) => setDescriptionStyle(prev => ({ ...prev, length: value }))}
                        disabled={isGenerating}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="short" id="short" />
                          <Label htmlFor="short" className="font-normal cursor-pointer">Curta (1-2 parágrafos)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="medium" />
                          <Label htmlFor="medium" className="font-normal cursor-pointer">Média (3-4 parágrafos)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="long" id="long" />
                          <Label htmlFor="long" className="font-normal cursor-pointer">Longa (5+ parágrafos)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Formato</Label>
                      <RadioGroup
                        value={descriptionStyle.format}
                        onValueChange={(value: any) => setDescriptionStyle(prev => ({ ...prev, format: value }))}
                        disabled={isGenerating}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="paragraphs" id="paragraphs" />
                          <Label htmlFor="paragraphs" className="font-normal cursor-pointer">Parágrafos corridos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="bullets" id="bullets" />
                          <Label htmlFor="bullets" className="font-normal cursor-pointer">Bullet points (•)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mixed" id="mixed" />
                          <Label htmlFor="mixed" className="font-normal cursor-pointer">Misto (parágrafos + bullets)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Foco Principal</Label>
                      <RadioGroup
                        value={descriptionStyle.focus}
                        onValueChange={(value: any) => setDescriptionStyle(prev => ({ ...prev, focus: value }))}
                        disabled={isGenerating}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="benefits" id="benefits" />
                          <Label htmlFor="benefits" className="font-normal cursor-pointer">Benefícios (o que o produto faz pelo cliente)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="features" id="features" />
                          <Label htmlFor="features" className="font-normal cursor-pointer">Características técnicas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="balanced" id="balanced" />
                          <Label htmlFor="balanced" className="font-normal cursor-pointer">Balanceado (benefícios + características)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tom de Voz</Label>
                      <RadioGroup
                        value={descriptionStyle.tone}
                        onValueChange={(value: any) => setDescriptionStyle(prev => ({ ...prev, tone: value }))}
                        disabled={isGenerating}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="professional" id="professional" />
                          <Label htmlFor="professional" className="font-normal cursor-pointer">Profissional e técnico</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="casual" id="casual" />
                          <Label htmlFor="casual" className="font-normal cursor-pointer">Casual e amigável</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="persuasive" id="persuasive" />
                          <Label htmlFor="persuasive" className="font-normal cursor-pointer">Persuasivo e empolgante</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cta"
                        checked={descriptionStyle.includeCTA}
                        onCheckedChange={(checked) => setDescriptionStyle(prev => ({ ...prev, includeCTA: !!checked }))}
                        disabled={isGenerating}
                      />
                      <Label htmlFor="cta" className="font-normal cursor-pointer">
                        Incluir call-to-action (convite à ação)
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isGenerating}
          >
            {mode === 'full' ? 'Pular e criar manualmente' : 'Cancelar'}
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!productName.trim() || !shortDescription.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {config.generateLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
