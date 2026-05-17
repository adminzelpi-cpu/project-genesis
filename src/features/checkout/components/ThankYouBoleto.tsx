import React, { useState } from 'react';
import { Copy, Check, Download, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface ThankYouBoletoProps {
  orderId: string;
  amount: number;
  barcodeNumber: string;
  dueDate: string;
  boletoUrl: string;
}

export default function ThankYouBoleto({ orderId, amount, barcodeNumber, dueDate, boletoUrl }: ThankYouBoletoProps) {
  const { toast } = useToast();
  const [barcodeCopied, setBarcodeCopied] = useState(false);

  const copyBarcode = () => {
    navigator.clipboard.writeText(barcodeNumber);
    setBarcodeCopied(true);
    toast({
      title: "✓ Código de barras copiado!",
      description: "Cole no app do seu banco para realizar o pagamento.",
      duration: 3000,
    });
    setTimeout(() => setBarcodeCopied(false), 3000);
  };

  const downloadBoleto = () => {
    window.open(boletoUrl, '_blank');
    toast({
      title: "✓ Boleto aberto!",
      description: "Você pode salvá-lo ou imprimi-lo.",
      duration: 3000,
    });
  };

  const getDaysUntilDue = (): number | null => {
    // dueDate comes as "dd/mm/yyyy" formatted string
    const parts = dueDate.split('/');
    if (parts.length === 3) {
      const due = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!isNaN(due.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    return null;
  };

  const daysLeft = getDaysUntilDue();

  return (
    <Card>
      <CardContent className="p-6 lg:p-8">
        {/* Status badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Aguardando pagamento
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-5">
          <h1 className="text-lg lg:text-xl font-bold mb-1 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
            Boleto gerado com sucesso!
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground">
            Pague até <strong className="text-foreground">{dueDate}</strong>
            {daysLeft !== null && daysLeft >= 0 && (
              <span className={`ml-1 ${daysLeft <= 1 ? 'text-red-600' : 'text-orange-700'}`}>
                ({daysLeft === 0 ? 'vence hoje!' : daysLeft === 1 ? 'vence amanhã!' : `${daysLeft} dias`})
              </span>
            )}
          </p>
        </div>

        {/* Value */}
        <div className="bg-white border border-checkout-border rounded-lg p-3 lg:p-4 mb-5 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Valor do Boleto</p>
          <p className="text-2xl lg:text-3xl font-bold text-checkout-title">
            R$ {amount.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Barcode section */}
        <div className="mb-4">
          <div className="text-center mb-3">
            <h3 className="text-sm lg:text-base font-bold mb-0.5">Código de Barras</h3>
            <p className="text-xs text-muted-foreground">Copie e cole no app do seu banco</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 rounded-lg p-3 lg:p-4">
            <div className="bg-white rounded-lg p-2 lg:p-3 mb-2 lg:mb-3 flex items-center gap-2 border border-checkout-border">
              <input
                type="text"
                value={barcodeNumber}
                readOnly
                className="flex-1 bg-transparent border-none outline-none text-xs lg:text-sm font-mono text-checkout-title font-bold break-all"
              />
            </div>
            <Button
              onClick={copyBarcode}
              className={`w-full font-bold transition-all duration-300 ${
                barcodeCopied 
                  ? 'bg-green-600 hover:bg-green-700 text-white scale-105' 
                  : ''
              }`}
              style={!barcodeCopied ? {
                backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--foreground))))',
                color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--background))))',
                borderRadius: 'var(--store-button-radius, 0.375rem)',
              } : { borderRadius: 'var(--store-button-radius, 0.375rem)' }}
              onMouseEnter={(e) => {
                if (barcodeCopied) return;
                const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
                if (hoverColor) e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
              }}
              onMouseLeave={(e) => {
                if (barcodeCopied) return;
                e.currentTarget.style.backgroundColor = 'hsl(var(--store-button, var(--store-primary, var(--foreground))))';
              }}
            >
              {barcodeCopied ? (
                <>
                  <Check className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                  CÓDIGO COPIADO!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                  COPIAR CÓDIGO DE BARRAS
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Download button */}
        <div className="mb-6">
          <Button
            onClick={downloadBoleto}
            className="w-full font-bold"
            style={{
              backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--foreground))))',
              color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--background))))',
              borderRadius: 'var(--store-button-radius, 0.375rem)',
            }}
            onMouseEnter={(e) => {
              const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
              if (hoverColor) e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--store-button, var(--store-primary, var(--foreground))))';
            }}
          >
            <Download className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            BAIXAR BOLETO (PDF)
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-1.5">
            Você pode imprimir ou pagar pelo app do banco
          </p>
        </div>

        {/* How to pay */}
        <div className="mb-6">
          <h3 className="text-sm lg:text-base font-bold text-center mb-4">Como pagar o boleto</h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-white border border-border rounded-lg">
              <div className="w-6 h-6 rounded-full bg-checkout-success text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p className="text-sm">
                <strong>Baixe o boleto</strong>{' '}
                <span className="text-muted-foreground">ou copie o código de barras acima</span>
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white border border-border rounded-lg">
              <div className="w-6 h-6 rounded-full bg-checkout-success text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p className="text-sm">
                Abra o{' '}
                <strong>app do seu banco</strong>{' '}
                <span className="text-muted-foreground">e escolha</span>{' '}
                <strong>Pagar Boleto</strong>
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white border border-border rounded-lg">
              <div className="w-6 h-6 rounded-full bg-checkout-success text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p className="text-sm">
                <strong className="text-checkout-success">Cole o código</strong>{' '}
                <span className="text-muted-foreground">e confirme o pagamento</span>
              </p>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex gap-2.5">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              <strong className="text-blue-900">Confirmação em até 2 dias úteis.</strong> Seu pedido será processado após a confirmação.
            </p>
          </div>
        </div>

        {/* Order ID */}
        <div className="text-center pt-4 border-t border-checkout-border">
          <p className="text-xs text-muted-foreground">
            Pedido <span className="text-checkout-title font-bold">{orderId}</span>
          </p>
          <div className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-orange-50 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold text-orange-700">Reservado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
