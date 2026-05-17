import { useState, useCallback } from "react";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { ShoppingCart, ChevronDown, ChevronUp, Loader2, X, Check, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { useCheckout } from "./CheckoutContext";
import { useUndoableCartRemove } from "@/hooks/useUndoableCartRemove";
import { useValidateCoupon } from "@/features/coupons";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { storeKey } from "@/lib/storeStorageKeys";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrderSummaryProps {
  shipping?: number;
}

export function OrderSummary({ shipping }: OrderSummaryProps) {
  const { checkoutData } = useCheckout();
  
  // Use shipping from context if not passed as prop
  const effectiveShipping = shipping ?? checkoutData.deliveryAddress.shippingPrice ?? 0;
  const { items, total, itemCount, updateQuantity } = useCart();
  const { handleRemoveWithUndo } = useUndoableCartRemove();
  const storeSlug = useStoreSlug();
  const { store } = useStorefront(storeSlug);
  const { couponCode, setCouponCode, appliedDiscount, setAppliedDiscount, appliedCouponId, setAppliedCouponId } = useCheckout();
  const { validateCoupon, isValidating } = useValidateCoupon();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  // Initialize from context so a coupon already applied (in cart or in this same checkout) is reflected
  const [appliedCouponCode, setAppliedCouponCode] = useState(couponCode || "");
  const [couponMessage, setCouponMessage] = useState("");

  // Keep local applied code in sync with context (e.g. when coupon is loaded from localStorage)
  if (couponCode && couponCode !== appliedCouponCode && appliedDiscount > 0) {
    // Safe to set during render — React will bail out if same value
    setAppliedCouponCode(couponCode);
  }
  
  // Loading states
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  
  const getItemKey = (item: { id: string; variant?: string; variationId?: string }) => 
    item.variationId || `${item.id}-${item.variant || ''}`;
  
  const handleQuantityChange = useCallback((item: { id: string; variant?: string; variationId?: string }, newQuantity: number) => {
    const key = getItemKey(item);
    setLoadingItems(prev => ({ ...prev, [key]: true }));
    
    setTimeout(() => {
      updateQuantity(item.id, newQuantity, item.variant, item.variationId);
      setLoadingItems(prev => ({ ...prev, [key]: false }));
    }, 300);
  }, [updateQuantity]);

  const handleRemoveItem = useCallback((item: CartItem) => {
    handleRemoveWithUndo(item);
  }, [handleRemoveWithUndo]);

  const subtotal = total;
  const totalWithShipping = subtotal + effectiveShipping - appliedDiscount;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      toast.error("Digite um cupom");
      return;
    }
    if (!store?.id) {
      toast.error("Aguarde os dados da loja carregarem");
      return;
    }

    const result = await validateCoupon(code, store.id, subtotal);
    
    if (result.isValid) {
      setAppliedDiscount(result.discount);
      setCouponCode(code);
      setAppliedCouponCode(code);
      setAppliedCouponId(result.couponId || null);
      setCouponMessage(result.message);
      setCouponInput("");
      // Persist for checkout / thank-you / refresh
      try {
        localStorage.setItem(storeKey('cart_coupon'), JSON.stringify({
          code,
          id: result.couponId || null,
          discount: result.discount,
        }));
      } catch {}
      toast.success(result.message);
    } else {
      setCouponMessage(result.message);
      toast.error(result.message);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedDiscount(0);
    setCouponCode("");
    setAppliedCouponCode("");
    setAppliedCouponId(null);
    setCouponMessage("");
    try {
      localStorage.removeItem(storeKey('cart_coupon'));
    } catch {}
  };

  // Helper to format variant display
  const formatVariantDisplay = (item: typeof items[0]) => {
    const parts = [];
    if (item.color) parts.push(item.color);
    if (item.size) parts.push(item.size);
    if (parts.length > 0) return parts.join(' / ');
    if (item.variant) return item.variant;
    return null;
  };

  // Extracted to avoid inline function component causing re-renders
  const renderProducts = () => (
    <div className="space-y-4">
      {items.map((item) => {
        const key = getItemKey(item);
        const isDeleting = false;
        const isUpdating = loadingItems[key];
        const variantDisplay = formatVariantDisplay(item);
        
        return (
          <div 
            key={key} 
            className={cn(
              "flex gap-3 pb-4 border-b transition-all duration-300",
              isDeleting && "opacity-50 scale-95 pointer-events-none"
            )}
          >
            <div className="w-20 h-20 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              ) : (
                <ShoppingCart className="h-6 w-6 text-checkout-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h3 className="font-medium text-sm mb-1 line-clamp-2 leading-tight">
                {item.name}
              </h3>
              {variantDisplay && (
                <p className="text-sm text-muted-foreground mb-2">{variantDisplay}</p>
              )}
              <QuantitySelector
                value={item.quantity}
                onChange={(value) => handleQuantityChange(item, value)}
                size="sm"
                isLoading={isUpdating}
              />
            </div>
            <div className="flex flex-col items-end justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleRemoveItem(item)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
              <p className="font-bold text-sm">{formatPrice(item.price * item.quantity)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCouponSection = () => (
    <Collapsible open={isCouponOpen} onOpenChange={setIsCouponOpen} className="mt-4">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-checkout-text">
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Tem um cupom?
        </span>
        {isCouponOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {appliedCouponCode ? (
          <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-success" />
              <span className="font-medium text-success text-sm">{appliedCouponCode}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveCoupon}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o cupom"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="h-10 pl-9 border-checkout-border font-mono uppercase"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
              />
            </div>
            <Button
              type="button"
              className="h-10 px-4 font-semibold bg-[hsl(var(--store-button,var(--store-primary,var(--primary))))] hover:bg-[hsl(var(--store-button-hover,var(--store-button,var(--store-primary,var(--primary)))))] text-[hsl(var(--store-button-foreground,var(--store-primary-foreground,var(--primary-foreground))))]"
              style={{ borderRadius: 'var(--store-button-radius, 0.375rem)' }}
              onClick={handleApplyCoupon}
              disabled={isValidating || !couponInput.trim()}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Aplicar'
              )}
            </Button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  const renderTotals = () => (
    <div className="mt-4 pt-4 border-t border-checkout-border space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-checkout-muted">Subtotal</span>
        <span className="text-checkout-text">{formatPrice(subtotal)}</span>
      </div>
      {appliedDiscount > 0 && (
        <div className="flex justify-between text-sm text-success">
          <span>Desconto</span>
          <span>-{formatPrice(appliedDiscount)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-checkout-muted">Entrega</span>
        <span className={effectiveShipping === 0 && checkoutData.deliveryAddress.shippingPrice !== undefined ? "text-green-600 font-medium" : "text-checkout-text"}>
          {checkoutData.deliveryAddress.shippingPrice !== undefined 
            ? (effectiveShipping === 0 ? "Grátis" : formatPrice(effectiveShipping))
            : "A calcular"
          }
        </span>
      </div>
      <div className="flex justify-between pt-2 border-t border-checkout-border">
        <span className="font-semibold text-checkout-text">Total</span>
        <span className="font-semibold text-checkout-text">{formatPrice(totalWithShipping)}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile/Tablet - Collapsible */}
      <div className="lg:hidden">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="bg-white border border-checkout-border rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-checkout-text" />
                <span className="font-medium text-checkout-text">
                  Resumo ({itemCount})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-checkout-text">{formatPrice(totalWithShipping)}</span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-checkout-muted" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-checkout-muted" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                {renderProducts()}
                {renderCouponSection()}
                {renderTotals()}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* Desktop - Always visible */}
      <div className="hidden lg:block">
        <div className="bg-white border border-checkout-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart className="h-5 w-5 text-checkout-text" />
            <span className="font-medium text-checkout-text text-lg">
              Resumo ({itemCount})
            </span>
          </div>
          {renderProducts()}
          {renderCouponSection()}
          {renderTotals()}
        </div>
      </div>
    </>
  );
}
