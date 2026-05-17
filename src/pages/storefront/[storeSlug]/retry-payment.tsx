import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { CheckoutHeader } from "@/features/checkout/components/CheckoutHeader";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { TrackingScripts } from "@/features/tracking/components/TrackingScripts";
import { PaymentMethodSection } from "@/features/checkout/components/PaymentMethodSection";
import { RetryOrderSummary } from "@/features/checkout/components/RetryOrderSummary";
import { ThankYouOrderSummary, ThankYouDeliveryAddress, OrderProduct, DeliveryAddress } from "@/features/checkout/components/ThankYouOrderSummary";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { useRetryPayment } from "@/features/payments";
import { useGatewayConfig } from "@/features/payments";
import { getAcceptedBrands } from "@/features/checkout/utils/gatewayBrands";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ThankYouPix from "@/features/checkout/components/ThankYouPix";
import ThankYouBoleto from "@/features/checkout/components/ThankYouBoleto";
import { getPaymentErrorInfo, PaymentErrorInfo } from "@/features/checkout/utils/paymentErrorMapping";
import ThankYouCartao from "@/features/checkout/components/ThankYouCartao";
import { 
  Loader2, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PaymentResult } from "@/features/payments";
import { Helmet } from "react-helmet";

export default function RetryPaymentPage() {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const orderIdParam = useParams<{ orderId: string }>().orderId || searchParams.get("orderId");
  
  const { store, isLoading: storeLoading } = useStorefront(storeSlug!);
  const { config: gatewayConfig, isLoading: isLoadingGateway } = useGatewayConfig(store?.id);
  const { 
    order, 
    orderNumber,
    isLoading: orderLoading, 
    canRetry, 
    retryPayment,
    isRetrying 
  } = useRetryPayment(orderIdParam || undefined);

  // Check if we arrived from the OrderPaymentDialog with a completed payment
  const navState = location.state as {
    paymentResult?: PaymentResult;
    selectedPaymentType?: "pix" | "boleto" | "credit_card";
    selectedInstallments?: number;
  } | null;

  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(navState?.paymentResult || null);
  const [showSuccess, setShowSuccess] = useState(!!navState?.paymentResult);
  const [selectedPaymentType, setSelectedPaymentType] = useState<"pix" | "boleto" | "credit_card">(navState?.selectedPaymentType || "pix");
  const [selectedInstallments, setSelectedInstallments] = useState(navState?.selectedInstallments || 1);
  const [paymentError, setPaymentError] = useState<PaymentErrorInfo | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Map order products to correct field names
  const mappedProducts = (order?.products as any[])?.map((p: any) => ({
    id: p.id || p.product_id || "",
    name: p.name || "",
    variant: p.variation || p.variant || undefined,
    quantity: p.quantity || 1,
    price: p.unit_price ?? p.price ?? 0,
    image: p.image_url || p.image || undefined,
  })) || [];

  const handlePaymentComplete = async (paymentData: {
    type: "credit_card" | "pix" | "boleto";
    cardData?: any;
  }) => {
    if (!order) return;

    setSelectedPaymentType(paymentData.type);
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
        setPaymentResult(result);
        setSelectedInstallments(paymentData.cardData?.installments || 1);
        setShowSuccess(true);
      } else {
        // Payment failed - show error inline
        const errorInfo = getPaymentErrorInfo(
          result.errorCode,
          result.statusDetail,
          result.error,
          paymentData.type
        );
        setPaymentError(errorInfo);
      }
    } catch (error) {
      console.error("Error retrying payment:", error);
      const errorInfo = getPaymentErrorInfo(
        undefined,
        undefined,
        error instanceof Error ? error.message : "Erro ao processar pagamento",
        paymentData.type
      );
      setPaymentError(errorInfo);
    }
  };

  const isLoading = storeLoading || orderLoading;

  // Detect desktop for layout
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Build order summary products for thank-you display
  const thankYouProducts: OrderProduct[] = mappedProducts.map(p => ({
    id: p.id,
    name: p.name,
    variant: p.variant,
    quantity: p.quantity,
    price: p.price,
    image: p.image,
  }));

  // Build delivery address from order
  const deliveryAddress: DeliveryAddress | undefined = order?.endereco_entrega && typeof order.endereco_entrega === 'object'
    ? (() => {
        const addr = order.endereco_entrega as any;
        return {
          street: addr.rua || addr.street || "",
          number: addr.numero || addr.number || "",
          complement: addr.complemento || addr.complement || undefined,
          neighborhood: addr.bairro || addr.neighborhood || "",
          city: addr.cidade || addr.city || "",
          state: addr.estado || addr.state || "",
          zipCode: addr.cep || addr.zipCode || "",
        };
      })()
    : undefined;

  // Show success/payment details after successful retry
  if (showSuccess && paymentResult) {
    const renderPaymentSuccess = () => {
      if (selectedPaymentType === "pix" && paymentResult.pix) {
        return (
          <ThankYouPix
            orderId={order?.order_number ? `#${order.order_number}` : (order?.id || "")}
            orderUuid={order?.id}
            amount={order?.total || 0}
            pixCode={paymentResult.pix.qrCode}
            qrCodeBase64={paymentResult.pix.qrCodeBase64}
            isPaid={paymentResult.status === "paid"}
            expiresAt={paymentResult.pix.expirationDate ? new Date(paymentResult.pix.expirationDate) : undefined}
          />
        );
      }
      
      if (selectedPaymentType === "boleto" && paymentResult.boleto) {
        return (
          <ThankYouBoleto
            orderId={order?.order_number ? `#${order.order_number}` : (order?.id || "")}
            amount={order?.total || 0}
            barcodeNumber={paymentResult.boleto.barcode}
            dueDate={new Date(paymentResult.boleto.expirationDate).toLocaleDateString("pt-BR")}
            boletoUrl={paymentResult.boleto.barcodeUrl}
          />
        );
      }

      if (selectedPaymentType === "credit_card") {
        return (
          <ThankYouCartao
            orderId={order?.order_number ? `#${order.order_number}` : (order?.id || "")}
            orderUuid={order?.id}
            amount={order?.total || 0}
            installments={selectedInstallments}
            estimatedDelivery="a confirmar"
          />
        );
      }

      return null;
    };

    const orderSummaryComponent = (
      <ThankYouOrderSummary
        products={thankYouProducts}
        subtotal={order?.subtotal || 0}
        shipping={order?.frete || 0}
        discount={order?.desconto || 0}
        total={order?.total || 0}
        collapsible={!isDesktop && selectedPaymentType !== "credit_card"}
        defaultExpanded={selectedPaymentType === "credit_card"}
      />
    );

    return (
      <StoreThemeProvider 
        primaryColor={store?.theme_primary_color} 
        secondaryColor={store?.theme_secondary_color}
        buttonTextColor={(store as any)?.button_text_color ?? null}
        primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
        faviconUrl={(store as any)?.favicon_url}
        fontFamily={(store as any)?.font_family}
      >
        <div className="min-h-screen bg-checkout-bg">
           <Helmet><title>Retentativa de Pagamento | {store?.name || 'Loja'}</title></Helmet>
           <TrackingScripts storeId={store?.id} />
           <CheckoutHeader />
          <main className="container mx-auto px-4 py-6 lg:py-8 max-w-[700px] lg:max-w-[1200px]">
            {/* Mobile: single column */}
            <div className="lg:hidden space-y-4">
              {renderPaymentSuccess()}
              {orderSummaryComponent}
              {deliveryAddress && <ThankYouDeliveryAddress address={deliveryAddress} />}
            </div>

            {/* Desktop: two columns matching checkout layout */}
            <div className="hidden lg:grid lg:grid-cols-[65%_35%] lg:gap-8">
              <div className="space-y-4">
                {renderPaymentSuccess()}
                {deliveryAddress && <ThankYouDeliveryAddress address={deliveryAddress} />}
              </div>
              <div>
                <div className="sticky top-8">
                  {orderSummaryComponent}
                </div>
              </div>
            </div>
          </main>
        </div>
      </StoreThemeProvider>
    );
  }

  return (
    <StoreThemeProvider 
      primaryColor={store?.theme_primary_color} 
      secondaryColor={store?.theme_secondary_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      faviconUrl={(store as any)?.favicon_url}
      fontFamily={(store as any)?.font_family}
    >
      <Helmet><title>Retentativa de Pagamento | {store?.name || 'Loja'}</title></Helmet>
      <TrackingScripts storeId={store?.id} />
      <div className="min-h-screen bg-checkout-bg">
        <CheckoutHeader />

        <main className="container mx-auto px-4 py-8 max-w-[1200px]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-checkout-text mb-2">Finalizar Pagamento</h1>
            <p className="text-checkout-muted">
              Complete o pagamento do pedido #{orderNumber}
            </p>
          </div>

          {isLoading ? (
            <div className="bg-white border border-checkout-border rounded-lg p-6 space-y-4 max-w-2xl mx-auto">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !order ? (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Pedido não encontrado</AlertTitle>
              <AlertDescription>
                Não foi possível encontrar este pedido. Verifique se o link está correto.
              </AlertDescription>
            </Alert>
          ) : !canRetry ? (
            <div className="bg-white border border-checkout-border rounded-lg p-8 text-center max-w-2xl mx-auto">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-checkout-text mb-2">Pagamento já realizado</h2>
              <p className="text-checkout-muted mb-6">
                Este pedido já foi pago ou está sendo processado.
              </p>
              <Button onClick={() => navigate(buildPath("/"))}>
                Voltar à loja
              </Button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column - Payment */}
              <div className="flex-1 lg:max-w-[65%] space-y-6">
                  <PaymentMethodSection
                    orderTotal={order.subtotal - order.desconto}
                    shippingPrice={order.frete}
                    onPaymentComplete={handlePaymentComplete}
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
                    paymentError={paymentError}
                    onClearError={() => setPaymentError(null)}
                  />
              </div>

              {/* Right Column - Order Summary (sticky on desktop, collapsible on mobile) */}
              <div className="lg:w-[35%]">
              <div className="lg:sticky lg:top-6">
                  <RetryOrderSummary
                    products={mappedProducts}
                    subtotal={order.subtotal}
                    shipping={order.frete}
                    discount={order.desconto}
                    total={order.total}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </StoreThemeProvider>
  );
}
