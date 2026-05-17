import { useSearchParams } from "react-router-dom";
import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { storeKey } from "@/lib/storeStorageKeys";
import { CheckoutHeader } from "@/features/checkout/components/CheckoutHeader";
import ThankYouPix from "@/features/checkout/components/ThankYouPix";
import ThankYouBoleto from "@/features/checkout/components/ThankYouBoleto";
import ThankYouCartao from "@/features/checkout/components/ThankYouCartao";
import { ThankYouOrderSummary, ThankYouDeliveryAddress, OrderProduct, DeliveryAddress } from "@/features/checkout/components/ThankYouOrderSummary";
import { useCart } from "@/contexts/CartContext";
import { useState, useEffect, useRef } from "react";
import { PaymentResult } from "@/features/checkout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { TrackingScripts } from "@/features/tracking/components/TrackingScripts";
import { usePublicTrackingConfig } from "@/features/tracking";
import { trackPurchase, ProductData } from "@/features/tracking/lib/trackEvent";
import { useStoreCurrency } from "@/features/tracking/hooks/useStoreCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { getOrderItemVariant } from "@/features/orders/lib/getOrderItemVariant";
import { Helmet } from "react-helmet";
import { SaveAccountCard } from "@/features/auth";

interface CheckoutStoredData {
  personalData?: {
    email?: string;
    fullName?: string;
    phone?: string;
    cpf?: string;
  };
  deliveryAddress?: {
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    shippingPrice?: number;
  };
  paymentMethod?: {
    type?: string;
    installments?: number;
  };
}

interface ThankYouPaymentData {
  orderId: string;
  amount: number;
  paymentResult: PaymentResult;
  createdAt: string;
}

