import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { storeKey } from "@/lib/storeStorageKeys";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { useCart } from "@/contexts/CartContext";
import { CheckoutHeader } from "@/features/checkout/components/CheckoutHeader";
import { CheckoutProgress } from "@/features/checkout/components/CheckoutProgress";
import { 
  CheckoutProvider, 
  useCheckout, 
  isPersonalDataComplete, 
  isDeliveryAddressComplete,
  hasReachedPaymentInSession,
  setReachedPayment,
  clearReachedPayment
} from "@/features/checkout/components/CheckoutContext";
import { StepPersonalData } from "@/features/checkout/components/StepPersonalData";
import { StepDeliveryAddress } from "@/features/checkout/components/StepDeliveryAddress";
import { StepPayment } from "@/features/checkout/components/StepPayment";
import { OrderSummary } from "@/features/checkout/components/OrderSummary";
import { StockAlert } from "@/features/checkout/components/StockAlert";
import { CheckoutFooter } from "@/features/checkout/components/CheckoutFooter";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateOrder, useCheckoutStockValidation } from "@/features/checkout";
import { usePaymentProcessor } from "@/features/payments";
import { useGatewayConfig } from "@/features/payments";
import { createMercadoPagoCardToken } from "@/features/payments/lib/mercadoPagoCardToken";
import { getPaymentErrorInfo, PaymentErrorInfo } from "@/features/checkout/utils/paymentErrorMapping";
import { sendTransactionalEmail, buildOrderDataFromOrder } from "@/features/emails";
import { getAcceptedBrands } from "@/features/checkout/utils/gatewayBrands";
import { useToast } from "@/hooks/use-toast";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { trackInitiateCheckout, trackAddPaymentInfo, refreshAdvancedMatching } from "@/features/tracking/lib/trackEvent";
import { useStoreCurrency } from "@/features/tracking/hooks/useStoreCurrency";
import { TrackingScripts } from "@/features/tracking/components/TrackingScripts";
import { StorefrontMeta } from "@/features/storefront/components/layout/StorefrontMeta";

