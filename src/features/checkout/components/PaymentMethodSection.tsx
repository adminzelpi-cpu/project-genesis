import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, ChevronLeft, Loader2, Check, AlertTriangle } from "lucide-react";
import { Pix, BoletoTransparent } from "react-pay-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useValidateStock } from "@/features/checkout/hooks/useValidateStock";

import { PaymentErrorInfo } from "@/features/checkout/utils/paymentErrorMapping";

// Card brand icons imports
import visaIcon from "@/assets/card-visa.svg";
import mastercardIcon from "@/assets/card-mastercard.svg";
import eloIcon from "@/assets/card-elo.svg";
import amexIcon from "@/assets/card-amex.svg";
import dinersIcon from "@/assets/card-diners.svg";
import hiperIcon from "@/assets/card-hiper.svg";
import discoverIcon from "@/assets/card-discover.svg";
import auraIcon from "@/assets/card-aura.svg";
import cvvIcon from "@/assets/cvv-icon.svg";

type PaymentMethod = "credit" | "pix" | "boleto" | null;

// Card number validation schema
const creditCardSchema = z.object({
  cardNumber: z.string().min(19, "Número do cartão inválido"),
  cardName: z.string().min(3, "Nome obrigatório"),
  cardExpiry: z.string().min(5, "Validade inválida"),
  cardCvv: z.string().min(3, "CVV inválido"),
  installments: z.number().min(1)
});

type CreditCardFormData = z.infer<typeof creditCardSchema>;

// Gateway configuration interface - preparado para integração dinâmica
interface GatewayConfig {
  maxInstallments: number;
  interestRate: number; // Monthly interest rate (e.g., 2.99 for 2.99%)
  freeInstallments: number; // Number of installments without interest
  minInstallmentValue: number; // Minimum value per installment
  acceptedBrands: string[];
  pixDiscount: number;
  boletoDiscount: number;
  acceptCreditCard?: boolean;
  acceptPix?: boolean;
  acceptBoleto?: boolean;
}

interface DynamicInstallmentOption {
  quantity: number;
  value: number;
  interest: boolean;
  totalWithInterest: number;
}

// Default gateway config - pode ser substituído por config do gateway
const defaultGatewayConfig: GatewayConfig = {
  maxInstallments: 12,
  interestRate: 2.99,
  freeInstallments: 1,
  minInstallmentValue: 5,
  acceptedBrands: ["visa", "mastercard", "elo", "amex", "diners", "hiper", "discover", "aura"],
  pixDiscount: 0,
  boletoDiscount: 0,
  acceptCreditCard: true,
  acceptPix: true,
  acceptBoleto: true,
};

// Card brand icons map
const brandIcons: Record<string, string> = {
  visa: visaIcon,
  mastercard: mastercardIcon,
  elo: eloIcon,
  amex: amexIcon,
  diners: dinersIcon,
  hiper: hiperIcon,
  discover: discoverIcon,
  aura: auraIcon
};

interface PaymentMethodSectionProps {
  orderTotal: number;
  shippingPrice: number;
  onPaymentComplete: (paymentData: {
    type: "credit_card" | "pix" | "boleto";
    cardData?: CreditCardFormData;
  }) => void;
  onBack?: () => void;
  gatewayConfig?: GatewayConfig;
  skipStockValidation?: boolean;
  hideBackButton?: boolean;
  stepNumber?: number;
  /** Payment error info to display inline */
  paymentError?: PaymentErrorInfo | null;
  /** Callback to clear the error when user changes method */
  onClearError?: () => void;
  /** Dynamic installment options fetched from gateway API (overrides local calculation) */
  dynamicInstallments?: DynamicInstallmentOption[] | null;
}