export default function ThankYouPage() {
  const storeSlug = useStoreSlug();
  const [searchParams] = useSearchParams();
  const paymentMethod = searchParams.get("payment") || "pix";
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");
  const hasError = searchParams.get("error");
  const displayOrderId = orderNumber ? `#${orderNumber}` : (orderId || "---");
  const isMobile = useIsMobile();
  // lg breakpoint (1024px) — tablet shows single column like mobile
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    setIsDesktop(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  
  const { store } = useStorefront(storeSlug!);
  const { items, total: cartTotal } = useCart();
  const { data: trackingConfig } = usePublicTrackingConfig(store?.id);
  const storeCurrency = useStoreCurrency(store?.id);
  
  // Load checkout and payment data from localStorage
  const [checkoutData, setCheckoutData] = useState<CheckoutStoredData>({});
  const [paymentData, setPaymentData] = useState<ThankYouPaymentData | null>(null);
  const purchaseTrackedRef = useRef(false);
  
  // Order data from DB
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [orderTotals, setOrderTotals] = useState<{ subtotal: number; shipping: number; discount: number; total: number } | null>(null);
  const [orderAddress, setOrderAddress] = useState<DeliveryAddress | undefined>(undefined);
  const [orderShippingInfo, setOrderShippingInfo] = useState<{ deliveryDays?: number; carrier?: string; methodName?: string }>({});
  // Payment transaction data from DB (source of truth for installments, barcode, qr_code, etc)
  const [paymentTx, setPaymentTx] = useState<{
    installments?: number;
    barcode?: string;
    barcode_url?: string;
    qr_code?: string;
    qr_code_base64?: string;
    expiration_date?: string;
    status?: string;
  } | null>(null);
  
  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch order data from database
  useEffect(() => {
    if (!orderId) return;
    
    const fetchOrder = async () => {
      const { data: rpcData, error } = await supabase
        .rpc("get_order_for_checkout_view", { p_order_id: orderId });
      
      const order = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      
      if (error || !order) {
        console.error("[ThankYou] Error fetching order:", error);
        return;
      }
      
      // Parse products - prefer product_snapshots (has images), fallback to products
      const rawProducts = Array.isArray(order.product_snapshots) && order.product_snapshots.length > 0
        ? order.product_snapshots
        : Array.isArray(order.products) ? order.products : [];
      
      // Map products using shared helper for consistent variant labels.
      // product_snapshots is the same index as products, so pair them when possible.
      const productsArr = Array.isArray(order.products) ? order.products : [];
      const snapshotsArr = Array.isArray(order.product_snapshots) ? order.product_snapshots : [];
      const useSnapshots = snapshotsArr.length > 0;
      const baseArr = useSnapshots ? snapshotsArr : productsArr;

      const mapped: OrderProduct[] = baseArr.map((p: any, idx: number) => {
        const item = useSnapshots ? (productsArr[idx] || p) : p;
        const snap = useSnapshots ? p : null;
        return {
          id: p.product_id || p.id || "",
          name: p.name || p.product_name || "Produto",
          variant: getOrderItemVariant(item, snap) || undefined,
          quantity: p.quantity || 1,
          price: p.price || p.unit_price || 0,
          image: p.image || p.image_url || (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined),
        };
      });
      
      setOrderProducts(mapped);
      setOrderTotals({
        subtotal: order.subtotal || 0,
        shipping: order.frete || 0,
        discount: order.desconto || 0,
        total: order.total || 0,
      });
      
      // Parse address and shipping info from order
      if (order.endereco_entrega && typeof order.endereco_entrega === 'object') {
        const addr = order.endereco_entrega as any;
        setOrderAddress({
          street: addr.rua || addr.street || "",
          number: addr.numero || addr.number || "",
          complement: addr.complemento || addr.complement || undefined,
          neighborhood: addr.bairro || addr.neighborhood || "",
          city: addr.cidade || addr.city || "",
          state: addr.estado || addr.state || "",
          zipCode: addr.cep || addr.zipCode || "",
        });
        setOrderShippingInfo({
          deliveryDays: addr.prazo_entrega_dias || undefined,
          carrier: addr.transportadora || undefined,
          methodName: addr.metodo_envio || undefined,
        });
      }
    };
    
    fetchOrder();
  }, [orderId]);

  // Fetch latest payment transaction for this order — source of truth for
  // installments, barcode, qr_code, expiration_date.
  useEffect(() => {
    if (!orderId) return;

    const fetchTx = async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("installments, barcode, barcode_url, qr_code, qr_code_base64, expiration_date, status")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn("[ThankYou] Could not fetch payment transaction:", error);
        return;
      }
      if (data) setPaymentTx(data);
    };

    fetchTx();
    // Re-poll a couple of times in case the gateway response was persisted
    // moments after the user landed on this page (rare but possible).
    const t1 = setTimeout(fetchTx, 3000);
    const t2 = setTimeout(fetchTx, 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [orderId]);

  useEffect(() => {
    // Load checkout data
    const savedCheckout = localStorage.getItem(storeKey('checkout_data'));
    if (savedCheckout) {
      try {
        setCheckoutData(JSON.parse(savedCheckout));
      } catch (e) {
        console.error('Error parsing checkout data:', e);
      }
    }

    // Load payment result data
    const savedPayment = localStorage.getItem(storeKey('thankyou_payment_data'));
    if (savedPayment) {
      try {
        const parsed = JSON.parse(savedPayment);
        // Only use if it's for the same order
        if (parsed.orderId === orderId) {
          setPaymentData(parsed);
        }
      } catch (e) {
        console.error('Error parsing payment data:', e);
      }
    }
  }, [orderId]);

  // Track Purchase event - only for paid orders.
  // Polls payment status (for credit card / fast confirmations) up to ~90s
  // because the webhook may arrive a few seconds after the user lands here.
  useEffect(() => {
    if (!orderId || !store?.id || purchaseTrackedRef.current) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    const MAX_WAIT_MS = 90_000; // 90s — enough for cartão; boleto/pix são tracked via webhook server-side
    const INTERVAL_MS = 3_000;

    const trackPurchaseEvent = async () => {
      if (cancelled || purchaseTrackedRef.current) return;
      try {
        const { data: rpcData, error } = await supabase
          .rpc("get_order_for_checkout_view", { p_order_id: orderId });

        const order = Array.isArray(rpcData) ? rpcData[0] : rpcData;

        if (error || !order) {
          console.log("[Track] Order not found or error:", error);
          return;
        }

        // Only track if payment is confirmed or order is processing
        const isPaid = order.status_pagamento === "pago";
        const isProcessing = order.status_pedido === "processando";

        if (!isPaid && !isProcessing) {
          // Schedule retry while within the wait window
          if (Date.now() - startedAt < MAX_WAIT_MS && !cancelled) {
            console.log("[Track] Order not paid yet, retrying in 3s...");
            timeoutId = setTimeout(trackPurchaseEvent, INTERVAL_MS);
          } else {
            console.log("[Track] Gave up waiting for payment confirmation. Webhook will handle CAPI.");
          }
          return;
        }

        purchaseTrackedRef.current = true;

        // Parse products from order
        // Prefer retailer_id (matches catalog feed format) so Pixel/CAPI Purchase
        // event matches the Meta/Google catalog. Fallback to UUID for legacy orders.
        const rawOrderProducts = Array.isArray(order.products) ? order.products : [];
        const products: ProductData[] = rawOrderProducts.map((p: any) => ({
          id: p.retailer_id || p.variation_id || p.product_id || p.id,
          name: p.name || p.product_name,
          price: p.price || p.unit_price,
          quantity: p.quantity || 1,
          variant: p.variant || p.variation_name,
          // Hybrid grouping persisted at order creation. When absent (legacy
          // orders) trackPurchase falls back to id-as-group.
          contentGroupId: p.content_group_id || undefined,
        }));

        // Extract user data early for Enhanced Conversions (use checkout_data_v2 with v2 wrapper)
        const checkoutDataRaw = localStorage.getItem(storeKey('checkout_data_v2')) || localStorage.getItem(storeKey('checkout_data'));
        let userData: { email?: string; phone?: string; firstName?: string; lastName?: string; street?: string; number?: string; city?: string; state?: string; zipCode?: string; country?: string } = {};
        let customerCpf = "";
        if (checkoutDataRaw) {
          try {
            const stored = JSON.parse(checkoutDataRaw);
            const parsed = stored.data || stored; // handle v2 wrapper
            const fullName = parsed.personalData?.fullName || "";
            const nameParts = fullName.trim().split(/\s+/);
            userData = {
              email: parsed.personalData?.email,
              phone: parsed.personalData?.phone,
              firstName: nameParts[0],
              lastName: nameParts.slice(1).join(" "),
              street: parsed.deliveryAddress?.street,
              number: parsed.deliveryAddress?.number,
              city: parsed.deliveryAddress?.city,
              state: parsed.deliveryAddress?.state,
              zipCode: parsed.deliveryAddress?.zipCode,
              country: "BR",
            };
            customerCpf = parsed.personalData?.cpf || "";
          } catch {}
        }

        // Get coupon code if applied
        let couponCode: string | undefined;
        try {
          const savedCoupon = localStorage.getItem(`cart_coupon`);
          if (savedCoupon) {
            const parsed = JSON.parse(savedCoupon);
            couponCode = parsed.code;
          }
        } catch {}

        // Use the event_id persisted by the webhook (if it already fired)
        // so the pixel and CAPI events deduplicate on Meta/Google/TikTok.
        // If webhook hasn't run yet, the pixel generates one — webhook will
        // reuse it (it persists the id before sending).
        const sharedEventId = (order as any).purchase_event_id || undefined;

        // Currency resolved via useStoreCurrency hook (cached, parity with CAPI server-side)


        // Track client-side - returns eventId for CAPI deduplication
        const purchaseEventId = await trackPurchase({
          orderId: order.id,
          value: order.total,
          currency: storeCurrency,
          products,
          shipping: order.frete,
          coupon: couponCode,
        }, {
          excludeShipping: trackingConfig?.exclude_shipping_from_value,
          userData,
          googleAdsConversionLabel: trackingConfig?.google_ads_enabled ? trackingConfig?.google_ads_conversion_label : null,
          googleAdsId: trackingConfig?.google_ads_enabled ? trackingConfig?.google_ads_id : null,
          eventId: sharedEventId,
        });

        // CAPI server-side é disparada pelo webhook de pagamento via
        // sendPurchaseEventForOrder (idempotente por purchase_event_sent_at).
        // Não dispara aqui pra evitar duplicação no TikTok/Pinterest, que
        // não fazem dedup tão robusta quanto Meta com event_id.
        // O Pixel client-side acima usa o MESMO purchase_event_id do webhook,
        // então Meta deduplica naturalmente.

        console.log("[Track] Purchase event sent successfully");
      } catch (err) {
        console.error("[Track] Error tracking purchase:", err);
        // Retry on transient errors within the wait window
        if (!purchaseTrackedRef.current && Date.now() - startedAt < MAX_WAIT_MS && !cancelled) {
          timeoutId = setTimeout(trackPurchaseEvent, INTERVAL_MS);
        }
      }
    };

    trackPurchaseEvent();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [orderId, store?.id, trackingConfig]);

  // Use DB data first, fallback to cart items
  const products: OrderProduct[] = orderProducts.length > 0 
    ? orderProducts 
    : items.length > 0 
      ? items.map(item => ({
          id: item.id,
          name: item.name,
          variant: item.variant,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        }))
      : [];

  // Use DB address first, fallback to localStorage
  const address: DeliveryAddress | undefined = orderAddress || (checkoutData.deliveryAddress?.city ? {
    street: checkoutData.deliveryAddress.street || "",
    number: checkoutData.deliveryAddress.number || "",
    complement: checkoutData.deliveryAddress.complement || undefined,
    neighborhood: checkoutData.deliveryAddress.neighborhood || "",
    city: checkoutData.deliveryAddress.city || "",
    state: checkoutData.deliveryAddress.state || "",
    zipCode: checkoutData.deliveryAddress.zipCode || ""
  } : undefined);

  // Use DB totals first, fallback to calculations
  const subtotal = orderTotals?.subtotal || paymentData?.amount || cartTotal;
  const shipping = orderTotals?.shipping ?? checkoutData.deliveryAddress?.shippingPrice ?? 0;
  const discount = orderTotals?.discount || 0;
  const total = orderTotals?.total || paymentData?.amount || (subtotal + shipping - discount);

  // Get PIX data — DB (payment_transactions) is source of truth, then payment_result, then nothing.
  // Never fake a QR code: the components handle the empty state gracefully.
  const pixData = {
    orderId: displayOrderId,
    orderUuid: orderId || undefined,
    amount: total,
    pixCode:
      paymentTx?.qr_code ||
      paymentData?.paymentResult?.pix?.qrCode ||
      "",
    qrCodeBase64:
      paymentTx?.qr_code_base64 ||
      paymentData?.paymentResult?.pix?.qrCodeBase64 ||
      "",
    isPaid:
      paymentTx?.status === "paid" ||
      paymentTx?.status === "approved" ||
      paymentData?.paymentResult?.status === "paid",
    expiresAt: paymentTx?.expiration_date
      ? new Date(paymentTx.expiration_date)
      : paymentData?.paymentResult?.pix?.expirationDate
        ? new Date(paymentData.paymentResult.pix.expirationDate)
        : undefined,
  };

  // Get boleto data — DB first. No fake barcode/dueDate fallback.
  const boletoData = {
    orderId: displayOrderId,
    amount: total,
    barcodeNumber:
      paymentTx?.barcode ||
      paymentData?.paymentResult?.boleto?.barcode ||
      "",
    dueDate: paymentTx?.expiration_date
      ? new Date(paymentTx.expiration_date).toLocaleDateString("pt-BR")
      : paymentData?.paymentResult?.boleto?.expirationDate
        ? new Date(paymentData.paymentResult.boleto.expirationDate).toLocaleDateString("pt-BR")
        : "",
    boletoUrl:
      paymentTx?.barcode_url ||
      paymentData?.paymentResult?.boleto?.barcodeUrl ||
      "",
  };

  // Get credit card data — installments from DB (source of truth) → falls back to localStorage.
  const deliveryDays = orderShippingInfo.deliveryDays;
  const estimatedDelivery = deliveryDays
    ? `${deliveryDays} dia${deliveryDays > 1 ? 's úteis' : ' útil'}`
    : "a confirmar";

  const cartaoData = {
    orderId: displayOrderId,
    orderUuid: orderId || undefined,
    amount: total,
    installments:
      paymentTx?.installments ||
      checkoutData.paymentMethod?.installments ||
      1,
    estimatedDelivery,
  };

  const renderPaymentComponent = () => {
    if (hasError === "gateway") {
      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Pagamento não processado</AlertTitle>
            <AlertDescription>
              O gateway de pagamento não está configurado para esta loja. 
              Seu pedido foi criado, mas o pagamento precisa ser confirmado manualmente.
              Entre em contato com a loja para mais informações.
            </AlertDescription>
          </Alert>
          <div className="bg-white border rounded-lg p-6 text-center">
            <p className="text-lg font-medium mb-2">Pedido {displayOrderId}</p>
            <p className="text-muted-foreground">
              Valor: R$ {total.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>
      );
    }

    switch (paymentMethod) {
      case "pix":
        return <ThankYouPix {...pixData} />;
      case "boleto":
        return <ThankYouBoleto {...boletoData} />;
      case "cartao":
        return <ThankYouCartao {...cartaoData} />;
      default:
        return <ThankYouPix {...pixData} />;
    }
  };

  const orderSummaryComponent = (
    <ThankYouOrderSummary
      products={products}
      subtotal={subtotal}
      shipping={shipping}
      discount={discount}
      total={total}
      collapsible={!isDesktop && paymentMethod !== "cartao"}
      defaultExpanded={paymentMethod === "cartao"}
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
      <Helmet><title>Pedido Realizado | {store?.name || 'Loja'}</title></Helmet>
      <TrackingScripts storeId={store?.id} />
      <div className="min-h-screen bg-checkout-bg">
        <CheckoutHeader />
        
        <main className="container mx-auto px-4 py-6 lg:py-8 max-w-[700px] lg:max-w-[1200px]">
          {/* Mobile: single column */}
          <div className="lg:hidden space-y-4">
            {renderPaymentComponent()}
            <SaveAccountCard
              storeId={store?.id}
              storeName={store?.name}
              defaultEmail={checkoutData.personalData?.email}
            />
            {orderSummaryComponent}
            {address && <ThankYouDeliveryAddress address={address} shippingInfo={orderShippingInfo} />}
          </div>

          {/* Desktop: two columns matching checkout layout */}
          <div className="hidden lg:grid lg:grid-cols-[65%_35%] lg:gap-8">
            {/* Left: Payment info + address */}
            <div className="space-y-4">
              {renderPaymentComponent()}
              <SaveAccountCard
                storeId={store?.id}
                storeName={store?.name}
                defaultEmail={checkoutData.personalData?.email}
              />
              {address && <ThankYouDeliveryAddress address={address} shippingInfo={orderShippingInfo} />}
            </div>

            {/* Right: Order summary (sticky) */}
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