function CheckoutPageContent() {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const navigate = useNavigate();
  const { store } = useStorefront(storeSlug);
  const storeCurrency = useStoreCurrency(store?.id);
  const { items, total, clearCart } = useCart();
  const { checkoutData, appliedDiscount, appliedCouponId, recognizedCustomer } = useCheckout();
  const { processPayment, isProcessing } = usePaymentProcessor();
  const createOrderMutation = useCreateOrder();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false); // Synchronous guard against double-click race
  const [paymentError, setPaymentError] = useState<PaymentErrorInfo | null>(null);
  const { config: footerGatewayConfig } = useGatewayConfig(store?.id);
  
  // Stock validation on mount and cart changes
  const { isValidating: isValidatingStock, stockErrors, hasStockIssues } = useCheckoutStockValidation({
    items: items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      variant: item.variant,
      variationId: item.variationId,
    })),
  });
  
  // Determine initial step based on completed data and session state
  const [currentStep, setCurrentStep] = useState(() => {
    const personalDataComplete = isPersonalDataComplete(checkoutData.personalData);
    const deliveryAddressComplete = isDeliveryAddressComplete(checkoutData.deliveryAddress);
    
    // Same session: if already reached payment, skip directly to payment
    if (hasReachedPaymentInSession() && personalDataComplete && deliveryAddressComplete) {
      return 3;
    }
    
    // New session or didn't reach payment yet: go to address if personal data complete
    if (personalDataComplete) {
      return 2;
    }
    
    // Otherwise start from beginning
    return 1;
  });

  // Track InitiateCheckout on mount
  useEffect(() => {
    if (items.length > 0) {
      // Use feed-format retailer ID (P{code}-C{x}-S{y}) so the Pixel/CAPI event
      // matches the Meta/Google catalog (Advantage+ Catalog Sales).
      // CRITICAL: if a cart item has a variationId but is missing colorCode/sizeCode,
      // we'd silently downgrade to P{code}-C{x} or P{code}, breaking funnel
      // consistency with AddToCart. Detect and warn loudly so we never ship
      // mismatched events to high-spend pixels.
      import("@/features/tracking/lib/retailerId").then(({ buildRetailerIdFromCodes, getContentGroupId }) => {
        for (const item of items) {
          if (item.variationId && (item.sizeCode == null || item.colorCode == null)) {
            console.warn(
              "[tracking] Cart item has variationId but missing color/size codes — InitiateCheckout retailer_id will be incomplete and will NOT match AddToCart.",
              { itemId: item.id, variationId: item.variationId, colorCode: item.colorCode, sizeCode: item.sizeCode }
            );
          }
        }
        trackInitiateCheckout(
          items.map(item => {
            const rid = buildRetailerIdFromCodes({
              productCode: item.productCode,
              productId: item.id,
              colorCode: item.colorCode,
              sizeCode: item.sizeCode,
              variationId: item.variationId,
            });
            return {
              id: rid,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              contentGroupId: getContentGroupId(rid, item.displaySeparately),
            };
          }),
          total,
          store?.id,
          storeCurrency,
        );
      });
    }
  }, [storeCurrency]);

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    if (
      err &&
      typeof err === "object" &&
      "message" in err &&
      typeof (err as any).message === "string"
    ) {
      return (err as any).message;
    }

    try {
      return JSON.stringify(err);
    } catch {
      return "Erro desconhecido";
    }
  };

  const handlePaymentComplete = async (
    paymentData: { type: "credit_card" | "pix" | "boleto"; cardData?: any },
    gatewayType?: "pagarme" | "mercadopago" | "mercado_pago" | null
  ) => {
    const paymentType = paymentData.type;
    // Synchronous lock — prevents double-submit on rapid clicks before React re-renders
    if (submitLockRef.current || isSubmitting) {
      console.warn("[checkout] Submission already in progress, ignoring duplicate request");
      return;
    }
    if (!store?.id) return;
    submitLockRef.current = true;

    // Track payment info selection — use retailer_id (matches feed + InitiateCheckout/Purchase)
    const { buildRetailerIdFromCodes, getContentGroupId } = await import("@/features/tracking/lib/retailerId");
    trackAddPaymentInfo(
      paymentType,
      total,
      store?.id,
      items.map(item => {
        const rid = buildRetailerIdFromCodes({
          productCode: item.productCode,
          productId: item.id,
          colorCode: item.colorCode,
          sizeCode: item.sizeCode,
          variationId: item.variationId,
        });
        return {
          id: rid,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          contentGroupId: getContentGroupId(rid, item.displaySeparately),
        };
      }),
      storeCurrency,
    );

    setIsSubmitting(true);
    setPaymentError(null);
    try {
      // 1. Create order AND pre-tokenize MP card in parallel (saves ~500ms-1s on credit card)
      const shipping = checkoutData.deliveryAddress.shippingPrice || 19.50;

      const orderPromise = createOrderMutation.mutateAsync({
        storeId: store.id,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          variant: item.variant,
          variationId: item.variationId,
        })),
        personalData: checkoutData.personalData,
        deliveryAddress: {
          ...checkoutData.deliveryAddress,
          shippingDeliveryDays: checkoutData.deliveryAddress.shippingQuote?.delivery_time,
          shippingCarrier: checkoutData.deliveryAddress.shippingQuote?.carrier,
          shippingMethodName: checkoutData.deliveryAddress.shippingQuote?.service_name,
        },
        paymentMethod: paymentType,
        subtotal: total,
        shipping: shipping,
        discount: appliedDiscount,
        observations: checkoutData.deliveryAddress.orderNotes,
        couponId: appliedCouponId,
        recognizedCustomerId: recognizedCustomer?.id || null,
      });

      // Pre-tokenize MP card in parallel with order creation
      const isMpCard =
        paymentType === "credit_card" &&
        paymentData.cardData &&
        (gatewayType === "mercadopago" || gatewayType === "mercado_pago");
      const cardTokenPromise = isMpCard
        ? createMercadoPagoCardToken({
            storeId: store.id,
            cardNumber: paymentData.cardData.cardNumber,
            holderName: paymentData.cardData.cardName || "",
            expMonth: parseInt(paymentData.cardData.cardExpiry?.split("/")[0] || "1"),
            expYear: parseInt("20" + (paymentData.cardData.cardExpiry?.split("/")[1] || "25")),
            cvv: paymentData.cardData.cardCvv || "",
            document: checkoutData.personalData.cpf,
          }).catch((e) => {
            console.error("[checkout] MP pre-tokenization failed (will retry inside processPayment):", e);
            return null;
          })
        : Promise.resolve(null);

      const [orderResult, preTokenizedCard] = await Promise.all([orderPromise, cardTokenPromise]);

      // 2. Process payment with gateway
      const paymentResult = await processPayment({
        gatewayType: gatewayType || undefined,
        storeId: store.id,
        orderId: orderResult.orderId,
        paymentMethod: paymentType,
        amount: Number((total + shipping - appliedDiscount).toFixed(2)),
        description: `Pedido ${orderResult.orderId}`,
        customer: {
          name: checkoutData.personalData.fullName,
          email: checkoutData.personalData.email,
          document: checkoutData.personalData.cpf,
          phone: checkoutData.personalData.phone,
        },
        // Use the card payload submitted by the form directly. Reading it from
        // checkoutData here is stale because updatePaymentMethod is async.
        card: paymentType === "credit_card" && paymentData.cardData ? {
          number: paymentData.cardData.cardNumber,
          holder_name: paymentData.cardData.cardName || "",
          exp_month: parseInt(paymentData.cardData.cardExpiry?.split("/")[0] || "1"),
          exp_year: parseInt("20" + (paymentData.cardData.cardExpiry?.split("/")[1] || "25")),
          cvv: paymentData.cardData.cardCvv || "",
        } : undefined,
        preTokenizedCard: preTokenizedCard || undefined,
        installments: paymentData.cardData?.installments || checkoutData.paymentMethod.installments,
        billingAddress: {
          line_1: `${checkoutData.deliveryAddress.street}, ${checkoutData.deliveryAddress.number}`,
          line_2: checkoutData.deliveryAddress.complement,
          zip_code: checkoutData.deliveryAddress.zipCode.replace(/\D/g, ""),
          neighborhood: checkoutData.deliveryAddress.neighborhood || "",
          city: checkoutData.deliveryAddress.city,
          state: checkoutData.deliveryAddress.state,
          country: "BR",
        },
      });

      if (!paymentResult.success) {
        // Gateway not configured = system error, not a real attempt → discard order
        if (paymentResult.errorCode === "NO_GATEWAY" || paymentResult.errorCode === "GATEWAY_NOT_CONFIGURED") {
          if (orderResult?.orderId) {
            supabase.rpc("delete_failed_order", { p_order_id: orderResult.orderId })
              .then(({ error }) => {
                if (error) console.warn("[checkout] Failed to cleanup order (no gateway):", error);
              });
          }

          toast({
            variant: "destructive",
            title: "Gateway não configurado",
            description: "O pagamento não pode ser processado. Entre em contato com a loja.",
          });

          // Navigate first, THEN clear cart — protects user data if navigation fails
          const paymentParam = paymentType === "credit_card" ? "cartao" : paymentType;
          navigate(buildPath(`/thank-you?payment=${paymentParam}&orderId=${orderResult.orderId}&orderNumber=${orderResult.orderNumber}&error=gateway`));
          setTimeout(() => clearCart(), 100);
          return;
        }

        // Real payment attempt that was REJECTED by the gateway (insufficient funds, antifraud, etc.)
        // Mark the order as 'recusado' so it shows up in the customer's account with a "Try again" button.
        // The merchant dashboard filters these out by default (separate "Recoverable" view).
        if (orderResult?.orderId) {
          supabase
            .from("orders")
            .update({ status_pagamento: "recusado" })
            .eq("id", orderResult.orderId)
            .then(({ error }) => {
              if (error) console.warn("[checkout] Failed to mark order as rejected:", error);
            });
        }

        // Other errors - show inline error with mapped message
        const errorInfo = getPaymentErrorInfo(
          paymentResult.errorCode,
          paymentResult.statusDetail,
          paymentResult.error,
          paymentType
        );
        setPaymentError(errorInfo);
        setIsSubmitting(false);
        submitLockRef.current = false; // Release lock so user can retry
        return;
      }

      // 3. Send order received email AFTER payment succeeds (PIX/boleto only - credit card gets email from webhook)
      if (paymentType !== "credit_card") {
        try {
          const orderData = buildOrderDataFromOrder({
            id: orderResult.orderId,
            order_number: orderResult.orderNumber,
            products: items.map(item => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              images: item.image ? [item.image] : [],
            })),
            subtotal: total,
            frete: shipping,
            desconto: appliedDiscount,
            total: total + shipping - appliedDiscount,
            endereco_entrega: {
              rua: checkoutData.deliveryAddress.street,
              numero: checkoutData.deliveryAddress.number,
              complemento: checkoutData.deliveryAddress.complement,
              bairro: checkoutData.deliveryAddress.neighborhood,
              cidade: checkoutData.deliveryAddress.city,
              estado: checkoutData.deliveryAddress.state,
              cep: checkoutData.deliveryAddress.zipCode,
            },
          });

          await sendTransactionalEmail({
            store_id: store.id,
            order_id: orderResult.orderId,
            email_type: "order_confirmed",
            recipient_email: checkoutData.personalData.email,
            recipient_name: checkoutData.personalData.fullName,
            order_data: orderData,
          });
          console.log("[checkout] Order received email sent after payment success");
        } catch (emailError) {
          console.error("[checkout] Failed to send order received email:", emailError);
        }
      }

      // 4. Navigate to thank-you page with payment data
      const paymentParam = paymentType === "credit_card" ? "cartao" : paymentType;

      // Store payment result in localStorage for thank-you page
      const thankYouData = {
        orderId: orderResult.orderId,
        amount: total + shipping - appliedDiscount,
        paymentResult: paymentResult,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(storeKey("thankyou_payment_data"), JSON.stringify(thankYouData));

      // Navigate first, THEN clear cart — protects user data if navigation fails
      navigate(buildPath(`/thank-you?payment=${paymentParam}&orderId=${orderResult.orderId}&orderNumber=${orderResult.orderNumber}`));
      setTimeout(() => clearCart(), 100);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error("Checkout error:", error);

      // Cleanup: if order was created before the exception (e.g. payment processing threw),
      // discard it. The RPC is safe — it never deletes paid orders.
      const possibleOrderId = (error as any)?.orderId;
      if (possibleOrderId) {
        supabase.rpc("delete_failed_order", { p_order_id: possibleOrderId })
          .then(({ error: rpcErr }) => {
            if (rpcErr) console.warn("[checkout] Cleanup after exception failed:", rpcErr);
          });
      }

      toast({
        variant: "destructive",
        title: "Erro no checkout",
        description: message,
      });
      setIsSubmitting(false);
      submitLockRef.current = false; // Release lock so user can retry
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
    }
  };

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-checkout-bg">
        <CheckoutHeader />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShoppingCart className="h-24 w-24 text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground mb-4">Seu carrinho está vazio</p>
              <Button onClick={() => navigate(buildPath("/search"))}>
                Ver todos os produtos
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Show loading overlay when submitting
  if (isSubmitting || isProcessing) {
    return (
      <div className="min-h-screen bg-checkout-bg">
        <CheckoutHeader />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Processando pagamento...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Por favor, aguarde enquanto finalizamos seu pedido.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-checkout-bg">
      <Helmet><title>Checkout | {store?.name || 'Loja'}</title></Helmet>
      <CheckoutHeader />

      <main className="container mx-auto px-4 py-6 lg:py-8 max-w-[700px] lg:max-w-[1200px]">
        <CheckoutProgress currentStep={currentStep} onStepClick={handleStepClick} />

        {/* Mobile/Tablet - Order Summary (collapsible) */}
        <div className="lg:hidden mt-4">
          <OrderSummary shipping={checkoutData.deliveryAddress?.shippingPrice || 0} />
        </div>

        {/* Stock Alert */}
        {(hasStockIssues || isValidatingStock) && (
          <div className="mt-4 lg:mt-6">
            <StockAlert stockErrors={stockErrors} isValidating={isValidatingStock} />
          </div>
        )}

        <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[65%_35%] lg:gap-8">
          {/* Main Content */}
          <div>
            {currentStep === 1 && (
              <StepPersonalData onNext={() => { refreshAdvancedMatching(); setCurrentStep(2); }} storeId={store?.id} />
            )}
            {currentStep === 2 && (
              <StepDeliveryAddress 
                onNext={() => {
                  setReachedPayment();
                  setCurrentStep(3);
                }} 
                onBack={() => setCurrentStep(1)}
                storeId={store?.id}
                defaultShippingCost={store?.default_shipping_cost ?? undefined}
                freeShippingThreshold={store?.free_shipping_threshold}
              />
            )}
            {currentStep === 3 && (
              <StepPayment
                onBack={() => setCurrentStep(2)}
                onNext={handlePaymentComplete}
                paymentError={paymentError}
                onClearPaymentError={() => setPaymentError(null)}
              />
            )}
          </div>

          {/* Desktop - Order Summary (always visible) */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              <OrderSummary shipping={checkoutData.deliveryAddress?.shippingPrice || 0} />
            </div>
          </div>
        </div>
      </main>

      <CheckoutFooter acceptedBrands={getAcceptedBrands(footerGatewayConfig.gatewayType)} />
    </div>
  );
}

function CheckoutPageWrapper() {
  const storeSlug = useStoreSlug();
  const { store } = useStorefront(storeSlug);

  return (
    <StoreThemeProvider 
      primaryColor={store?.theme_primary_color} 
      secondaryColor={store?.theme_secondary_color}
      buttonColor={store?.button_color}
      buttonHoverColor={store?.button_hover_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      buttonBorderRadius={store?.button_border_radius}
      faviconUrl={(store as any)?.favicon_url}
      fontFamily={(store as any)?.font_family}
    >
      <StorefrontMeta
        title="Checkout"
        storeName={store?.name}
        faviconUrl={(store as any)?.favicon_url}
        noIndex
      />
      <TrackingScripts storeId={store?.id} />
      <CheckoutProvider>
        <CheckoutPageContent />
      </CheckoutProvider>
    </StoreThemeProvider>
  );
}

export default function CheckoutPage() {
  return <CheckoutPageWrapper />;
}
