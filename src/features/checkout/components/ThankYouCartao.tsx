import React from 'react';
import { CheckCircle, CreditCard, Package, Mail, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useStorePath } from '@/contexts/StoreSlugContext';

interface ThankYouCartaoProps {
  orderId: string;
  orderUuid?: string;
  amount: number;
  installments: number;
  estimatedDelivery: string;
}

export default function ThankYouCartao({ orderId, orderUuid, amount, installments, estimatedDelivery }: ThankYouCartaoProps) {
  const navigate = useNavigate();
  const { buildPath } = useStorePath();

  return (
    <Card>
      <CardContent className="p-6 lg:p-8">
        {/* Success header */}
        <div className="mb-5">
          <h1 className="text-xl lg:text-2xl font-bold text-green-600 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 lg:w-7 lg:h-7 shrink-0" />
            Pagamento Aprovado!
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1 ml-8 lg:ml-9">
            Seu pedido foi confirmado com sucesso
          </p>
        </div>

        {/* Order info — compact inline */}
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-800">Pedido</span>
            <span className="text-base font-bold text-green-900">{orderId}</span>
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-green-900">
              R$ {amount.toFixed(2).replace('.', ',')}
            </span>
            {installments > 1 && (
              <p className="text-[11px] text-green-700">
                {installments}x de R$ {(amount / installments).toFixed(2).replace('.', ',')}
              </p>
            )}
          </div>
        </div>

        {/* Payment method + delivery — side by side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="bg-white border border-checkout-border rounded-lg p-3 flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">Cartão de Crédito</p>
              <p className="text-xs text-muted-foreground">
                {installments > 1 ? `Parcelado em ${installments}x` : 'À vista'}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Prazo de Entrega</p>
              <p className="text-xs text-blue-700">
                Até <strong>{estimatedDelivery}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Next steps — compact timeline */}
        <div className="mb-5">
          <h3 className="font-bold text-sm mb-3">Próximos Passos</h3>
          
          <div className="space-y-2">
            <div className="flex gap-3 items-center p-2.5 bg-green-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs lg:text-sm">
                <strong className="text-green-700">Pagamento confirmado!</strong>{' '}
                <span className="text-muted-foreground">Email enviado com os detalhes</span>
              </p>
            </div>
            <div className="flex gap-3 items-center p-2.5 bg-white border border-checkout-border rounded-lg">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                2
              </div>
              <p className="text-xs lg:text-sm text-muted-foreground">
                Pedido sendo <strong className="text-foreground">preparado para envio</strong>
              </p>
            </div>
            <div className="flex gap-3 items-center p-2.5 bg-white border border-checkout-border rounded-lg">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                3
              </div>
              <p className="text-xs lg:text-sm text-muted-foreground">
                Receberá o <strong className="text-foreground">código de rastreamento</strong> por email
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {orderUuid && (
            <Button
              variant="outline"
              onClick={() => navigate(buildPath(`/customer/orders/${orderUuid}`))}
              className="w-full font-bold"
              style={{
                borderColor: 'hsl(var(--store-button, var(--store-primary, var(--success))))',
                color: 'hsl(var(--store-button, var(--store-primary, var(--success))))',
                borderRadius: 'var(--store-button-radius, 0.375rem)',
              }}
              size="lg"
            >
              <Truck className="w-4 h-4 mr-2" />
              ACOMPANHAR PEDIDO
            </Button>
          )}
          <Button
            onClick={() => navigate(buildPath('/'))}
            className="w-full font-bold"
            style={{
              backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--success))))',
              color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--success-foreground))))',
              borderRadius: 'var(--store-button-radius, 0.375rem)',
            }}
            onMouseEnter={(e) => {
              const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
              if (hoverColor) {
                e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--store-button, var(--store-primary, var(--success))))';
            }}
            size="lg"
          >
            CONTINUAR COMPRANDO
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
