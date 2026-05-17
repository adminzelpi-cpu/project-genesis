import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRetryPayment } from "@/features/payments";
import { useGatewayConfig } from "@/features/payments";
import { CustomerOrder } from "@/features/customers/hooks/useCustomerOrders";
import { PaymentMethodSection } from "@/features/checkout/components/PaymentMethodSection";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { PaymentResult } from "@/features/payments";
import { getPaymentErrorInfo, PaymentErrorInfo } from "@/features/checkout/utils/paymentErrorMapping";
import { getAcceptedBrands } from "@/features/checkout/utils/gatewayBrands";

interface OrderPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CustomerOrder | null;
  onSuccess: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function OrderPaymentDialog({ open, onOpenChange, order, onSuccess }: OrderPaymentDialogProps) {
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<PaymentErrorInfo | null>(null);
  
  const { retryPayment, isRetrying, canRetry } = useRetryPayment(order?.id);
  const { config: gatewayConfig, isLoading: isLoadingGateway } = useGatewayConfig(order?.store_id);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'Aguardando Pagamento';
      case 'expirado': return 'PIX/Boleto Expirado';
      case 'recusado': return 'Pagamento Recusado';
      case 'rejeitado': return 'Pagamento Recusado';
      case 'falhou': return 'Falha no Pagamento';
      default: return status;
    }
  };

  const handlePaymentComplete = async (paymentData: {
    type: "credit_card" | "pix" | "boleto";
    cardData?: any;
  }) => {
    if (!order) return;
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const result = await retryPayment({
        orderId: order.id,
        paymentMethod: paymentData.type,
        card: paymentData.type === "credit_card" && paymentData.cardData ? {
          number: paymentData.cardData.cardNumber.replace(/\D/g, ""),
          holder_name: paymentData.cardData.cardName,
          exp_month: parseInt(paymentData.cardData.cardExpiry.split("/")[0] || "1"),
          exp_year: parseInt("20" + (paymentData.cardData.cardExpiry.split("/")[1] || "25")),
          cvv: paymentData.cardData.cardCvv,
        } : undefined,
        installments: paymentData.type === "credit_card" ? (paymentData.cardData?.installments || 1) : undefined,
      });

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
        onOpenChange(false);
        
        // Redirect to retry-payment success page with payment result data
        navigate(buildPath(`/order/${order.id}/retry-payment?method=${paymentData.type}&completed=true`), {
          state: {
            paymentResult: result,
            selectedPaymentType: paymentData.type,
            selectedInstallments: paymentData.cardData?.installments || 1,
          },
        });
      } else {
        const errorInfo = getPaymentErrorInfo(
          result.errorCode,
          result.statusDetail,
          result.error,
          paymentData.type
        );
        setPaymentError(errorInfo);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Realizar Pagamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Order Info */}
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pedido</span>
              <span className="font-semibold text-foreground">
                #{order.order_number || order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-medium text-warning">
                {getStatusLabel(order.status_pagamento)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total a Pagar</span>
              <span className="text-2xl font-bold text-foreground">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment Method Section - Same as checkout */}
          {isLoadingGateway ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PaymentMethodSection
              orderTotal={order.subtotal - order.desconto}
              shippingPrice={order.frete}
              onPaymentComplete={handlePaymentComplete}
              paymentError={paymentError}
              onClearError={() => setPaymentError(null)}
              gatewayConfig={{
                ...gatewayConfig.installmentConfig,
                acceptedBrands: getAcceptedBrands(gatewayConfig.gatewayType),
                pixDiscount: gatewayConfig.pixDiscount,
                boletoDiscount: gatewayConfig.boletoDiscount,
                acceptCreditCard: gatewayConfig.acceptCreditCard,
                acceptPix: gatewayConfig.acceptPix,
                acceptBoleto: gatewayConfig.acceptBoleto,
              }}
              skipStockValidation
              hideBackButton
              stepNumber={1}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
