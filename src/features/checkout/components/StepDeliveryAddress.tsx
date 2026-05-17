import { useState, useRef, useEffect } from "react";
import { useCheckout, isDeliveryAddressComplete } from "./CheckoutContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, ArrowRight, ArrowLeft, ChevronLeft, Check, X, Loader2 } from "lucide-react";
import { CepSearchModal } from "./CepSearchModal";
import { ShippingSelector } from "./ShippingSelector";
import { SavedAddressSelector } from "./SavedAddressSelector";
import { AddressConfirmationCard } from "./AddressConfirmationCard";
import { cn } from "@/lib/utils";
import { ShippingQuote, ShippingItem } from "@/features/shipping";
import { useCustomerLookup } from "@/features/checkout/hooks/useCustomerLookup";
import { useCheckoutScroll } from "@/features/checkout/hooks/useCheckoutScroll";

interface StepDeliveryAddressProps {
  onNext: () => void;
  onBack: () => void;
  storeId?: string;
  defaultShippingCost?: number;
  freeShippingThreshold?: number | null;
}

interface SavedAddress {
  id: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  is_default: boolean | null;
}

export function StepDeliveryAddress({ 
  onNext, 
  onBack, 
  storeId,
  defaultShippingCost,
  freeShippingThreshold 
}: StepDeliveryAddressProps) {
  const { checkoutData, updateDeliveryAddress, recognizedCustomer, setRecognizedCustomer } = useCheckout();
  const { items: cartItems } = useCart();
  
  // Lookup customer by CPF if not already recognized (for when checkout skips Step 1)
  const { data: lookedUpCustomer, isLoading: isLoadingCustomer } = useCustomerLookup(
    storeId,
    !recognizedCustomer ? checkoutData.personalData?.cpf : undefined
  );

  // Set recognized customer when looked up (if checkout skipped Step 1)
  useEffect(() => {
    if (lookedUpCustomer && !recognizedCustomer) {
      setRecognizedCustomer(lookedUpCustomer);
    }
  }, [lookedUpCustomer, recognizedCustomer, setRecognizedCustomer]);
  
  // Auto-scroll for confirmation views (saved addresses or localStorage address)
  // Only scroll when user already has data filled and we're showing a confirmation view
  const shouldAutoScroll = !isLoadingCustomer && (
    (recognizedCustomer && recognizedCustomer.addresses.length > 0) || 
    isDeliveryAddressComplete(checkoutData.deliveryAddress)
  );
  
  const { containerRef: stepContainerRef } = useCheckoutScroll<HTMLDivElement>({
    enabled: shouldAutoScroll,
    delay: 150,
  });
  
  const [loadingCep, setLoadingCep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noNumber, setNoNumber] = useState(checkoutData.deliveryAddress?.noNumber || false);
  const [showCepSearchModal, setShowCepSearchModal] = useState(false);
  const [cepError, setCepError] = useState<string>("");
  const [cepValid, setCepValid] = useState<boolean | null>(null);
  const [showOrderNotes, setShowOrderNotes] = useState(!!checkoutData.deliveryAddress?.orderNotes);
  const [orderNotes, setOrderNotes] = useState(checkoutData.deliveryAddress?.orderNotes || "");
  const [selectedShippingQuote, setSelectedShippingQuoteState] = useState<ShippingQuote | null>(
    checkoutData.deliveryAddress?.shippingQuote || null
  );
  const [isShippingLoading, setIsShippingLoading] = useState(false);

  // Handler that updates both local state and context for real-time display
  const setSelectedShippingQuote = (quote: ShippingQuote | null) => {
    setSelectedShippingQuoteState(quote);
    // Update context immediately so OrderSummary can display the shipping price
    if (quote) {
      updateDeliveryAddress({
        ...checkoutData.deliveryAddress,
        shippingMethod: quote.service_name,
        shippingPrice: quote.price,
        shippingQuote: quote,
      });
    }
  };
  
  // Check if customer has saved addresses
  const hasSavedAddresses = recognizedCustomer && recognizedCustomer.addresses.length > 0;
  
  // Check if user has address data from localStorage (not a recognized customer)
  // This is for users who filled the form previously but don't have an account
  const hasLocalStorageAddress = !recognizedCustomer && isDeliveryAddressComplete(checkoutData.deliveryAddress);
  
  // State to track if user wants to edit the confirmation card
  const [isEditingConfirmation, setIsEditingConfirmation] = useState(false);
  
  // State to track if user is adding a new address (only relevant when hasSavedAddresses)
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  
  // Selected saved address ID
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(() => {
    if (hasSavedAddresses) {
      const defaultAddr = recognizedCustomer.addresses.find(a => a.is_default);
      return defaultAddr?.id || recognizedCustomer.addresses[0]?.id || null;
    }
    return null;
  });

  // When customer is recognized after lookup, select the default address
  useEffect(() => {
    if (recognizedCustomer && recognizedCustomer.addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = recognizedCustomer.addresses.find(a => a.is_default);
      setSelectedAddressId(defaultAddr?.id || recognizedCustomer.addresses[0]?.id || null);
    }
  }, [recognizedCustomer, selectedAddressId]);
  
  // Refs para os campos de input
  const cepRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const complementRef = useRef<HTMLInputElement>(null);

  // Track if we already auto-focused to prevent re-focusing on re-renders
  const hasAutoFocused = useRef(false);
  
  // Rastreia quais campos foram preenchidos pelo CEP
  const [cepFilledFields, setCepFilledFields] = useState<{
    street: boolean;
    neighborhood: boolean;
    city: boolean;
    state: boolean;
  }>({
    street: false,
    neighborhood: false,
    city: false,
    state: false,
  });
  
  const [formData, setFormData] = useState({
    zipCode: checkoutData.deliveryAddress?.zipCode || "",
    street: checkoutData.deliveryAddress?.street || "",
    number: checkoutData.deliveryAddress?.number || "",
    complement: checkoutData.deliveryAddress?.complement || "",
    neighborhood: checkoutData.deliveryAddress?.neighborhood || "",
    city: checkoutData.deliveryAddress?.city || "",
    state: checkoutData.deliveryAddress?.state || "",
    recipient: checkoutData.deliveryAddress?.recipient || checkoutData.personalData?.fullName || "",
  });

  // Auto-focus on CEP field when showing new address form (only for new customers or when adding new)
  useEffect(() => {
    const shouldFocus = (!hasSavedAddresses || isAddingNewAddress) && !formData.zipCode && !hasAutoFocused.current;
    
    if (shouldFocus) {
      hasAutoFocused.current = true;
      const timer = setTimeout(() => {
        if (cepRef.current) {
          cepRef.current.focus();
          setTimeout(() => {
            cepRef.current?.scrollIntoView({ 
              behavior: "smooth", 
              block: "center" 
            });
          }, 300);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [hasSavedAddresses, isAddingNewAddress, formData.zipCode]);

  // When a saved address is selected, populate form data and update context
  useEffect(() => {
    if (selectedAddressId && recognizedCustomer && !isAddingNewAddress) {
      const selectedAddr = recognizedCustomer.addresses.find(a => a.id === selectedAddressId);
      if (selectedAddr) {
        const formattedCep = selectedAddr.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
        const newFormData = {
          zipCode: formattedCep,
          street: selectedAddr.rua,
          number: selectedAddr.numero,
          complement: selectedAddr.complemento || "",
          neighborhood: selectedAddr.bairro,
          city: selectedAddr.cidade,
          state: selectedAddr.estado,
          recipient: checkoutData.personalData?.fullName || "",
        };
        setFormData(newFormData);
        setCepValid(true);
        setCepError("");
        
        // Update context with selected address data
        updateDeliveryAddress({
          ...newFormData,
          noNumber: selectedAddr.numero === 'S/N',
        });
      }
    }
  }, [selectedAddressId, recognizedCustomer, isAddingNewAddress]);

  // Handler for when an address is updated via inline edit
  const handleAddressUpdated = (updatedAddress: SavedAddress) => {
    if (recognizedCustomer && setRecognizedCustomer) {
      const updatedAddresses = recognizedCustomer.addresses.map(addr => {
        if (addr.id === updatedAddress.id) return updatedAddress;
        // If the updated address is now default, unset default on all others
        if (updatedAddress.is_default && addr.is_default) {
          return { ...addr, is_default: false };
        }
        return addr;
      });
      setRecognizedCustomer({
        ...recognizedCustomer,
        addresses: updatedAddresses,
      });
      
      // If this is the currently selected address, update form data
      if (selectedAddressId === updatedAddress.id) {
        const formattedCep = updatedAddress.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
        setFormData(prev => ({
          ...prev,
          zipCode: formattedCep,
          street: updatedAddress.rua,
          number: updatedAddress.numero,
          complement: updatedAddress.complemento || "",
          neighborhood: updatedAddress.bairro,
          city: updatedAddress.cidade,
          state: updatedAddress.estado,
        }));
      }
    }
  };

  // Preparar itens para cálculo de frete
  const shippingItems: ShippingItem[] = cartItems.map(item => ({
    weight: 0.3,
    length: 20,
    height: 5,
    width: 15,
    quantity: item.quantity,
    price: item.price,
  }));

  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setFormData(prev => ({ ...prev, zipCode: formatted }));
    
    setCepError("");
    setCepValid(null);
    
    const cleanCep = formatted.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      searchCep(cleanCep);
    } else {
      setFormData(prev => ({
        ...prev,
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
      }));
      setCepFilledFields({
        street: false,
        neighborhood: false,
        city: false,
        state: false,
      });
      setNoNumber(false);
    }
  };

  const handleZipCodeBlur = () => {
    const cleanCep = formData.zipCode.replace(/\D/g, "");
    
    if (!formData.zipCode) {
      setCepError("Preencha este campo");
      setCepValid(false);
      return;
    }
    
    if (cleanCep.length !== 8) {
      setCepError("CEP inválido");
      setCepValid(false);
      return;
    }
    
    if (formData.city && formData.state) {
      setCepValid(true);
    }
  };

  const searchCep = async (cleanCep: string) => {
    if (cleanCep.length < 8) {
      setCepError("CEP incompleto. Digite os 8 dígitos.");
      setCepValid(false);
      return;
    }

    if (cleanCep.length !== 8) {
      setCepError("CEP deve ter 8 dígitos");
      setCepValid(false);
      return;
    }

    if (!/^\d+$/.test(cleanCep)) {
      setCepError("CEP deve conter apenas números");
      setCepValid(false);
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      
      if (!response.ok) {
        setCepError("Erro ao consultar CEP. Tente novamente.");
        setCepValid(false);
        return;
      }

      const data = await response.json();

      if (data.erro) {
        setCepError("CEP não encontrado. Verifique e tente novamente.");
        setCepValid(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state
      }));
      
      setCepFilledFields({
        street: !!data.logradouro,
        neighborhood: !!data.bairro,
        city: !!data.localidade,
        state: !!data.uf,
      });
      
      setNoNumber(false);
      setCepValid(true);
      setCepError("");
      
      setTimeout(() => {
        let targetRef: React.RefObject<HTMLInputElement> | null = null;
        
        if (!data.logradouro && streetRef.current) {
          targetRef = streetRef;
        } else if (numberRef.current) {
          targetRef = numberRef;
        } else if (!data.bairro && neighborhoodRef.current) {
          targetRef = neighborhoodRef;
        }
        
        if (targetRef?.current) {
          targetRef.current.focus();
          targetRef.current.scrollIntoView({ 
            behavior: "smooth", 
            block: "center" 
          });
        }
      }, 150);
    } catch (error) {
      setCepValid(false);
      setCepError("Erro ao conectar ao serviço de CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const cleanCep = formData.zipCode.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) {
      setCepError("CEP inválido");
      setCepValid(false);
      return;
    }
    
    if (!formData.city || !formData.state) {
      setCepError("Busque o CEP primeiro");
      setCepValid(false);
      return;
    }

    if (!selectedShippingQuote) {
      toast.error("Selecione uma forma de entrega");
      return;
    }

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 400));

    updateDeliveryAddress({
      ...formData,
      noNumber,
      orderNotes: showOrderNotes ? orderNotes : "",
      shippingMethod: selectedShippingQuote.service_name,
      shippingPrice: selectedShippingQuote.price,
      shippingQuote: selectedShippingQuote,
    });
    setIsSubmitting(false);
    onNext();
  };

  const handleCepSelected = (cep: string) => {
    const formatted = formatCEP(cep);
    setFormData(prev => ({ ...prev, zipCode: formatted }));
    const cleanCep = cep.replace(/\D/g, "");
    searchCep(cleanCep);
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Verifica quais campos precisam ser exibidos
  const showStreetField = !cepFilledFields.street;
  const showNeighborhoodField = !cepFilledFields.neighborhood;
  const hasAddressFromCep = formData.city && formData.state;

  const handleSelectSavedAddress = (address: SavedAddress | null) => {
    if (address) {
      setSelectedAddressId(address.id);
      setSelectedShippingQuote(null);
    }
  };

  const handleAddNewAddress = () => {
    setIsAddingNewAddress(true);
    hasAutoFocused.current = false;
    // Reset form data
    setFormData({
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      recipient: checkoutData.personalData?.fullName || "",
    });
    setCepValid(null);
    setCepError("");
    setCepFilledFields({
      street: false,
      neighborhood: false,
      city: false,
      state: false,
    });
    setSelectedShippingQuote(null);
    // Focus on CEP field after a small delay
    setTimeout(() => {
      cepRef.current?.focus();
      cepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleBackToSavedAddresses = () => {
    setIsAddingNewAddress(false);
    // Restore selected address data
    if (selectedAddressId && recognizedCustomer) {
      const selectedAddr = recognizedCustomer.addresses.find(a => a.id === selectedAddressId);
      if (selectedAddr) {
        const formattedCep = selectedAddr.cep.replace(/(\d{5})(\d{3})/, '$1-$2');
        setFormData({
          zipCode: formattedCep,
          street: selectedAddr.rua,
          number: selectedAddr.numero,
          complement: selectedAddr.complemento || "",
          neighborhood: selectedAddr.bairro,
          city: selectedAddr.cidade,
          state: selectedAddr.estado,
          recipient: checkoutData.personalData?.fullName || "",
        });
        setCepValid(true);
      }
    }
  };

  // Determine which view to show
  // Priority: 1) Loading customer lookup, 2) Saved addresses for recognized customers, 3) Confirmation card for localStorage data, 4) New address form
  const isLookingUpCustomer = isLoadingCustomer && !recognizedCustomer;
  const showSavedAddressesView = hasSavedAddresses && !isAddingNewAddress;
  const showConfirmationCard = !isLookingUpCustomer && !hasSavedAddresses && hasLocalStorageAddress && !isEditingConfirmation;
  const showNewAddressForm = !isLookingUpCustomer && ((!hasSavedAddresses && !hasLocalStorageAddress) || isAddingNewAddress || isEditingConfirmation);

  // Helper to get description text
  const getDescriptionText = () => {
    if (isLookingUpCustomer) return "Verificando seus dados...";
    if (showSavedAddressesView) return "Selecione um endereço ou adicione um novo.";
    if (showConfirmationCard) return "Confirme o endereço de entrega ou edite se necessário.";
    return "Informe o endereço de entrega do seu pedido.";
  };

  return (
    <div ref={stepContainerRef} className="md:bg-background md:border md:border-checkout-border md:rounded-lg md:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-sm font-bold">
            2
          </span>
          Endereço de entrega
        </h2>
        <p className="text-sm text-muted-foreground">
          {getDescriptionText()}
        </p>
      </div>

      {/* Loading state while looking up customer */}
      {isLookingUpCustomer && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ============================================ */}
        {/* VIEW 1: Saved Addresses (when customer has saved addresses and not adding new) */}
        {/* ============================================ */}
        {showSavedAddressesView && (
          <>
            {/* Saved Address Selector */}
            <SavedAddressSelector
              addresses={recognizedCustomer!.addresses}
              selectedAddressId={selectedAddressId}
              onSelectAddress={handleSelectSavedAddress}
              onAddNewAddress={handleAddNewAddress}
              onAddressUpdated={handleAddressUpdated}
            />

            {/* Shipping Selector for saved address */}
            {selectedAddressId && formData.zipCode && storeId && (
              <div className="space-y-3 pt-2">
                <ShippingSelector
                  storeId={storeId}
                  destinationCep={formData.zipCode}
                  items={shippingItems}
                  selectedQuote={selectedShippingQuote}
                  onSelectQuote={setSelectedShippingQuote}
                  defaultShippingCost={defaultShippingCost}
                  freeShippingThreshold={freeShippingThreshold}
                  onLoadingChange={setIsShippingLoading}
                />
              </div>
            )}

            {/* Order notes for saved address */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showOrderNotesSaved"
                  checked={showOrderNotes}
                  onCheckedChange={(checked) => {
                    setShowOrderNotes(checked as boolean);
                    if (!checked) {
                      setOrderNotes("");
                    }
                  }}
                />
                <label htmlFor="showOrderNotesSaved" className="text-sm text-foreground cursor-pointer">
                  Incluir informações adicionais
                </label>
              </div>

              {showOrderNotes && (
                <div className="space-y-2">
                  <Label htmlFor="orderNotesSaved" className="text-sm font-medium text-checkout-title">
                    Observações do pedido
                  </Label>
                  <Textarea
                    id="orderNotesSaved"
                    placeholder="Observações sobre seu pedido, ex.: observações especiais sobre entrega"
                    value={orderNotes}
                    onChange={(e) => {
                      setOrderNotes(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }}
                    className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm min-h-[60px] max-h-[200px] resize-none"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ============================================ */}
        {/* VIEW 2: Address Confirmation Card (localStorage data, not recognized customer) */}
        {/* ============================================ */}
        {showConfirmationCard && (
          <>
            <AddressConfirmationCard
              storeId={storeId}
              defaultShippingCost={defaultShippingCost}
              freeShippingThreshold={freeShippingThreshold}
              onEdit={() => setIsEditingConfirmation(true)}
              selectedShippingQuote={selectedShippingQuote}
              onSelectShippingQuote={setSelectedShippingQuote}
              onShippingLoadingChange={setIsShippingLoading}
            />

            {/* Order notes for confirmation card */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showOrderNotesConfirm"
                  checked={showOrderNotes}
                  onCheckedChange={(checked) => {
                    setShowOrderNotes(checked as boolean);
                    if (!checked) {
                      setOrderNotes("");
                    }
                  }}
                />
                <label htmlFor="showOrderNotesConfirm" className="text-sm text-foreground cursor-pointer">
                  Incluir informações adicionais
                </label>
              </div>

              {showOrderNotes && (
                <div className="space-y-2">
                  <Label htmlFor="orderNotesConfirm" className="text-sm font-medium text-checkout-title">
                    Observações do pedido
                  </Label>
                  <Textarea
                    id="orderNotesConfirm"
                    placeholder="Observações sobre seu pedido, ex.: observações especiais sobre entrega"
                    value={orderNotes}
                    onChange={(e) => {
                      setOrderNotes(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }}
                    className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm min-h-[60px] max-h-[200px] resize-none"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ============================================ */}
        {/* VIEW 3: New Address Form (when no saved addresses OR adding new OR editing confirmation) */}
        {/* ============================================ */}
        {showNewAddressForm && (
          <>
            {/* Back button (for various scenarios) */}
            {hasSavedAddresses && isAddingNewAddress && (
              <button
                type="button"
                onClick={handleBackToSavedAddresses}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para endereços salvos
              </button>
            )}
            {hasLocalStorageAddress && isEditingConfirmation && (
              <button
                type="button"
                onClick={() => setIsEditingConfirmation(false)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para confirmação
              </button>
            )}

            {/* CEP Field */}
            <div>
              <Label htmlFor="zipCode" className="text-sm font-medium text-checkout-title">CEP</Label>
              <div className="flex gap-2 items-start mt-1">
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      ref={cepRef}
                      id="zipCode"
                      placeholder="00000-000"
                      inputMode="numeric"
                      value={formData.zipCode}
                      onChange={handleCepChange}
                      onBlur={handleZipCodeBlur}
                      required
                      className={cn(
                        "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                        cepError && "border-red-500"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {loadingCep ? (
                        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                      ) : cepValid !== null ? (
                        cepValid ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )
                      ) : null}
                    </div>
                  </div>
                  {cepError && <p className="text-sm text-red-500 mt-1">{cepError}</p>}
                </div>
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline whitespace-nowrap pt-2"
                  onClick={() => setShowCepSearchModal(true)}
                >
                  Não sei meu CEP
                </button>
              </div>
            </div>

            {/* Address preview after CEP */}
            {formData.city && formData.state && (
              <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Entrega em:</p>
                  <p className="font-medium">
                    {formData.street && formData.neighborhood ? `${formData.street}, ${formData.neighborhood} - ` : ""}
                    {formData.city} - {formData.state}
                  </p>
                </div>
              </div>
            )}

            {/* Address fields after CEP is validated */}
            {hasAddressFromCep && (
              <div className="space-y-4">
                {/* Street field (if not filled by CEP) */}
                {showStreetField && (
                  <div className="flex gap-4">
                    <div className="space-y-2" style={{ width: '65%' }}>
                      <Label htmlFor="street" className="text-sm font-medium text-checkout-title">Endereço</Label>
                      <Input
                        id="street"
                        ref={streetRef}
                        placeholder="Rua, Avenida, etc."
                        value={formData.street}
                        onChange={handleInputChange('street')}
                        required
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                      />
                    </div>
                    <div className="space-y-2" style={{ width: '35%' }}>
                      <Label htmlFor="number" className="text-sm font-medium text-checkout-title">Número</Label>
                      <Input
                        id="number"
                        ref={numberRef}
                        placeholder="Ex: 123"
                        disabled={noNumber}
                        value={formData.number}
                        onChange={handleInputChange('number')}
                        required={!noNumber}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="noNumber"
                          checked={noNumber}
                          onCheckedChange={(checked) => {
                            setNoNumber(checked as boolean);
                            if (checked) {
                              setFormData(prev => ({ ...prev, number: "S/N" }));
                            } else {
                              setFormData(prev => ({ ...prev, number: "" }));
                            }
                          }}
                        />
                        <label htmlFor="noNumber" className="text-sm text-muted-foreground cursor-pointer">
                          Sem número
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Neighborhood field (if not filled by CEP) */}
                {showNeighborhoodField && (
                  <div>
                    <Label htmlFor="neighborhood" className="text-sm font-medium text-checkout-title">Bairro</Label>
                    <Input
                      id="neighborhood"
                      ref={neighborhoodRef}
                      placeholder="Nome do bairro"
                      value={formData.neighborhood}
                      onChange={handleInputChange('neighborhood')}
                      required
                      className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm mt-1"
                    />
                  </div>
                )}

                {/* Number and Complement (when CEP filled street and neighborhood) */}
                {!showStreetField && (
                  <div className="flex gap-4">
                    <div className="space-y-2" style={{ width: '35%' }}>
                      <Label htmlFor="number2" className="text-sm font-medium text-checkout-title">Número</Label>
                      <Input
                        id="number2"
                        ref={numberRef}
                        placeholder="Ex: 123"
                        disabled={noNumber}
                        value={formData.number}
                        onChange={handleInputChange('number')}
                        required={!noNumber}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                      />
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="noNumber2"
                          checked={noNumber}
                          onCheckedChange={(checked) => {
                            setNoNumber(checked as boolean);
                            if (checked) {
                              setFormData(prev => ({ ...prev, number: "S/N" }));
                            } else {
                              setFormData(prev => ({ ...prev, number: "" }));
                            }
                          }}
                        />
                        <label htmlFor="noNumber2" className="text-sm text-muted-foreground cursor-pointer">
                          Sem número
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2" style={{ width: '65%' }}>
                      <Label htmlFor="complement" className="text-sm font-medium text-checkout-title">Complemento (opcional)</Label>
                      <Input
                        id="complement"
                        ref={complementRef}
                        placeholder="Apto, bloco, referência"
                        value={formData.complement}
                        onChange={handleInputChange('complement')}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Complement alone (when showing street field) */}
                {showStreetField && (
                  <div>
                    <Label htmlFor="complement2" className="text-sm font-medium text-checkout-title">Complemento (opcional)</Label>
                    <Input
                      id="complement2"
                      ref={complementRef}
                      placeholder="Apto, bloco, referência"
                      value={formData.complement}
                      onChange={handleInputChange('complement')}
                      className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm mt-1"
                    />
                  </div>
                )}

                {/* Shipping Selector for new address */}
                {storeId && formData.zipCode && formData.zipCode.replace(/\D/g, "").length === 8 && (
                  <div className="space-y-3 pt-2">
                    <ShippingSelector
                      storeId={storeId}
                      destinationCep={formData.zipCode}
                      items={shippingItems}
                      selectedQuote={selectedShippingQuote}
                      onSelectQuote={setSelectedShippingQuote}
                      defaultShippingCost={defaultShippingCost}
                      freeShippingThreshold={freeShippingThreshold}
                      onLoadingChange={setIsShippingLoading}
                    />
                  </div>
                )}

                {/* Order notes for new address */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showOrderNotes"
                      checked={showOrderNotes}
                      onCheckedChange={(checked) => {
                        setShowOrderNotes(checked as boolean);
                        if (!checked) {
                          setOrderNotes("");
                        }
                      }}
                    />
                    <label htmlFor="showOrderNotes" className="text-sm text-foreground cursor-pointer">
                      Incluir informações adicionais
                    </label>
                  </div>

                  {showOrderNotes && (
                    <div className="space-y-2">
                      <Label htmlFor="orderNotes" className="text-sm font-medium text-checkout-title">
                        Observações do pedido
                      </Label>
                      <Textarea
                        id="orderNotes"
                        placeholder="Observações sobre seu pedido, ex.: observações especiais sobre entrega"
                        value={orderNotes}
                        onChange={(e) => {
                          setOrderNotes(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                        }}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm min-h-[60px] max-h-[200px] resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Submit and Back buttons */}
        <div className="space-y-3 pt-4">
          <button 
            type="submit" 
            disabled={isSubmitting || isShippingLoading || !selectedShippingQuote}
            className="w-full h-12 flex items-center justify-center space-x-2 font-medium text-sm transition-all disabled:opacity-50 hover:opacity-90 hover:brightness-95"
            style={{
              backgroundColor: 'hsl(var(--store-button, var(--store-primary, var(--success))))',
              color: 'hsl(var(--store-button-foreground, var(--store-primary-foreground, var(--success-foreground))))',
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
              const fallbackColor = getComputedStyle(document.documentElement).getPropertyValue('--success').trim();
              e.currentTarget.style.backgroundColor = `hsl(${buttonColor || primaryColor || fallbackColor})`;
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">PROCESSANDO...</span>
              </>
            ) : isShippingLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">CALCULANDO FRETE...</span>
              </>
            ) : (
              <>
                <span className="font-medium">CONTINUAR</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 text-foreground py-2 font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            VOLTAR
          </button>
        </div>
      </form>

      {/* CEP Search Modal */}
      <CepSearchModal
        open={showCepSearchModal}
        onOpenChange={setShowCepSearchModal}
        onSelectCep={handleCepSelected}
      />
    </div>
  );
}
