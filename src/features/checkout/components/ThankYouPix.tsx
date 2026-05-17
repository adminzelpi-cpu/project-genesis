import React, { useState, useEffect } from 'react';
import { Copy, Check, CheckCircle, Clock, Shield, Zap, Sparkles, AlertCircle, RefreshCcw, QrCode, Truck, CreditCard, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useStorePath } from '@/contexts/StoreSlugContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface ThankYouPixProps {
  orderId: string;
  orderUuid?: string;
  amount: number;
  pixCode: string;
  qrCodeBase64?: string;
  isPaid?: boolean;
  expiresAt?: Date;
}

export default function ThankYouPix({ 
  orderId, 
  orderUuid,
  amount, 
  pixCode, 
  qrCodeBase64,
  isPaid: initialIsPaid = false,
  expiresAt 
}: ThankYouPixProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const [showQRCode, setShowQRCode] = useState(isDesktop);
  const [codeCopied, setCodeCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isPaid, setIsPaid] = useState(initialIsPaid);
  const [realExpiresAt, setRealExpiresAt] = useState<Date | undefined>(expiresAt);

  // Fetch real expiration from payment_transactions if not provided
  useEffect(() => {
    if (expiresAt || !orderUuid) return;
    
    const fetchExpiration = async () => {
      // payment_type varies by gateway (e.g. "bank_transfer" for MP, "pix" for Pagar.me)
      // so we also check payment_method and look for qr_code presence as a reliable indicator
      const { data } = await supabase
        .from('payment_transactions')
        .select('expiration_date')
        .eq('order_id', orderUuid)
        .not('qr_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data?.expiration_date) {
        setRealExpiresAt(new Date(data.expiration_date));
      }
    };
    
    fetchExpiration();
  }, [orderUuid, expiresAt]);

  // Poll order payment status every 5 seconds
  useEffect(() => {
    if (isPaid || !orderUuid) return;

    const poll = async () => {
      const { data: rpcData } = await supabase
        .rpc('get_order_for_checkout_view', { p_order_id: orderUuid });
      
      const data = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      
      if (data?.status_pagamento === 'pago' || data?.status_pagamento === 'aprovado') {
        setIsPaid(true);
        setIsExpired(false);
        const storageKey = `pix_timestamp_${orderId}`;
        localStorage.removeItem(storageKey);
      } else if (
        data?.status_pagamento === 'expirado' || 
        data?.status_pagamento === 'cancelado'
      ) {
        setIsExpired(true);
        setTimeLeft(0);
        const storageKey = `pix_timestamp_${orderId}`;
        localStorage.removeItem(storageKey);
      }
    };

    const interval = setInterval(poll, 5000);
    poll(); // check immediately
    return () => clearInterval(interval);
  }, [orderUuid, isPaid, orderId]);

  useEffect(() => {
    const storageKey = `pix_timestamp_${orderId}`;
    const storedTimestamp = localStorage.getItem(storageKey);
    
    if (!storedTimestamp) {
      const now = Date.now();
      localStorage.setItem(storageKey, now.toString());
    }
  }, [orderId]);

  useEffect(() => {
    if (isPaid) return; // no timer needed if paid
    
    const effectiveExpiresAt = realExpiresAt;

    const updateTimeLeft = () => {
      if (effectiveExpiresAt) {
        const now = Date.now();
        const remaining = Math.floor((effectiveExpiresAt.getTime() - now) / 1000);
        
        if (remaining <= 0) {
          setTimeLeft(0);
          setIsExpired(true);
        } else {
          setTimeLeft(remaining);
        }
        return;
      }

      // No expiration info yet — keep timeLeft as -1 to indicate "loading"
      setTimeLeft(-1);
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [orderId, realExpiresAt, isPaid]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerProgress = () => {
    if (!realExpiresAt || timeLeft <= 0) return 0;
    // Use a reasonable max (e.g. 1h = 3600s) for color scaling
    const maxSeconds = 3600;
    return Math.min(timeLeft / maxSeconds, 1);
  };

  const getTimerColor = () => {
    const progress = getTimerProgress();
    if (progress > 0.5) return '#00A86B';
    if (progress > 0.25) return '#F59E0B';
    return '#EF4444';
  };

  const getPaymentStatus = () => {
    if (isExpired) return 'expired';
    if (codeCopied) return 'pending';
    return 'waiting';
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCodeCopied(true);
    toast({
      title: "✓ Código PIX copiado!",
      description: "Cole no app do seu banco para realizar o pagamento.",
      duration: 3000,
    });
    setTimeout(() => setCodeCopied(false), 3000);
  };

  const truncatePixCode = (code: string, maxLength: number = 40) => {
    if (code.length <= maxLength) return code;
    return code.substring(0, maxLength) + '...';
  };

  useEffect(() => {
    if (isPaid) {
      const storageKey = `pix_timestamp_${orderId}`;
      localStorage.removeItem(storageKey);
    }
  }, [isPaid, orderId]);

  if (isPaid) {
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
            </div>
          </div>

          {/* Payment method + info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="bg-white border border-checkout-border rounded-lg p-3 flex items-center gap-3">
              <Zap className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold">PIX</p>
                <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Pedido Confirmado</p>
                <p className="text-xs text-blue-700">Em preparação</p>
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

  if (isExpired) {
    return (
      <Card>
        <CardContent className="p-6 lg:p-8">
          {/* Expired header — same pattern as success */}
          <div className="mb-5">
            <h1 className="text-xl lg:text-2xl font-bold text-destructive flex items-center gap-2">
              <AlertCircle className="w-6 h-6 lg:w-7 lg:h-7 shrink-0" />
              PIX Expirado
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground mt-1 ml-8 lg:ml-9">
              O tempo para pagamento expirou
            </p>
          </div>

          {/* Order info — compact inline */}
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-800">Pedido</span>
              <span className="text-base font-bold text-red-900">{orderId}</span>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-red-900">
                R$ {amount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Reassurance message */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 mb-5">
            <Shield className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Seu pedido está reservado!</p>
              <p className="text-xs text-amber-700">Os itens continuam garantidos. Basta escolher como pagar.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={() => {
                const retryId = orderUuid || orderId;
                navigate(buildPath(`/order/${retryId}/retry-payment`));
              }}
              className="w-full font-bold"
              style={{
                backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--primary))))',
                color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--primary-foreground))))',
                borderRadius: 'var(--store-button-radius, 0.375rem)',
              }}
              onMouseEnter={(e) => {
                const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
                if (hoverColor) {
                  e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(var(--store-button, var(--store-primary, var(--primary))))';
              }}
              size="lg"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              ESCOLHER NOVO PAGAMENTO
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(buildPath('/'))}
              className="w-full font-bold"
              style={{
                borderColor: 'hsl(var(--store-button, var(--store-primary, var(--primary))))',
                color: 'hsl(var(--store-button, var(--store-primary, var(--primary))))',
                borderRadius: 'var(--store-button-radius, 0.375rem)',
              }}
              size="lg"
            >
              VOLTAR PARA A LOJA
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Instruções para modo Copia e Cola
  const copyPasteInstructions = [
    { step: 1, bold: "Copie o código", normal: "clicando no botão acima" },
    { step: 2, bold: "app do seu banco", normal: "Abra o", suffix: " e escolha", boldSuffix: "PIX Copia e Cola" },
    { step: 3, bold: "Cole o código", normal: "e confirme o pagamento", isSuccess: true },
  ];

  // Instruções para modo QR Code
  const qrCodeInstructions = [
    { step: 1, bold: "app do seu banco", normal: "Abra o", suffix: " e escolha", boldSuffix: "Pagar com QR Code" },
    { step: 2, bold: "", normal: "Aponte a câmera para o", boldSuffix: "QR Code acima" },
    { step: 3, bold: "confirme o pagamento", normal: "Verifique os dados e", isSuccess: true },
  ];

  const currentInstructions = showQRCode ? qrCodeInstructions : copyPasteInstructions;

  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="flex justify-center mb-4">
          <div className={`inline-flex items-center gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-semibold ${
            getPaymentStatus() === 'pending' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              getPaymentStatus() === 'pending' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
            }`} />
            {getPaymentStatus() === 'pending' ? 'Aguardando confirmação' : 'Aguardando pagamento'}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-3 lg:gap-4">
          <div className="text-center lg:text-left lg:flex-1">
            <h1 className="text-lg lg:text-xl font-bold mb-1 flex items-center justify-center lg:justify-start gap-2">
              <Sparkles className="w-5 h-5 text-checkout-success" />
              PIX gerado com sucesso!
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Pagamento instantâneo e seguro
            </p>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-1">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm" style={{ borderColor: getTimerColor() }}>
              <Clock className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: getTimerColor() }} />
              <div className="text-xl lg:text-2xl font-bold tabular-nums" style={{ color: getTimerColor() }}>
                {timeLeft === -1 ? '...' : formatTime(timeLeft)}
              </div>
            </div>
            <p className="text-[10px] lg:text-xs text-muted-foreground">Tempo para conclusão do pagamento</p>
          </div>
        </div>


        <div className="max-w-2xl mx-auto">
          {showQRCode ? (
            <>
              {/* QR Code View */}
              <div className="flex justify-center mb-5 lg:mb-6">
                <div className="w-56 h-56 lg:w-64 lg:h-64 bg-white border-4 border-checkout-success rounded-xl p-2 lg:p-3 shadow-lg">
                  {qrCodeBase64 ? (
                    <img 
                      src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} 
                      alt="QR Code PIX" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full bg-white rounded-lg flex items-center justify-center">
                      <div className="grid grid-cols-8 lg:grid-cols-9 gap-1">
                        {Array.from({ length: window.innerWidth >= 1024 ? 81 : 64 }, (_, i) => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 lg:w-3 lg:h-3 ${Math.random() > 0.5 ? 'bg-[#1a1a1a]' : 'bg-white'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Copy Code View */}
              <div className="text-center mb-4 lg:mb-5">
                <h3 className="text-sm lg:text-base font-bold mb-1">Copie o código PIX</h3>
                <p className="text-xs text-muted-foreground">Cole no app do seu banco</p>
              </div>

              <div className="bg-white border-2 border-checkout-success rounded-xl p-3 lg:p-4 mb-4">
                <div className="bg-white rounded-lg p-2.5 lg:p-3 mb-3 flex items-center justify-center border border-checkout-success/30 overflow-hidden">
                  <span className="text-xs lg:text-sm font-mono text-checkout-success font-bold truncate text-center">
                    {truncatePixCode(pixCode)}
                  </span>
                </div>
                <Button
                  onClick={copyPixCode}
                  size="lg"
                  className={`w-full font-bold transition-all duration-300 ${
                    codeCopied 
                      ? 'bg-green-600 hover:bg-green-700 text-white scale-105' 
                      : ''
                  }`}
                  style={!codeCopied ? {
                    backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--foreground))))',
                    color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--background))))',
                    borderRadius: 'var(--store-button-radius, 0.375rem)',
                  } : { borderRadius: 'var(--store-button-radius, 0.375rem)' }}
                  onMouseEnter={(e) => {
                    if (codeCopied) return;
                    const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
                    if (hoverColor) e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
                  }}
                  onMouseLeave={(e) => {
                    if (codeCopied) return;
                    e.currentTarget.style.backgroundColor = 'hsl(var(--store-button, var(--store-primary, var(--foreground))))';
                  }}
                >
                  {codeCopied ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      CÓDIGO COPIADO!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-2" />
                      COPIAR CÓDIGO PIX
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Como pagar com PIX - Instruções dinâmicas */}
          <div className="mb-6">
            <h3 className="text-sm lg:text-base font-bold text-center mb-4">Como pagar com PIX</h3>
            
            <div className="space-y-3">
              {currentInstructions.map((instruction) => (
                <div key={instruction.step} className="flex items-start gap-3 p-3 bg-white border border-border rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-checkout-success text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {instruction.step}
                  </div>
                  <p className="text-sm">
                    {instruction.normal && !instruction.suffix && (
                      <>
                        <strong className={instruction.isSuccess ? 'text-checkout-success' : ''}>{instruction.bold}</strong>{' '}
                        <span className="text-muted-foreground">{instruction.normal}</span>
                      </>
                    )}
                    {instruction.suffix && (
                      <>
                        {instruction.normal}{' '}
                        <strong>{instruction.bold}</strong>
                        {instruction.suffix}{' '}
                        <strong className={instruction.isSuccess ? 'text-checkout-success' : ''}>{instruction.boldSuffix}</strong>
                      </>
                    )}
                    {!instruction.suffix && instruction.boldSuffix && (
                      <>
                        {instruction.normal}{' '}
                        <strong className={instruction.isSuccess ? 'text-checkout-success' : ''}>{instruction.boldSuffix}</strong>
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Botão para alternar entre modos */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-3">
              {showQRCode 
                ? 'Ou, se preferir, use o código Pix (copia e cola)' 
                : 'Ou, se preferir, use o QR Code'
              }
            </p>
            <Button
              variant="outline"
              onClick={() => setShowQRCode(!showQRCode)}
              className="border-checkout-success text-checkout-success hover:bg-checkout-success/10"
            >
              {showQRCode ? (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Usar Copia e Cola
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Usar QR Code
                </>
              )}
            </Button>
          </div>

          {/* Pedido Info */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Pedido <span className="font-bold text-foreground">#{orderId}</span>
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full bg-checkout-success" />
              <span className="text-sm text-checkout-success font-medium">Reservado</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