export function PaymentMethodSection({
  orderTotal,
  shippingPrice,
  onPaymentComplete,
  onBack,
  gatewayConfig = defaultGatewayConfig,
  skipStockValidation = false,
  hideBackButton = false,
  stepNumber = 3,
  paymentError,
  onClearError,
  dynamicInstallments,
}: PaymentMethodSectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [isMethodConfirmed, setIsMethodConfirmed] = useState(false);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll: in ALL states (initial entry or after method confirmed),
  // anchor the FINALIZAR button near the bottom of the viewport. This keeps
  // focus on payment options + button, while the summary peeks above and the
  // site footer stays hidden below the fold.
  // Falls back to section bottom if the button isn't rendered yet.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const section = paymentSectionRef.current;
      if (!section) return;

      const viewportHeight = window.innerHeight;
      const bottomPadding = 24; // breathing room below the button
      const minTopOffset = 80;  // keep step header visible

      // Find the finalize button: prefer the data attribute (works for credit
      // card / pix / boleto submit buttons across states), then the ref, then
      // fall back to section bottom.
      const finalizeButton =
        (section.querySelector('[data-finalize-button="true"]') as HTMLElement | null) ??
        buttonRef.current;

      const sectionRect = section.getBoundingClientRect();
      const anchorRect = finalizeButton
        ? finalizeButton.getBoundingClientRect()
        : sectionRect;

      const anchorBottomAbs = window.scrollY + anchorRect.bottom;
      let targetScrollY = anchorBottomAbs - viewportHeight + bottomPadding;

      // Never push the section header off the top.
      const sectionTopAbs = window.scrollY + sectionRect.top;
      const maxScrollY = sectionTopAbs - minTopOffset;
      if (targetScrollY > maxScrollY) targetScrollY = maxScrollY;
      if (targetScrollY < 0) targetScrollY = 0;

      // Skip if already well-framed: button in lower half, header visible.
      const buttonVisibleLow = finalizeButton
        ? anchorRect.bottom > viewportHeight * 0.55 &&
          anchorRect.bottom <= viewportHeight - 8
        : false;
      const headerVisible =
        sectionRect.top >= 40 && sectionRect.top <= viewportHeight * 0.5;
      if (buttonVisibleLow && headerVisible) return;

      window.scrollTo({ top: targetScrollY, behavior: "smooth" });
    }, 250);
    return () => clearTimeout(timeout);
  }, [isMethodConfirmed, selectedMethod]);

  // Reset isProcessing when a payment error comes back from the parent
  useEffect(() => {
    if (paymentError) {
      setIsProcessing(false);
    }
  }, [paymentError]);
  
  const { items: cartItems } = useCart();
  const { validateStock } = useValidateStock();

  const total = orderTotal + shippingPrice;
  const pixTotal = total * (1 - gatewayConfig.pixDiscount);
  const boletoTotal = total * (1 - gatewayConfig.boletoDiscount);

  // Generate installment options - use dynamic from API if available, otherwise calculate locally
  const installmentOptions = dynamicInstallments && dynamicInstallments.length > 0
    ? dynamicInstallments
    : Array.from({ length: gatewayConfig.maxInstallments }, (_, i) => {
        const n = i + 1;
        const isInterestFree = n <= gatewayConfig.freeInstallments;
        let value: number;
        let totalWithInterest: number;

        if (isInterestFree) {
          value = total / n;
          totalWithInterest = total;
        } else {
          // Compound interest formula (Price system)
          const monthlyRate = gatewayConfig.interestRate / 100;
          const factor = (monthlyRate * Math.pow(1 + monthlyRate, n)) / 
                         (Math.pow(1 + monthlyRate, n) - 1);
          value = total * factor;
          totalWithInterest = value * n;
        }

        return {
          quantity: n,
          value,
          interest: !isInterestFree,
          totalWithInterest,
        };
      }).filter(opt => opt.value >= gatewayConfig.minInstallmentValue);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CreditCardFormData>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      installments: 1
    }
  });

  const cardNumber = watch("cardNumber") || "";

  // Card brand detection by BIN (first digits)
  // Visa and Mastercard are detected with 2 digits since their prefixes don't conflict.
  // Other brands need 4+ digits to avoid ambiguity (e.g., Elo shares prefixes with Visa).
  const getCardBrand = (number: string): string | null => {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned.length < 2) return null;

    // --- 2-digit detection (no conflicts) ---
    // Mastercard: 51-55
    if (/^5[1-5]/.test(cleaned)) return "mastercard";
    // Amex: 34, 37
    if (/^3[47]/.test(cleaned)) return "amex";

    // --- 4+ digit detection ---
    if (cleaned.length < 4) return null;

    // Elo (must be checked before Visa since some Elo BINs start with 4)
    if (/^(636368|438935|504175|451416|636297|5067|4576|4011|509)/.test(cleaned)) return "elo";
    // Hiper
    if (/^(637095|637612|637599|637609|637568)/.test(cleaned)) return "hiper";
    // Aura
    if (/^50/.test(cleaned) && cleaned.length >= 6) return "aura";
    // Discover
    if (/^(6011|622|64|65)/.test(cleaned)) return "discover";
    // Diners
    if (/^(36|38|39|30[0-5])/.test(cleaned)) return "diners";
    // Mastercard: 2221-2720 range (needs 4 digits)
    if (/^2[2-7]/.test(cleaned)) return "mastercard";
    // Visa: starts with 4 (checked after Elo to avoid conflicts)
    if (/^4/.test(cleaned)) return "visa";

    return null;
  };

  const detectedBrand = getCardBrand(cardNumber);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ").substring(0, 19) : "";
  };

  // Format expiry date
  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setIsMethodConfirmed(true);
    onClearError?.();
    
    // Auto-scroll: position the finalize button at the bottom of the viewport
    // so all relevant content is visible above it, hiding the footer
    // Use a longer delay + retry to ensure DOM has rendered the expanded content
    const scrollToFinalizeButton = (attempt = 0) => {
      if (!paymentSectionRef.current) return;
      
      // Find the finalize button by data attribute (most reliable)
      const finalizeButton = paymentSectionRef.current.querySelector(
        '[data-finalize-button="true"]'
      ) as HTMLElement | null;
      
      if (!finalizeButton) {
        // Retry up to 3 times if button not yet rendered
        if (attempt < 3) {
          setTimeout(() => scrollToFinalizeButton(attempt + 1), 200);
        }
        return;
      }
      
      const buttonRect = finalizeButton.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Scroll so the finalize button bottom sits at viewport bottom with padding
      const targetScrollY = window.scrollY + buttonRect.bottom - viewportHeight + 24;
      
      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: "smooth",
      });
    };
    
    setTimeout(() => scrollToFinalizeButton(), 300);
  };

  const handleChangeMethod = () => {
    setIsMethodConfirmed(false);
    setSelectedMethod(null);
  };

  const handleFinalizeWithoutSelection = () => {
    if (!selectedMethod) {
      // Shake animation
      if (buttonRef.current) {
        buttonRef.current.classList.add("animate-shake");
        setTimeout(() => buttonRef.current?.classList.remove("animate-shake"), 500);
      }
      // Toast error
      toast.error("Selecione uma forma de pagamento");
      // Scroll to payment section
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const onCreditCardSubmit = async (data: CreditCardFormData) => {
    setIsProcessing(true);
    
    if (!skipStockValidation) {
      const stockResult = await validateStock(cartItems);
      if (!stockResult.valid) {
        setIsProcessing(false);
        return;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 600));
    onPaymentComplete({
      type: "credit_card",
      cardData: { ...data, installments: selectedInstallments }
    });
  };

  const handlePixPayment = async () => {
    setIsProcessing(true);
    
    if (!skipStockValidation) {
      const stockResult = await validateStock(cartItems);
      if (!stockResult.valid) {
        setIsProcessing(false);
        return;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 600));
    onPaymentComplete({ type: "pix" });
  };

  const handleBoletoPayment = async () => {
    setIsProcessing(true);
    
    if (!skipStockValidation) {
      const stockResult = await validateStock(cartItems);
      if (!stockResult.valid) {
        setIsProcessing(false);
        return;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 600));
    onPaymentComplete({ type: "boleto" });
  };

  // Brands to display (first row)
  const visibleBrands = showAllBrands 
    ? gatewayConfig.acceptedBrands 
    : gatewayConfig.acceptedBrands.slice(0, 4);
  const hiddenBrandsCount = gatewayConfig.acceptedBrands.length - 4;

  const selectedOption = installmentOptions.find(o => o.quantity === selectedInstallments) || installmentOptions[0];
  const installmentValue = selectedOption?.value || total;
  const totalWithInterest = selectedOption?.totalWithInterest || total;

  return (
    <div ref={paymentSectionRef} className="space-y-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-sm font-bold">
              {stepNumber}
            </span>
            Forma de pagamento
          </h2>
          {isMethodConfirmed && (
            <button
              type="button"
              onClick={handleChangeMethod}
              className="text-sm text-emerald-500 hover:text-emerald-600 underline"
            >
              Alterar
            </button>
          )}
        </div>
        {!isMethodConfirmed && (
          <p className="text-sm text-muted-foreground">
            Selecione o método de pagamento
          </p>
        )}
      </div>

      {/* Payment Error Alert */}
      {paymentError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold text-sm text-destructive">{paymentError.title}</p>
              <p className="text-sm text-foreground">{paymentError.message}</p>
              {paymentError.suggestion && (
                <p className="text-sm text-muted-foreground">{paymentError.suggestion}</p>
              )}
              {paymentError.suggestedMethod && paymentError.suggestedMethod !== "credit_card" && (
                <button
                  type="button"
                  onClick={() => {
                    onClearError?.();
                    const method = paymentError.suggestedMethod === "pix" ? "pix" : "boleto";
                    handleMethodSelect(method as PaymentMethod);
                  }}
                  className="mt-2 text-sm font-medium text-primary underline hover:text-primary/80"
                >
                  {paymentError.suggestedMethod === "pix" ? "Pagar com Pix" : "Pagar com Boleto"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Selection - Estado inicial */}
      {!isMethodConfirmed && (
        <RadioGroup
          value={selectedMethod || ""}
          onValueChange={(value) => handleMethodSelect(value as PaymentMethod)}
          className="space-y-2"
        >
          {/* Cartão de Crédito */}
          {(gatewayConfig.acceptCreditCard !== false) && (
            <label
              htmlFor="credit"
              className={cn(
                "flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors",
                selectedMethod === "credit" 
                  ? "border-checkout-focus bg-checkout-focus/5" 
                  : "border-border hover:border-foreground/50"
              )}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="credit" id="credit" />
                <span className="font-semibold text-foreground">Cartão de Crédito</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  R$ {total.toFixed(2).replace(".", ",")}
                </p>
                <p className="text-sm text-emerald-500">
                  {gatewayConfig.freeInstallments > 1 
                    ? `até ${gatewayConfig.freeInstallments}x sem juros`
                    : `até ${installmentOptions.length}x`
                  }
                </p>
              </div>
            </label>
          )}

          {/* PIX */}
          {(gatewayConfig.acceptPix !== false) && (
            <label
              htmlFor="pix"
              className={cn(
                "flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors",
                selectedMethod === "pix" 
                  ? "border-checkout-focus bg-checkout-focus/5" 
                  : "border-border hover:border-foreground/50"
              )}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="pix" id="pix" />
                <span className="font-semibold text-foreground">Pix</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  R$ {pixTotal.toFixed(2).replace(".", ",")}
                </p>
                <p className="text-sm text-emerald-500">
                  {gatewayConfig.pixDiscount > 0 
                    ? `${(gatewayConfig.pixDiscount * 100).toFixed(0)}% de desconto`
                    : "Aprovação imediata"
                  }
                </p>
              </div>
            </label>
          )}

          {/* Boleto */}
          {(gatewayConfig.acceptBoleto !== false) && (
            <label
              htmlFor="boleto"
              className={cn(
                "flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors",
                selectedMethod === "boleto" 
                  ? "border-checkout-focus bg-checkout-focus/5" 
                  : "border-border hover:border-foreground/50"
              )}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="boleto" id="boleto" />
                <span className="font-semibold text-foreground">Boleto</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  R$ {boletoTotal.toFixed(2).replace(".", ",")}
                </p>
                <p className="text-sm text-emerald-500">
                  {gatewayConfig.boletoDiscount > 0 
                    ? `${(gatewayConfig.boletoDiscount * 100).toFixed(0)}% de desconto`
                    : "Pague em qualquer banco"
                  }
                </p>
              </div>
            </label>
          )}
        </RadioGroup>
      )}

      {/* ============== CARTÃO DE CRÉDITO EXPANDIDO ============== */}
      {isMethodConfirmed && selectedMethod === "credit" && (
        <div className="border border-border rounded-lg p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-4 h-4 rounded-full border border-foreground flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
            </div>
            <span className="font-semibold text-foreground">Cartão de Crédito</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onCreditCardSubmit)} className="space-y-3">
            {/* Número do cartão */}
            <div className="space-y-2">
              <Label htmlFor="cardNumber" className="text-sm font-medium text-foreground">
                Número do cartão
              </Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  maxLength={19}
                  {...register("cardNumber")}
                  onChange={(e) => {
                    const formatted = formatCardNumber(e.target.value);
                    setValue("cardNumber", formatted);
                  }}
                  className={cn(
                    "pr-12 border-checkout-border focus:border-checkout-focus",
                    errors.cardNumber && "border-red-500"
                  )}
                />
                {detectedBrand && brandIcons[detectedBrand] && (
                  <img
                    src={brandIcons[detectedBrand]}
                    alt={detectedBrand}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-auto"
                  />
                )}
              </div>
              {errors.cardNumber && (
                <p className="text-sm text-red-500">{errors.cardNumber.message}</p>
              )}
            </div>

            {/* Nome no cartão */}
            <div className="space-y-2">
              <Label htmlFor="cardName" className="text-sm font-medium text-foreground">
                Nome no cartão
              </Label>
              <Input
                id="cardName"
                placeholder="Como impresso"
                {...register("cardName")}
                className={cn(
                  "border-checkout-border focus:border-checkout-focus",
                  errors.cardName && "border-red-500"
                )}
              />
              {errors.cardName && (
                <p className="text-sm text-red-500">{errors.cardName.message}</p>
              )}
            </div>

            {/* Validade e CVV */}
            <div className="grid grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <div className="flex items-center h-5">
                  <Label htmlFor="cardExpiry" className="text-sm font-medium text-foreground">
                    Validade (mês/ano)
                  </Label>
                </div>
                <Input
                  id="cardExpiry"
                  placeholder="MM/AA"
                  inputMode="numeric"
                  maxLength={5}
                  {...register("cardExpiry")}
                  onChange={(e) => {
                    const formatted = formatExpiry(e.target.value);
                    setValue("cardExpiry", formatted);
                  }}
                  className={cn(
                    "border-checkout-border focus:border-checkout-focus",
                    errors.cardExpiry && "border-red-500"
                  )}
                />
                {errors.cardExpiry && (
                  <p className="text-sm text-red-500">{errors.cardExpiry.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1 h-5">
                  <Label htmlFor="cardCvv" className="text-sm font-medium text-foreground">
                    CVV
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-emerald-500 hover:text-emerald-600">
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 bg-slate-50 text-slate-900 border border-slate-200 shadow-xl" align="center">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">O que é CVV?</p>
                          <p className="text-xs text-slate-600 mt-1">
                            O CVV é o código de segurança de 3 ou 4 dígitos impresso no verso do seu cartão.
                          </p>
                        </div>
                        <img src={cvvIcon} alt="CVV" className="w-16 h-auto flex-shrink-0" />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="relative">
                  <Input
                    id="cardCvv"
                    placeholder="000"
                    inputMode="numeric"
                    maxLength={4}
                    {...register("cardCvv")}
                    className={cn(
                      "pr-10 border-checkout-border focus:border-checkout-focus",
                      errors.cardCvv && "border-red-500"
                    )}
                  />
                  <img
                    src={cvvIcon}
                    alt="CVV"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-auto opacity-50"
                  />
                </div>
                {errors.cardCvv && (
                  <p className="text-sm text-red-500">{errors.cardCvv.message}</p>
                )}
              </div>
            </div>

            {/* Parcelas */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Parcelas</Label>
              <Select
                value={selectedInstallments.toString()}
                onValueChange={(value) => setSelectedInstallments(parseInt(value))}
              >
                <SelectTrigger className="border-checkout-border focus:border-checkout-focus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {installmentOptions.map((option) => (
                    <SelectItem key={option.quantity} value={option.quantity.toString()}>
                      {option.quantity}x de R$ {option.value.toFixed(2).replace(".", ",")} 
                      {option.interest 
                        ? ` (Total: R$ ${option.totalWithInterest.toFixed(2).replace(".", ",")})` 
                        : " sem juros"
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cartões aceitos */}
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">Cartões aceitos</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {visibleBrands.map((brand) => (
                  <img
                    key={brand}
                    src={brandIcons[brand]}
                    alt={brand}
                    className="h-5 w-auto sm:h-6 md:h-7"
                  />
                ))}
                {!showAllBrands && hiddenBrandsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllBrands(true)}
                    className="text-xs text-emerald-600 font-medium hover:text-emerald-700 ml-1"
                  >
                    +{hiddenBrandsCount} mais
                  </button>
                )}
              </div>
            </div>

            {/* Resumo do pagamento e botão */}
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg">Você pagará</span>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">
                    R$ {totalWithInterest.toFixed(2).replace(".", ",")}
                  </p>
                  {selectedInstallments > 1 && (
                    <p className={cn(
                      "font-semibold",
                      selectedOption?.interest ? "text-muted-foreground" : "text-emerald-500"
                    )}>
                      {selectedInstallments}x R$ {installmentValue.toFixed(2).replace(".", ",")}
                      {selectedOption?.interest ? " com juros" : " sem juros"}
                    </p>
                  )}
                </div>
              </div>

              <button
                data-finalize-button="true"
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 font-semibold text-sm tracking-wide transition-all disabled:opacity-90 hover:opacity-90 hover:brightness-95"
                style={{
                  backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--primary))))',
                  color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--primary-foreground))))',
                  borderRadius: 'var(--store-button-radius, 0.375rem)'
                }}
                onMouseEnter={(e) => {
                  const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
                  if (hoverColor) {
                    e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
                  }
                }}
                onMouseLeave={(e) => {
                  const buttonColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button').trim();
                  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--store-primary').trim();
                  const fallbackColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
                  e.currentTarget.style.backgroundColor = `hsl(${buttonColor || primaryColor || fallbackColor})`;
                }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                    PROCESSANDO...
                  </>
                ) : (
                  "PAGAR AGORA"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============== PIX EXPANDIDO ============== */}
      {isMethodConfirmed && selectedMethod === "pix" && (
        <div className="border border-border rounded-lg p-4 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-4 h-4 rounded-full border border-foreground flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
            </div>
            <span className="font-semibold text-foreground">Pix</span>
            {gatewayConfig.pixDiscount > 0 && (
              <span className="text-sm text-emerald-500 font-medium">
                {(gatewayConfig.pixDiscount * 100).toFixed(0)}% de desconto
              </span>
            )}
          </div>

          {/* PIX Icon */}
          <div style={{ marginTop: '-8px', marginBottom: '-4px' }}>
            <Pix style={{ width: 90, height: 90 }} />
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Linha vertical contínua - passa pelo centro dos círculos */}
            <div className="absolute left-[13px] top-3 bottom-6 w-0.5 bg-border" />
            
            {[
              'Clique em "PAGAR COM PIX" para finalizar seu pedido',
              "Na próxima tela, você verá o QR Code e o código Pix copia e cola",
              "No app do seu banco, escaneie o QR Code ou cole o código e confirme o pagamento."
            ].map((text, index) => (
              <div key={index} className="flex items-center gap-3 mb-5 last:mb-0">
                <div className="w-7 h-7 rounded-full border-2 border-border bg-background flex items-center justify-center text-xs text-muted-foreground font-medium flex-shrink-0 relative z-10">
                  {index + 1}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontSize: '12px' }}>{text}</p>
              </div>
            ))}
          </div>

          {/* Resumo e botão */}
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg">Você pagará</span>
              <p className="text-xl font-bold text-foreground">
                R$ {pixTotal.toFixed(2).replace(".", ",")}
              </p>
            </div>

            <button
              data-finalize-button="true"
              type="button"
              onClick={handlePixPayment}
              disabled={isProcessing}
              className="w-full py-3.5 font-semibold text-sm tracking-wide transition-all disabled:opacity-90 hover:opacity-90 hover:brightness-95"
              style={{
                backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--primary))))',
                color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--primary-foreground))))',
                borderRadius: 'var(--store-button-radius, 0.375rem)'
              }}
              onMouseEnter={(e) => {
                const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
                if (hoverColor) {
                  e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
                }
              }}
              onMouseLeave={(e) => {
                const buttonColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button').trim();
                const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--store-primary').trim();
                const fallbackColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
                e.currentTarget.style.backgroundColor = `hsl(${buttonColor || primaryColor || fallbackColor})`;
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                  PROCESSANDO...
                </>
              ) : (
                "PAGAR COM PIX"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ============== BOLETO EXPANDIDO ============== */}
      {isMethodConfirmed && selectedMethod === "boleto" && (
        <div className="border border-border rounded-lg p-4 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-4 h-4 rounded-full border border-foreground flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
            </div>
            <span className="font-semibold text-foreground">Boleto</span>
            {gatewayConfig.boletoDiscount > 0 && (
              <span className="text-sm text-emerald-500 font-medium">
                {(gatewayConfig.boletoDiscount * 100).toFixed(0)}% de desconto
              </span>
            )}
          </div>

          {/* Boleto Icon */}
          <div style={{ marginTop: '0px', marginBottom: '4px' }}>
            <BoletoTransparent style={{ width: 90, height: 90 }} />
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Linha vertical contínua - passa pelo centro dos círculos */}
            <div className="absolute left-[13px] top-3 bottom-6 w-0.5 bg-border" />
            
            {[
              'Clique em "PAGAR COM BOLETO" para finalizar seu pedido',
              "Copie o código ou baixe o boleto em PDF",
              "Pague no aplicativo do seu banco, internet banking ou em uma lotérica"
            ].map((text, index) => (
              <div key={index} className="flex items-center gap-3 mb-5 last:mb-0">
                <div className="w-7 h-7 rounded-full border-2 border-border bg-background flex items-center justify-center text-xs text-muted-foreground font-medium flex-shrink-0 relative z-10">
                  {index + 1}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontSize: '12px' }}>{text}</p>
              </div>
            ))}
          </div>

          {/* Resumo e botão */}
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg">Você pagará</span>
              <p className="text-xl font-bold text-foreground">
                R$ {boletoTotal.toFixed(2).replace(".", ",")}
              </p>
            </div>

            <button
              data-finalize-button="true"
              type="button"
              onClick={handleBoletoPayment}
              disabled={isProcessing}
              className="w-full py-3.5 font-semibold text-sm tracking-wide transition-all disabled:opacity-90 hover:opacity-90 hover:brightness-95"
              style={{
                backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--primary))))',
                color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--primary-foreground))))',
                borderRadius: 'var(--store-button-radius, 0.375rem)'
              }}
              onMouseEnter={(e) => {
                const hoverColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button-hover').trim();
                if (hoverColor) {
                  e.currentTarget.style.backgroundColor = `hsl(${hoverColor})`;
                }
              }}
              onMouseLeave={(e) => {
                const buttonColor = getComputedStyle(document.documentElement).getPropertyValue('--store-button').trim();
                const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--store-primary').trim();
                const fallbackColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
                e.currentTarget.style.backgroundColor = `hsl(${buttonColor || primaryColor || fallbackColor})`;
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                  PROCESSANDO...
                </>
              ) : (
                "PAGAR COM BOLETO"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Botão quando nada está selecionado */}
      {!isMethodConfirmed && (
        <div className="pt-4 space-y-3">
          <button
            ref={buttonRef}
            type="button"
            onClick={handleFinalizeWithoutSelection}
            className="w-full bg-muted text-muted-foreground py-3.5 rounded-md font-semibold text-sm tracking-wide cursor-pointer"
          >
            FINALIZAR COMPRA
          </button>
          
          {!hideBackButton && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 text-foreground py-2 font-medium"
            >
              <ChevronLeft className="h-4 w-4" />
              VOLTAR
            </button>
          )}
        </div>
      )}
    </div>
  );
}
