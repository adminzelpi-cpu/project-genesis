import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

interface CategoryInitialDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (name: string, shortDesc: string) => Promise<void>;
}

export function CategoryInitialDialog({ open, onClose, onGenerate }: CategoryInitialDialogProps) {
  const [categoryName, setCategoryName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!categoryName.trim() || !shortDescription.trim()) return;

    setIsGenerating(true);
    try {
      await onGenerate(categoryName, shortDescription);
      onClose();
    } catch (error) {
      console.error("Erro ao gerar conteúdo:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar Categoria com IA
          </DialogTitle>
          <DialogDescription>
            Informe o nome e uma breve descrição. A IA irá gerar automaticamente a descrição completa, SEO otimizado e muito mais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome da Categoria *</Label>
            <Input
              id="category-name"
              placeholder="Ex: Eletrônicos"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="short-desc">Descrição Curta *</Label>
            <Textarea
              id="short-desc"
              placeholder="Ex: Categoria de produtos eletrônicos incluindo smartphones, notebooks e acessórios"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={3}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Dica: Mencione o tipo de produtos e principais características
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSkip}
            disabled={isGenerating}
          >
            Pular e criar manualmente
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!categoryName.trim() || !shortDescription.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
