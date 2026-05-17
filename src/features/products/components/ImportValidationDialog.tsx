import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, XCircle, Package } from "lucide-react";
import { ValidationResult } from "../schemas/importValidation";

interface ImportValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: ValidationResult | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportValidationDialog = ({
  open,
  onOpenChange,
  validationResult,
  onConfirm,
  onCancel,
}: ImportValidationDialogProps) => {
  if (!validationResult) return null;

  const hasValidProducts = validationResult.valid.length > 0;
  const hasInvalidProducts = validationResult.invalid.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Validação de Produtos Importados</DialogTitle>
          <DialogDescription>
            Revise os resultados da validação antes de prosseguir
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4">
            {/* Produtos válidos - Preview em Cards */}
            {hasValidProducts && (
              <div className="space-y-3">
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <strong>{validationResult.valid.length}</strong> produto(s) válido(s) 
                    {hasInvalidProducts ? ' serão importados' : ' pronto para importação'}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {validationResult.valid.map((product, idx) => {
                    const imageUrl = product.images?.[0] || null;
                    const hasPromo = product.sale_price && product.sale_price < product.price;

                    return (
                      <Card key={idx} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardContent className="p-0">
                          {/* Imagem do produto */}
                          <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                              <img 
                                src={imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = `
                                    <div class="flex items-center justify-center w-full h-full">
                                      <svg class="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                      </svg>
                                    </div>
                                  `;
                                }}
                              />
                            ) : (
                              <Package className="w-12 h-12 text-muted-foreground" />
                            )}
                          </div>

                          {/* Informações do produto */}
                          <div className="p-3 space-y-2">
                            <h4 className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
                              {product.name}
                            </h4>
                            
                            <div className="flex items-baseline gap-2">
                              {hasPromo ? (
                                <>
                                  <span className="text-sm font-bold text-primary">
                                    R$ {product.sale_price!.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-muted-foreground line-through">
                                    R$ {product.price.toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-sm font-bold text-foreground">
                                  R$ {product.price.toFixed(2)}
                                </span>
                              )}
                            </div>

                            {product.stock_quantity !== undefined && product.stock_quantity > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Estoque: {product.stock_quantity}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Produtos inválidos */}
            {hasInvalidProducts && (
              <div className="space-y-3">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{validationResult.invalid.length}</strong> produto(s) com erro(s) 
                    {hasValidProducts ? ' serão ignorados' : ' - nenhum produto será importado'}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Erros encontrados:</h4>
                  {validationResult.invalid.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm"
                    >
                      <div className="font-medium mb-1">
                        Linha {item.row}: {item.data.name || '(sem nome)'}
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                        {item.errors.map((error, errorIdx) => (
                          <li key={errorIdx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nenhum produto válido */}
            {!hasValidProducts && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum produto válido para importação. Corrija os erros e tente novamente.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          {hasValidProducts && (
            <Button onClick={onConfirm}>
              Importar {validationResult.valid.length} Produto(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
