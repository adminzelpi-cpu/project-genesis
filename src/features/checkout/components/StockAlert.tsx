import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StockError {
  product_id: string;
  variation_id: string | null;
  product_name: string;
  requested: number;
  available: number;
}

interface StockAlertProps {
  stockErrors: StockError[];
  isValidating: boolean;
}

export function StockAlert({ stockErrors, isValidating }: StockAlertProps) {
  if (isValidating) {
    return (
      <Alert className="border-muted bg-muted/30">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Verificando disponibilidade dos produtos...
        </AlertDescription>
      </Alert>
    );
  }

  if (stockErrors.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Problema com estoque</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1 text-sm">
          {stockErrors.map((error, index) => (
            <li key={`${error.product_id}-${error.variation_id || index}`}>
              <strong>{error.product_name}</strong>:{" "}
              {error.available === 0 
                ? "produto esgotado" 
                : `apenas ${error.available} disponível(is), você pediu ${error.requested}`
              }
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs opacity-80">
          Ajuste as quantidades no carrinho para continuar.
        </p>
      </AlertDescription>
    </Alert>
  );
}
