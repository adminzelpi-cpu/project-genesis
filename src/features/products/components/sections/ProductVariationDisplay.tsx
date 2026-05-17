import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProductVariationDisplayProps {
  displaySeparately: boolean;
  onDisplaySeparatelyChange: (value: boolean) => void;
  hideParentProduct?: boolean;
  onHideParentProductChange?: (value: boolean) => void;
  hasColorVariations: boolean;
}

export const ProductVariationDisplay = ({
  displaySeparately,
  onDisplaySeparatelyChange,
  hideParentProduct = true,
  onHideParentProductChange,
  hasColorVariations,
}: ProductVariationDisplayProps) => {
  if (!hasColorVariations) return null;

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="display-separately" className="font-semibold">
            Exibir cores separadamente
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  <strong>Ativado:</strong> Cada cor aparece como um card separado na categoria (ex: "Polo Vinho", "Polo Azul"). Na compra rápida, cliente seleciona só o tamanho.
                </p>
                <p className="mt-2">
                  <strong>Desativado:</strong> Um único card com todas as cores. Na compra rápida, cliente seleciona cor e tamanho.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id="display-separately"
          checked={displaySeparately}
          onCheckedChange={onDisplaySeparatelyChange}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {displaySeparately
          ? "Cada cor será exibida como produto separado na listagem"
          : "Todas as cores serão agrupadas em um único card"}
      </p>

      {displaySeparately && onHideParentProductChange && (
        <div className="pt-3 border-t border-dashed space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="hide-parent"
              checked={hideParentProduct}
              onCheckedChange={(checked) => onHideParentProductChange(!!checked)}
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="hide-parent"
                  className="text-sm font-medium cursor-pointer"
                >
                  Ocultar produto pai na listagem
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Mostra apenas as variações individuais (ex: "Polo Azul", "Polo Vermelha"), 
                        sem o produto base. Evita duplicação na listagem.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendado para evitar duplicação na categoria
              </p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md border-l-2 border-primary">
            <strong>Exemplo na categoria:</strong>
            <div className="mt-2 flex gap-2 flex-wrap">
              <span className="px-2 py-1 bg-background rounded text-foreground">Polo Azul</span>
              <span className="px-2 py-1 bg-background rounded text-foreground">Polo Vermelha</span>
              <span className="px-2 py-1 bg-background rounded text-foreground">Polo Preta</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
