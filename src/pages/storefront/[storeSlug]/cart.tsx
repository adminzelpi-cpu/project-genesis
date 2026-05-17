import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet";
import { storeKey } from "@/lib/storeStorageKeys";
import { useNavigate, Link } from "react-router-dom";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/CartContext";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { Trash2, ShoppingCart, Loader2, ChevronLeft, CreditCard, Tag, ChevronDown, ChevronUp, AlertTriangle, Barcode } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useGatewayConfig } from "@/features/payments";
import { useStorePaymentConfig, getDiscountDisplayInfo } from "@/features/storefront/lib/paymentDisplay";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPix } from "@fortawesome/free-brands-svg-icons";
import { useValidateCoupon } from "@/features/coupons/hooks/useValidateCoupon";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { buildStorefrontProductLink } from "@/features/storefront/lib/buildStorefrontProductLink";
import { TrackingScripts } from "@/features/tracking/components/TrackingScripts";
import { StorefrontMeta } from "@/features/storefront/components/layout/StorefrontMeta";
import { useCartStockValidation } from "@/features/checkout/hooks/useCartStockValidation";
import { useUndoableCartRemove } from "@/hooks/useUndoableCartRemove";

export default function CartPage() {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const navigate = useNavigate();
  const { store } = useStorefront(storeSlug);
  const { items, removeItem, updateQuantity, total } = useCart();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const checkoutButtonRef = useRef<HTMLButtonElement>(null);

  // Stock validation
  const { stockIssues, isValidating: isValidatingStock, hasStockIssues, getItemStockIssue } = useCartStockValidation(items);

  // Loading states for cart actions
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  const { handleRemoveWithUndo } = useUndoableCartRemove();

  // Coupon state - sync with localStorage for checkout persistence
  const [couponCode, setCouponCode] = useState("");
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; id: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storeKey('cart_coupon'));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.code && parsed.id) {
            return { code: parsed.code, id: parsed.id };
          }
        } catch (e) {
          // ignore
        }
      }
    }
    return null;
  });
  const [discount, setDiscount] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storeKey('cart_coupon'));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.discount || 0;
        } catch (e) {
          return 0;
        }
      }
    }
    return 0;
  });
  const { validateCoupon, isValidating } = useValidateCoupon();

  // Gateway config for PIX/installments
  const { config: gatewayConfig } = useGatewayConfig(store?.id);
  const paymentConfig = useStorePaymentConfig(storeSlug);

  // Use dynamic threshold from store settings
  const freeShippingThreshold = store?.free_shipping_threshold ?? null;
  const remainingForFreeShipping = freeShippingThreshold ? Math.max(0, freeShippingThreshold - total) : null;
  const progressPercentage = freeShippingThreshold ? Math.min(100, (total / freeShippingThreshold) * 100) : 0;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Helper to get unique item key
  const getItemKey = useCallback((item: { id: string; variant?: string; variationId?: string }) => 
    item.variationId || `${item.id}-${item.variant || ''}`, []);

  // Handle quantity change with loading
  const handleQuantityChange = useCallback((item: { id: string; variant?: string; variationId?: string }, newQuantity: number) => {
    const key = getItemKey(item);
    setLoadingItems(prev => ({ ...prev, [key]: true }));
    
    setTimeout(() => {
      updateQuantity(item.id, newQuantity, item.variant, item.variationId);
      setLoadingItems(prev => ({ ...prev, [key]: false }));
    }, 300);
  }, [updateQuantity, getItemKey]);


  // Check if floating button should show (mobile only) - instant on load
  useEffect(() => {
    const handleScroll = () => {
      if (!checkoutButtonRef.current) {
        setShowFloatingButton(true);
        return;
      }
      const buttonRect = checkoutButtonRef.current.getBoundingClientRect();
      // Show floating button when original button is out of viewport
      setShowFloatingButton(buttonRect.bottom < 0 || buttonRect.top > window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    // Always show initially - delay check to ensure DOM is ready
    const timer = setTimeout(() => {
      handleScroll();
    }, 100);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [items.length]);

  const handleCheckout = async () => {
    setIsNavigating(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    navigate(buildPath(`/checkout`));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !store?.id) return;
    
    const result = await validateCoupon(couponCode.trim().toUpperCase(), store.id, total);
    if (result.isValid && result.couponId) {
      const couponData = { 
        code: couponCode.trim().toUpperCase(), 
        id: result.couponId,
        discount: result.discount
      };
      setAppliedCoupon({ code: couponData.code, id: couponData.id });
      setDiscount(result.discount);
      // Save to localStorage for checkout persistence
      localStorage.setItem(storeKey('cart_coupon'), JSON.stringify(couponData));
      toast.success("Cupom aplicado com sucesso!");
    } else {
      toast.error(result.message || "Cupom inválido");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode("");
    // Clear from localStorage
    localStorage.removeItem(storeKey('cart_coupon'));
    toast.success("Cupom removido");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // PIX discount info
  const pixDiscountPercent = gatewayConfig.isActive && gatewayConfig.pixDiscount > 0 
    ? Math.round(gatewayConfig.pixDiscount * 100) 
    : 0;
  const pixPrice = pixDiscountPercent > 0 ? total * (1 - gatewayConfig.pixDiscount) : null;

  // Installment info - only show if there are free installments configured
  const freeInstallments = gatewayConfig.installmentConfig?.freeInstallments || 0;

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Calculate final total
  const finalTotal = total - discount;

  return (
    <StoreThemeProvider
      primaryColor={store.theme_primary_color}
      secondaryColor={store.theme_secondary_color}
      buttonColor={store.button_color}
      buttonHoverColor={store.button_hover_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      buttonBorderRadius={store.button_border_radius}
      elementBorderRadius={(store as any).element_border_radius}
      faviconUrl={(store as any).favicon_url}
      fontFamily={(store as any).font_family}
    >
    <StorefrontMeta
      title="Meu Carrinho"
      storeName={store.name}
      faviconUrl={(store as any).favicon_url}
      noIndex
    />
    <TrackingScripts storeId={store.id} />
    <div className="min-h-screen bg-checkout-bg">
      <StorefrontHeader 
        storeName={store.name} 
        storeSlug={storeSlug!} 
        storeId={store.id} 
        logoUrl={store.logo_url}
        headerBgColor={(store as any).header_bg_color}
        headerTextColor={(store as any).header_text_color}
        headerLayout={(store as any).header_layout}
        headerShowFavorites={(store as any).header_show_favorites}
        headerShowSearch={(store as any).header_show_search}
        headerMobileLogoPosition={(store as any).header_mobile_logo_position}
      />
      
      <main className="container mx-auto px-4 py-6 max-w-[700px] lg:max-w-[1200px]">
        {/* Title - with continue shopping on right for desktop */}
        <div className="flex items-baseline justify-between mb-6">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold">Meu Carrinho</h1>
            {items.length > 0 && (
              <span className="text-muted-foreground">({itemCount} {itemCount === 1 ? 'item' : 'itens'})</span>
            )}
          </div>
          {/* Continue shopping - desktop only, at title height */}
          {items.length > 0 && (
            <button
              onClick={() => navigate(buildPath(`/`))}
              className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Continuar comprando
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-background rounded-lg">
            <ShoppingCart className="h-20 w-20 text-muted-foreground/50 mb-4" />
            <p className="text-lg text-muted-foreground mb-6">Seu carrinho está vazio</p>
            <Button 
              onClick={() => navigate(buildPath('/search'))}
              className="bg-[hsl(var(--store-button,var(--store-primary,var(--success))))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary,var(--success-hover)))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground,var(--success-foreground))))]"
              style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
            >
              Ver todos os produtos
            </Button>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[65%_35%] lg:gap-8 flex flex-col gap-6">
            {/* Products List */}
            <div>
              <div className="md:bg-background md:rounded-lg md:border md:border-checkout-border md:p-6 lg:bg-background lg:rounded-lg lg:border lg:border-checkout-border lg:p-6">
                {/* Free shipping progress - só mostra se threshold estiver configurado */}
                {freeShippingThreshold !== null && (
                  <div className="mb-4 pb-4 border-b border-border">
                    {remainingForFreeShipping && remainingForFreeShipping > 0 ? (
                      <>
                        <p className="text-sm text-muted-foreground mb-1.5">
                          Faltam <span className="font-bold text-foreground">{formatCurrency(remainingForFreeShipping)}</span> para frete grátis
                        </p>
                        <Progress value={progressPercentage} className="h-2" />
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-success font-medium mb-1.5">
                          Você ganhou frete grátis! 🎉
                        </p>
                        <Progress value={100} className="h-2" />
                      </>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="space-y-4">
                  {items.map((item) => {
                    const key = item.variationId || `${item.id}-${item.variant || 'default'}`;
                    const productLink = buildStorefrontProductLink({
                      storeSlug: storeSlug!,
                      productSlug: item.slug || item.id,
                      productCode: item.productCode,
                      colorCode: item.colorCode,
                      color: !item.colorCode ? item.color : undefined,
                      buildPath,
                    });
                    const isDeleting = false;
                    const isUpdating = loadingItems[key];
                    const stockIssue = getItemStockIssue(item.id, item.variationId);
                    
                    return (
                      <div 
                        key={key} 
                        className={cn(
                          "flex gap-3 pb-4 border-b border-border transition-all duration-300",
                          isDeleting && "opacity-50 scale-95 pointer-events-none",
                          stockIssue && "bg-destructive/5 -mx-2 px-2 py-2 rounded-lg"
                        )}
                      >
                        {/* Image - clickable */}
                        <Link to={productLink} className="flex-shrink-0 relative">
                          <img
                            src={item.image || '/placeholder.svg'}
                            alt={item.name}
                            className={cn(
                              "w-20 h-20 object-contain rounded-md bg-muted hover:opacity-80 transition-opacity",
                              stockIssue && stockIssue.available === 0 && "opacity-50"
                            )}
                          />
                          {stockIssue && stockIssue.available === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                              <span className="text-[10px] font-bold text-destructive uppercase">Esgotado</span>
                            </div>
                          )}
                        </Link>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link to={productLink}>
                            <h3 className="font-medium text-sm mb-1 line-clamp-2 leading-tight hover:text-primary transition-colors">{item.name}</h3>
                          </Link>
                          {(item.color || item.size) && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {[item.color, item.size].filter(Boolean).join(' / ')}
                            </p>
                          )}
                          {item.variant && !item.color && !item.size && (
                            <p className="text-sm text-muted-foreground mb-2">{item.variant}</p>
                          )}
                          {stockIssue ? (
                            <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                              {stockIssue.available === 0 ? (
                                <span>Produto esgotado</span>
                              ) : (
                                <span>Apenas {stockIssue.available} disponível(is)</span>
                              )}
                            </div>
                          ) : (
                            <QuantitySelector
                              value={item.quantity}
                              onChange={(value) => handleQuantityChange(item, value)}
                              size="sm"
                              isLoading={isUpdating}
                            />
                          )}
                        </div>
                        
                        {/* Price and Remove */}
                        <div className="flex flex-col items-end justify-between flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveWithUndo(item)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                          <p className={cn("font-bold text-sm", stockIssue && stockIssue.available === 0 && "line-through text-muted-foreground")}>{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="md:bg-background md:rounded-lg md:border md:border-checkout-border md:p-5 lg:bg-background lg:rounded-lg lg:border lg:border-checkout-border lg:p-5 lg:sticky lg:top-4">
                <h2 className="text-lg font-semibold mb-4">Resumo do Pedido</h2>
                
                {/* Coupon Section - Collapsible with arrow */}
                <div className="mb-4 pb-4 border-b border-border">
                  <Collapsible open={isCouponOpen} onOpenChange={setIsCouponOpen}>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium text-success">{appliedCoupon.code}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveCoupon}
                          className="text-destructive hover:text-destructive h-8 px-2"
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <>
                        <CollapsibleTrigger className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <span className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Tem um cupom de desconto?
                          </span>
                          {isCouponOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="Digite o cupom"
                                className="pl-9 uppercase"
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                              />
                            </div>
                            <Button
                              onClick={handleApplyCoupon}
                              disabled={isValidating || !couponCode.trim()}
                              size="sm"
                              className="h-10 px-4 font-semibold bg-[hsl(var(--store-button,var(--store-primary,var(--primary))))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary,var(--primary)))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground,var(--primary-foreground))))]"
                              style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
                            >
                              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </>
                    )}
                  </Collapsible>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Desconto</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="text-muted-foreground">Calcular no checkout</span>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4 mb-4">
                  <div className="flex justify-between items-start">
                    <span className="font-bold">Total</span>
                    <div className="text-right">
                      <span className="font-bold text-lg">{formatCurrency(finalTotal)}</span>
                      
                      {/* Payment info aligned right below total */}
                      {(() => {
                        const discountInfo = getDiscountDisplayInfo(finalTotal, paymentConfig);
                        if (!discountInfo && freeInstallments <= 1) return null;
                        return (
                          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {discountInfo && (
                              <div className="flex items-center gap-1.5 justify-end">
                                {discountInfo.icon === "pix" ? (
                                  <FontAwesomeIcon icon={faPix} className="w-3.5 h-3.5 text-[#32BCAD]" />
                                ) : (
                                  <Barcode className="w-3.5 h-3.5" />
                                )}
                                <span>{discountInfo.text}</span>
                              </div>
                            )}
                            {freeInstallments > 1 && (
                              <div className="flex items-center gap-1 justify-end">
                                <CreditCard className="w-3 h-3" />
                                <span>{freeInstallments}x {formatCurrency(finalTotal / freeInstallments)} s/ juros</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                
                {hasStockIssues && (
                  <div className="flex items-center gap-2 p-3 mb-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Remova ou ajuste os itens com problema de estoque para finalizar a compra.</span>
                  </div>
                )}

                <Button
                  ref={checkoutButtonRef}
                  className="w-full h-11 bg-[hsl(var(--store-button,var(--store-primary,var(--success))))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary,var(--success-hover)))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground,var(--success-foreground))))] font-bold text-sm"
                  style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
                  onClick={handleCheckout}
                  disabled={isNavigating || hasStockIssues}
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      PROCESSANDO...
                    </>
                  ) : (
                    "FINALIZAR COMPRA"
                  )}
                </Button>
                
                {/* Continue Shopping below checkout button - Both mobile and desktop */}
                <div className="flex justify-center mt-3">
                  <button
                    onClick={() => navigate(buildPath("/"))}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Continuar comprando
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Checkout Button - Mobile Only - No background like product page */}
      {items.length > 0 && showFloatingButton && (
        <div className="fixed bottom-4 left-4 right-4 lg:hidden z-40">
          <Button
            className="w-full h-12 bg-[hsl(var(--store-button,var(--store-primary,var(--success))))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary,var(--success-hover)))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground,var(--success-foreground))))] font-bold shadow-lg"
            style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
            onClick={handleCheckout}
            disabled={isNavigating || hasStockIssues}
          >
            {isNavigating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                PROCESSANDO...
              </>
            ) : (
              `FINALIZAR COMPRA • ${formatCurrency(finalTotal)}`
            )}
          </Button>
        </div>
      )}

      <StorefrontFooter store={store as any} />
    </div>
    </StoreThemeProvider>
  );
}