import { useState, useEffect, useRef } from 'react';
import { Loader2, Package, Truck, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CepSearchModal } from '@/features/checkout/components/CepSearchModal';
import { ShippingQuote } from '@/features/shipping/hooks/useShippingCalculator';
import { cn } from '@/lib/utils';

interface CepInfo {
  localidade: string;
  uf: string;
  logradouro?: string;
}

interface ProductShippingCalculatorProps {
  cep: string;
  onCepChange: (cep: string) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  quotes: ShippingQuote[];
  error: string | null;
  enableAutoScroll?: boolean;
}

export function ProductShippingCalculator({
  cep,
  onCepChange,
  onCalculate,
  isCalculating,
  quotes,
  error
}: ProductShippingCalculatorProps) {
  const [showCepSearchModal, setShowCepSearchModal] = useState(false);
  const [cepInfo, setCepInfo] = useState<CepInfo | null>(null);
  const [isFetchingCepInfo, setIsFetchingCepInfo] = useState(false);
  const lastCalculatedCep = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userInitiatedCalc = useRef(false);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Fetch CEP info and auto-calculate when CEP is complete
  useEffect(() => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length === 8 && cleanCep !== lastCalculatedCep.current) {
      lastCalculatedCep.current = cleanCep;
      setIsFetchingCepInfo(true);
      
      // Fetch CEP info from ViaCEP
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            setCepInfo({
              localidade: data.localidade,
              uf: data.uf,
              logradouro: data.logradouro
            });
          } else {
            setCepInfo(null);
          }
        })
        .catch(() => setCepInfo(null))
        .finally(() => setIsFetchingCepInfo(false));
      
      // Auto-calculate shipping and dismiss keyboard
      inputRef.current?.blur();
      userInitiatedCalc.current = true;
      onCalculate();
    } else if (cleanCep.length < 8) {
      setCepInfo(null);
      lastCalculatedCep.current = '';
    }
  }, [cep, onCalculate]);

  const handleCepSelect = (selectedCep: string) => {
    const formattedCep = selectedCep.replace(/(\d{5})(\d{3})/, '$1-$2');
    onCepChange(formattedCep);
    setShowCepSearchModal(false);
  };

  const handleCepInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format CEP as user types
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    onCepChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      userInitiatedCalc.current = true;
      onCalculate();
    }
  };

  // Scroll to center when quotes are loaded - only if user actively calculated
  useEffect(() => {
    if (quotes.length > 0 && containerRef.current && userInitiatedCalc.current) {
      userInitiatedCalc.current = false;
      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [quotes.length]);

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="text-sm font-medium">Calcular frete e prazo</div>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="00000-000"
          value={cep}
          onChange={handleCepInputChange}
          onKeyDown={handleKeyDown}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={9}
          className="flex-1 h-10"
        />
        <Button 
          variant="outline" 
          className="h-10 px-6 font-medium"
          onClick={() => { userInitiatedCalc.current = true; onCalculate(); }}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'CALCULAR'
          )}
        </Button>
      </div>
      <button 
        type="button"
        className="text-sm text-muted-foreground hover:underline"
        onClick={() => setShowCepSearchModal(true)}
      >
        Não sei meu CEP
      </button>

      {/* Shipping Error */}
      {error && (
        <div className="text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Delivery Location */}
      {(cepInfo || isFetchingCepInfo) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          {isFetchingCepInfo ? (
            <span>Buscando endereço...</span>
          ) : cepInfo && (
            <span>
              Entrega em{' '}
              <strong className="text-foreground">
                {cepInfo.logradouro ? `${cepInfo.logradouro}, ` : ''}{cepInfo.localidade} - {cepInfo.uf}
              </strong>
            </span>
          )}
        </div>
      )}

      {/* Shipping Quotes */}
      {quotes.length > 0 && (
        <div className="mt-3 space-y-2 border rounded-lg overflow-hidden">
          {quotes.map((quote, index) => (
            <div 
              key={quote.service_code}
              className={cn(
                "flex items-center justify-between p-3 gap-3",
                index > 0 && "border-t"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  {quote.is_free ? (
                    <Package className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Truck className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {quote.service_name || quote.carrier}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {quote.delivery_time === 1 
                      ? '1 dia útil' 
                      : `${quote.delivery_time} dias úteis`
                    }
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {quote.is_free ? (
                  <span className="text-sm font-medium text-success">Grátis</span>
                ) : (
                  <>
                    {/* Subsidy original price intentionally hidden — show only the final price */}
                    <div className="text-sm font-medium">
                      {formatCurrency(quote.price)}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CEP Search Modal */}
      <CepSearchModal 
        open={showCepSearchModal}
        onOpenChange={setShowCepSearchModal}
        onSelectCep={handleCepSelect}
      />
    </div>
  );
}