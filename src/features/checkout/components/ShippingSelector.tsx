import { useState, useEffect, useRef, useCallback } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { useShippingCalculator, ShippingQuote, ShippingItem } from "@/features/shipping";
import { cn } from "@/lib/utils";

type ShippingPreference = 'cheapest' | 'fastest' | null;

interface ShippingSelectorProps {
  storeId: string;
  destinationCep: string;
  items: ShippingItem[];
  selectedQuote: ShippingQuote | null;
  onSelectQuote: (quote: ShippingQuote) => void;
  defaultShippingCost?: number;
  freeShippingThreshold?: number | null;
  onLoadingChange?: (isLoading: boolean) => void;
}

// Helper to create a stable items key for comparison
function getItemsKey(items: ShippingItem[]): string {
  return items.map(i => `${i.quantity}:${i.price}`).join('|');
}

// Helper to find the cheapest quote
function findCheapestQuote(quotes: ShippingQuote[]): ShippingQuote | undefined {
  return quotes.reduce((cheapest, q) => 
    !cheapest || q.price < cheapest.price ? q : cheapest
  , undefined as ShippingQuote | undefined);
}

// Helper to find the fastest quote
function findFastestQuote(quotes: ShippingQuote[]): ShippingQuote | undefined {
  return quotes.reduce((fastest, q) => 
    !fastest || q.delivery_time < fastest.delivery_time ? q : fastest
  , undefined as ShippingQuote | undefined);
}

export function ShippingSelector({
  storeId,
  destinationCep,
  items,
  selectedQuote,
  onSelectQuote,
  defaultShippingCost,
  freeShippingThreshold,
  onLoadingChange,
}: ShippingSelectorProps) {
  const { calculateShipping, quotes, isLoading, error } = useShippingCalculator();

  // Notify parent about loading state changes
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  // Track user's preference (cheapest or fastest)
  const userPreferenceRef = useRef<ShippingPreference>(null);
  
  // Track the last items key and CEP to detect changes
  const lastItemsKeyRef = useRef<string>(getItemsKey(items));
  const lastCepRef = useRef<string>(destinationCep.replace(/\D/g, ""));
  const currentItemsKey = getItemsKey(items);
  const currentCleanCep = destinationCep.replace(/\D/g, "");
  
  // Detect if items or CEP changed
  const itemsChanged = lastItemsKeyRef.current !== currentItemsKey;
  const cepChanged = lastCepRef.current !== currentCleanCep;

  // Determine user preference when they manually select a quote
  const handleSelectQuote = useCallback((quote: ShippingQuote) => {
    if (quotes.length > 1) {
      const cheapest = findCheapestQuote(quotes);
      const fastest = findFastestQuote(quotes);
      
      if (cheapest && quote.service_code === cheapest.service_code) {
        userPreferenceRef.current = 'cheapest';
      } else if (fastest && quote.service_code === fastest.service_code) {
        userPreferenceRef.current = 'fastest';
      } else {
        // User selected something in between, default to cheapest on recalc
        userPreferenceRef.current = 'cheapest';
      }
    }
    onSelectQuote(quote);
  }, [quotes, onSelectQuote]);

  useEffect(() => {
    const cleanCep = destinationCep.replace(/\D/g, "");
    if (cleanCep.length === 8 && storeId && items.length > 0) {
      // Track items/CEP change for preference-based reselection
      const shouldRecalculate = itemsChanged || cepChanged || !hasCalculated;
      
      if (shouldRecalculate) {
        lastItemsKeyRef.current = currentItemsKey;
        lastCepRef.current = currentCleanCep;
        setHasCalculated(false);
        
        calculateShipping(storeId, cleanCep, items).then((results) => {
          setHasCalculated(true);
          
          if (results.length > 0) {
            // Re-select based on user preference or default to cheapest
            const preference = userPreferenceRef.current || 'cheapest';
            let quoteToSelect: ShippingQuote | undefined;
            
            if (preference === 'fastest') {
              quoteToSelect = findFastestQuote(results);
            } else {
              quoteToSelect = findCheapestQuote(results);
            }
            
            if (quoteToSelect) {
              onSelectQuote(quoteToSelect);
            }
          }
        });
      }
    }
  }, [destinationCep, storeId, currentItemsKey, hasCalculated, itemsChanged, cepChanged]);

  // Calculate total for free shipping check
  const totalValue = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hasFreeShipping = freeShippingThreshold && totalValue >= freeShippingThreshold;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Calculando frete...</span>
      </div>
    );
  }

  if (error && hasCalculated) {
    // Show default shipping if available
    if (defaultShippingCost !== undefined && defaultShippingCost !== null) {
      const defaultQuote: ShippingQuote = {
        service_code: "default",
        service_name: "Entrega Padrão",
        carrier: "Loja",
        price: hasFreeShipping ? 0 : defaultShippingCost,
        delivery_time: 7,
        is_free: hasFreeShipping || false,
      };

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <Label className="text-sm font-medium">Forma de entrega</Label>
          <div
            onClick={() => onSelectQuote(defaultQuote)}
            className={cn(
              "flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-colors",
              "border-primary bg-primary/5"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{defaultQuote.service_name}</span>
                <span className="font-semibold whitespace-nowrap">
                  {defaultQuote.is_free ? (
                    <span className="text-green-600">Grátis</span>
                  ) : (
                    formatCurrency(defaultQuote.price)
                  )}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Entrega em até {defaultQuote.delivery_time} dias úteis
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (quotes.length === 0 && hasCalculated) {
    // Show default shipping if no quotes
    if (defaultShippingCost !== undefined && defaultShippingCost !== null) {
      const defaultQuote: ShippingQuote = {
        service_code: "default",
        service_name: "Entrega Padrão",
        carrier: "Loja",
        price: hasFreeShipping ? 0 : defaultShippingCost,
        delivery_time: 7,
        is_free: hasFreeShipping || false,
      };

      return (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Forma de entrega</Label>
          <div
            onClick={() => onSelectQuote(defaultQuote)}
            className={cn(
              "flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-colors",
              "border-primary bg-primary/5"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{defaultQuote.service_name}</span>
                <span className="font-semibold whitespace-nowrap">
                  {defaultQuote.is_free ? (
                    <span className="text-green-600">Grátis</span>
                  ) : (
                    formatCurrency(defaultQuote.price)
                  )}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Entrega em até {defaultQuote.delivery_time} dias úteis
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma opção de frete disponível para este CEP
      </div>
    );
  }

  if (quotes.length === 0) {
    return null; // Still loading or no CEP provided
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Selecione a forma de entrega</Label>
      <RadioGroup
        value={selectedQuote?.service_code || ""}
        onValueChange={(value) => {
          const quote = quotes.find((q) => q.service_code === value);
          if (quote) handleSelectQuote(quote);
        }}
        className="space-y-2"
      >
        {quotes.map((quote) => (
          <label
            key={quote.service_code}
            htmlFor={quote.service_code}
            className={cn(
              "flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-colors",
              selectedQuote?.service_code === quote.service_code
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground/50"
            )}
          >
            <RadioGroupItem value={quote.service_code} id={quote.service_code} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{quote.service_name}</span>
                </div>
                <span className="font-semibold whitespace-nowrap">
                  {quote.is_free ? (
                    <span className="text-green-600">Grátis</span>
                  ) : (
                    formatCurrency(quote.price)
                  )}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Entrega em até {quote.delivery_time} dia{quote.delivery_time > 1 ? "s" : ""} {quote.delivery_time > 1 ? "úteis" : "útil"}
              </div>
              {/* Subsidy original price intentionally hidden — show only the final price */}
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
