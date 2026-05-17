import { useState, useRef } from "react";
import { PaymentErrorInfo } from "@/features/checkout/utils/paymentErrorMapping";
import { useStoreSlug } from "@/contexts/StoreSlugContext";
import { useCheckout } from "./CheckoutContext";
import { useCart } from "@/contexts/CartContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { CepSearchModal } from "./CepSearchModal";
import { PaymentMethodSection } from "./PaymentMethodSection";
import { ShippingSelector } from "./ShippingSelector";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { useGatewayConfig } from "@/features/payments";
import { useDynamicInstallments } from "@/features/payments";
import { getAcceptedBrands } from "@/features/checkout/utils/gatewayBrands";
import { ShippingQuote } from "@/features/shipping";

interface StepPaymentProps {
  onBack: () => void;
  onNext: (
    paymentData: {
      type: "credit_card" | "pix" | "boleto";
      cardData?: any;
    },
    gatewayType?: "pagarme" | "mercadopago" | "mercado_pago" | null
  ) => void;
  paymentError?: PaymentErrorInfo | null;
  onClearPaymentError?: () => void;
}

export function StepPayment({ onBack, onNext, paymentError, onClearPaymentError }: StepPaymentProps) {
  const storeSlug = useStoreSlug();
  const { store } = useStorefront(storeSlug);
  const { config: gatewayConfig, isLoading: isLoadingGateway } = useGatewayConfig(store?.id);
  
  const { checkoutData, updatePersonalData, updateDeliveryAddress, updatePaymentMethod } = useCheckout();
  const { total: cartTotal, items: cartItems } = useCart();

  // Calculate total for dynamic installments (cartTotal + shipping)
  const shippingForInstallments = checkoutData.deliveryAddress?.shippingPrice || 0;
  const totalForInstallments = cartTotal + shippingForInstallments;
  
  const { dynamicInstallments } = useDynamicInstallments({
    storeId: store?.id,
    amount: totalForInstallments,
    gatewayType: gatewayConfig.gatewayType,
    isActive: gatewayConfig.isActive,
  });
  const [showPersonalDataEdit, setShowPersonalDataEdit] = useState(false);
  const [savingPersonalData, setSavingPersonalData] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [showAddressEdit, setShowAddressEdit] = useState(false);
  const [showShippingEdit, setShowShippingEdit] = useState(false);

  // ============== DADOS PESSOAIS (idêntico ao StepPersonalData) ==============
  const [personalDataForm, setPersonalDataForm] = useState({
    email: checkoutData.personalData?.email || "",
    fullName: checkoutData.personalData?.fullName || "",
    phone: checkoutData.personalData?.phone || "",
    cpf: checkoutData.personalData?.cpf || "",
  });

  const [personalValidation, setPersonalValidation] = useState<Record<string, { isValid: boolean | null; errorType?: 'empty' | 'invalid' }>>({
    email: { isValid: null },
    fullName: { isValid: null },
    phone: { isValid: null },
    cpf: { isValid: null }
  });

  // Validações - idênticas ao StepPersonalData
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;
    const parts = email.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart.length >= 2;
  };

  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 >= 10) digit1 = 0;
    if (digit1 !== parseInt(cleanCPF.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 >= 10) digit2 = 0;
    
    return digit2 === parseInt(cleanCPF.charAt(10));
  };

  const validatePhone = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length === 10 || cleanPhone.length === 11;
  };

  const validateFullName = (name: string): boolean => {
    return name.trim().split(' ').filter(n => n).length >= 2 && name.trim().length >= 3;
  };

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCPF = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handlePersonalInputChange = (field: keyof typeof personalDataForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value;
    
    if (field === 'phone') {
      value = formatPhone(value);
    } else if (field === 'cpf') {
      value = formatCPF(value);
    }
    
    setPersonalDataForm(prev => ({ ...prev, [field]: value }));
    
    let isValid = false;
    if (field === 'email') isValid = validateEmail(value);
    else if (field === 'fullName') isValid = validateFullName(value);
    else if (field === 'phone') isValid = validatePhone(value);
    else if (field === 'cpf') isValid = validateCPF(value);
    
    if (isValid) {
      setPersonalValidation(prev => ({ ...prev, [field]: { isValid: true } }));
    } else if (personalValidation[field].isValid === true) {
      setPersonalValidation(prev => ({ ...prev, [field]: { isValid: null } }));
    }
  };

  const handlePersonalBlur = (field: keyof typeof personalDataForm) => {
    const value = personalDataForm[field];
    let isEmpty = !value || value.trim() === '';
    
    if (field === 'phone' || field === 'cpf') {
      const cleanValue = value.replace(/\D/g, '');
      isEmpty = !cleanValue || cleanValue.length === 0;
      
      if (field === 'cpf' && cleanValue.length > 0 && cleanValue.length < 11) {
        setPersonalValidation(prev => ({ ...prev, [field]: { isValid: false, errorType: 'empty' } }));
        return;
      }
    }
    
    if (isEmpty) {
      setPersonalValidation(prev => ({ ...prev, [field]: { isValid: false, errorType: 'empty' } }));
      return;
    }
    
    let isValid = false;
    switch (field) {
      case 'email': isValid = validateEmail(value); break;
      case 'fullName': isValid = validateFullName(value); break;
      case 'phone': isValid = validatePhone(value); break;
      case 'cpf': isValid = validateCPF(value); break;
    }

    setPersonalValidation(prev => ({ ...prev, [field]: { isValid, errorType: isValid ? undefined : 'invalid' } }));
  };

  const savePersonalData = () => {
    // Validar todos os campos antes de salvar
    const newValidation: Record<string, { isValid: boolean; errorType?: 'empty' | 'invalid' }> = {};
    
    Object.keys(personalDataForm).forEach((field) => {
      const key = field as keyof typeof personalDataForm;
      const value = personalDataForm[key];
      let isEmpty = !value || value.trim() === '';
      
      if (key === 'phone' || key === 'cpf') {
        const cleanValue = value.replace(/\D/g, '');
        isEmpty = !cleanValue || cleanValue.length === 0;
        
        if (key === 'cpf' && cleanValue.length > 0 && cleanValue.length < 11) {
          newValidation[key] = { isValid: false, errorType: 'empty' };
          return;
        }
      }
      
      if (isEmpty) {
        newValidation[key] = { isValid: false, errorType: 'empty' };
        return;
      }
      
      let isValid = false;
      switch (key) {
        case 'email': isValid = validateEmail(value); break;
        case 'fullName': isValid = validateFullName(value); break;
        case 'phone': isValid = validatePhone(value); break;
        case 'cpf': isValid = validateCPF(value); break;
      }
      
      newValidation[key] = { isValid, errorType: isValid ? undefined : 'invalid' };
    });
    
    setPersonalValidation(newValidation);
    
    if (Object.values(newValidation).every(v => v.isValid === true)) {
      setSavingPersonalData(true);
      updatePersonalData(personalDataForm);
      setTimeout(() => {
        setSavingPersonalData(false);
        setShowPersonalDataEdit(false);
      }, 400);
    }
  };

  // ============== ENDEREÇO (idêntico ao StepDeliveryAddress) ==============
  const [addressForm, setAddressForm] = useState({
    zipCode: checkoutData.deliveryAddress?.zipCode || "",
    street: checkoutData.deliveryAddress?.street || "",
    number: checkoutData.deliveryAddress?.number || "",
    complement: checkoutData.deliveryAddress?.complement || "",
    neighborhood: checkoutData.deliveryAddress?.neighborhood || "",
    city: checkoutData.deliveryAddress?.city || "",
    state: checkoutData.deliveryAddress?.state || "",
    recipient: checkoutData.deliveryAddress?.recipient || checkoutData.personalData?.fullName || "",
  });
  
  const [loadingCep, setLoadingCep] = useState(false);
  const [noNumber, setNoNumber] = useState(checkoutData.deliveryAddress?.noNumber || false);
  const [showCepSearchModal, setShowCepSearchModal] = useState(false);
  const [cepError, setCepError] = useState<string>("");
  const [cepValid, setCepValid] = useState<boolean | null>(null);
  
  // Refs para os campos de input
  const streetRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  
  // Rastreia quais campos foram preenchidos pelo CEP
  const [cepFilledFields, setCepFilledFields] = useState<{
    street: boolean;
    neighborhood: boolean;
    city: boolean;
    state: boolean;
  }>({
    street: !!checkoutData.deliveryAddress?.street,
    neighborhood: !!checkoutData.deliveryAddress?.neighborhood,
    city: !!checkoutData.deliveryAddress?.city,
    state: !!checkoutData.deliveryAddress?.state,
  });

  const formatCEP = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setAddressForm(prev => ({ ...prev, zipCode: formatted }));
    
    setCepError("");
    setCepValid(null);
    
    const cleanCep = formatted.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      searchCep(cleanCep);
    } else {
      // CEP incompleto - reseta todos os campos de endereço
      setAddressForm(prev => ({
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
    const cleanCep = addressForm.zipCode.replace(/\D/g, "");
    
    if (!addressForm.zipCode) {
      setCepError("Preencha este campo");
      setCepValid(false);
      return;
    }
    
    if (cleanCep.length !== 8) {
      setCepError("CEP inválido");
      setCepValid(false);
      return;
    }
    
    if (addressForm.city && addressForm.state) {
      setCepValid(true);
    }
  };

  const searchCep = async (cleanCep: string) => {
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

      setAddressForm(prev => ({
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
      
      // Foca no próximo campo vazio após um pequeno delay
      setTimeout(() => {
        if (!data.logradouro && streetRef.current) {
          streetRef.current.focus();
        } else if (numberRef.current) {
          numberRef.current.focus();
        } else if (!data.bairro && neighborhoodRef.current) {
          neighborhoodRef.current.focus();
        }
      }, 100);
    } catch (error) {
      setCepValid(false);
      setCepError("Erro ao conectar ao serviço de CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCepSelected = (cep: string) => {
    const formatted = formatCEP(cep);
    setAddressForm(prev => ({ ...prev, zipCode: formatted }));
    const cleanCep = cep.replace(/\D/g, "");
    searchCep(cleanCep);
  };

  const handleAddressInputChange = (field: keyof typeof addressForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAddressForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const showStreetField = !cepFilledFields.street;
  const showNeighborhoodField = !cepFilledFields.neighborhood;
  const hasAddressFromCep = addressForm.city && addressForm.state;

  const saveAddress = () => {
    const cleanCep = addressForm.zipCode.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) {
      setCepError("CEP inválido");
      setCepValid(false);
      return;
    }
    
    if (!addressForm.city || !addressForm.state) {
      setCepError("Busque o CEP primeiro");
      setCepValid(false);
      return;
    }

    setSavingAddress(true);
    updateDeliveryAddress({
      ...addressForm,
      noNumber,
    });
    setTimeout(() => {
      setSavingAddress(false);
      setShowAddressEdit(false);
    }, 400);
  };

  // ============== FORMA DE ENTREGA ==============
  const [shippingMethod, setShippingMethod] = useState<string>(
    checkoutData.deliveryAddress?.shippingMethod || ""
  );

  const saveShipping = () => {
    updateDeliveryAddress({
      shippingMethod,
    });
    setShowShippingEdit(false);
  };

  // Usar total do carrinho e frete do contexto
  const orderTotal = cartTotal;
  const shippingPrice = checkoutData.deliveryAddress?.shippingPrice || 0;

  const handlePaymentComplete = (paymentData: {
    type: "credit_card" | "pix" | "boleto";
    cardData?: any;
  }) => {
    updatePaymentMethod({
      type: paymentData.type,
      installments: paymentData.cardData?.installments,
    });
    onNext(paymentData, gatewayConfig.gatewayType);
  };

  return (
    <div className="space-y-4">
      {/* Resumo do Pedido */}
      <div className="bg-white rounded-lg border border-border p-4 space-y-4">
        {/* ============== DADOS CADASTRAIS ============== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Dados cadastrais</h3>
            <button
              type="button"
              onClick={() => setShowPersonalDataEdit(!showPersonalDataEdit)}
              className="text-sm text-emerald-500 hover:text-emerald-600 underline"
            >
              Alterar
            </button>
          </div>
          
          {!showPersonalDataEdit ? (
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>{checkoutData.personalData?.email || "email@exemplo.com"}</p>
              <p>
                {checkoutData.personalData?.phone || "(00) 00000-0000"}
                {checkoutData.personalData?.cpf && ` • ${checkoutData.personalData.cpf}`}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Email */}
              <div>
                <Label htmlFor="edit-email" className="text-sm font-medium text-checkout-title">E-mail</Label>
                <div className="relative mt-1">
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="exemplo@email.com"
                    value={personalDataForm.email}
                    onChange={handlePersonalInputChange('email')}
                    onBlur={() => handlePersonalBlur('email')}
                    className={cn(
                      "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                      personalValidation.email.isValid === false && "border-checkout-error"
                    )}
                  />
                  {personalValidation.email.isValid !== null && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {personalValidation.email.isValid === true ? (
                        <Check className="w-4 h-4 text-checkout-success" />
                      ) : (
                        <X className="w-4 h-4 text-checkout-error" />
                      )}
                    </div>
                  )}
                </div>
                {personalValidation.email.isValid === false && (
                  <p className="text-xs text-checkout-error mt-1">
                    {personalValidation.email.errorType === 'empty' ? 'Preencha este campo' : 'E-mail inválido'}
                  </p>
                )}
              </div>

              {/* Nome Completo */}
              <div>
                <Label htmlFor="edit-fullName" className="text-sm font-medium text-checkout-title">Nome Completo</Label>
                <div className="relative mt-1">
                  <Input
                    id="edit-fullName"
                    placeholder="Ex: João Silva"
                    value={personalDataForm.fullName}
                    onChange={handlePersonalInputChange('fullName')}
                    onBlur={() => handlePersonalBlur('fullName')}
                    className={cn(
                      "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                      personalValidation.fullName.isValid === false && "border-checkout-error"
                    )}
                  />
                  {personalValidation.fullName.isValid !== null && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {personalValidation.fullName.isValid === true ? (
                        <Check className="w-4 h-4 text-checkout-success" />
                      ) : (
                        <X className="w-4 h-4 text-checkout-error" />
                      )}
                    </div>
                  )}
                </div>
                {personalValidation.fullName.isValid === false && (
                  <p className="text-xs text-checkout-error mt-1">
                    {personalValidation.fullName.errorType === 'empty' ? 'Preencha este campo' : 'Digite seu nome completo'}
                  </p>
                )}
              </div>

              {/* Celular e CPF */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <Label htmlFor="edit-phone" className="text-sm font-medium text-checkout-title">Celular/WhatsApp</Label>
                  <div className="relative mt-1">
                    <Input
                      id="edit-phone"
                      placeholder="(00) 00000-0000"
                      value={personalDataForm.phone}
                      onChange={handlePersonalInputChange('phone')}
                      onBlur={() => handlePersonalBlur('phone')}
                      inputMode="numeric"
                      className={cn(
                        "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                        personalValidation.phone.isValid === false && "border-checkout-error"
                      )}
                    />
                    {personalValidation.phone.isValid !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {personalValidation.phone.isValid === true ? (
                          <Check className="w-4 h-4 text-checkout-success" />
                        ) : (
                          <X className="w-4 h-4 text-checkout-error" />
                        )}
                      </div>
                    )}
                  </div>
                  {personalValidation.phone.isValid === false && (
                    <p className="text-xs text-checkout-error mt-1">
                      {personalValidation.phone.errorType === 'empty' ? 'Preencha este campo' : 'Celular inválido. Digite DDD + 9 dígitos'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-cpf" className="text-sm font-medium text-checkout-title">CPF</Label>
                  <div className="relative mt-1">
                    <Input
                      id="edit-cpf"
                      placeholder="000.000.000-00"
                      value={personalDataForm.cpf}
                      onChange={handlePersonalInputChange('cpf')}
                      onBlur={() => handlePersonalBlur('cpf')}
                      inputMode="numeric"
                      className={cn(
                        "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                        personalValidation.cpf.isValid === false && "border-checkout-error"
                      )}
                    />
                    {personalValidation.cpf.isValid !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {personalValidation.cpf.isValid === true ? (
                          <Check className="w-4 h-4 text-checkout-success" />
                        ) : (
                          <X className="w-4 h-4 text-checkout-error" />
                        )}
                      </div>
                    )}
                  </div>
                  {personalValidation.cpf.isValid === false && (
                    <p className="text-xs text-checkout-error mt-1">
                      {personalValidation.cpf.errorType === 'empty' ? 'Digite 11 dígitos' : 'CPF inválido'}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={savePersonalData}
                disabled={savingPersonalData}
                className="w-full bg-foreground text-background py-2 rounded-md text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {savingPersonalData ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* ============== ENDEREÇO DE ENTREGA ============== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Endereço de entrega</h3>
            <button
              type="button"
              onClick={() => setShowAddressEdit(!showAddressEdit)}
              className="text-sm text-emerald-500 hover:text-emerald-600 underline"
            >
              Alterar
            </button>
          </div>
          
          {!showAddressEdit ? (
            <div className="text-sm text-muted-foreground">
              <p>
                {checkoutData.deliveryAddress?.street || "Rua"}, {checkoutData.deliveryAddress?.number || "0000"}, {checkoutData.deliveryAddress?.neighborhood || "Bairro"}
              </p>
              <p>
                {checkoutData.deliveryAddress?.zipCode || "00000-000"} {checkoutData.deliveryAddress?.city || "Cidade"} - {checkoutData.deliveryAddress?.state || "UF"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* CEP */}
              <div>
                <Label htmlFor="edit-zipCode" className="text-sm font-medium text-checkout-title">CEP</Label>
                <div className="flex gap-2 items-start mt-1">
                  <div className="flex-1">
                    <div className="relative">
                      <Input
                        id="edit-zipCode"
                        placeholder="00000-000"
                        inputMode="numeric"
                        value={addressForm.zipCode}
                        onChange={handleCepChange}
                        onBlur={handleZipCodeBlur}
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

              {/* Entrega em */}
              {addressForm.city && addressForm.state && (
                <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Entrega em:</p>
                    <p className="font-medium">
                      {addressForm.street && addressForm.neighborhood ? `${addressForm.street}, ${addressForm.neighborhood} - ` : ""}
                      {addressForm.city} - {addressForm.state}
                    </p>
                  </div>
                </div>
              )}

              {/* Campos condicionais baseados no que o CEP retornou */}
              {hasAddressFromCep && (
                <div className="space-y-4">
                  {/* Endereço (se não foi preenchido pelo CEP) */}
                  {showStreetField && (
                    <div className="flex gap-4">
                      <div className="space-y-2" style={{ width: '65%' }}>
                        <Label htmlFor="edit-street" className="text-sm font-medium text-checkout-title">Endereço</Label>
                        <Input
                          id="edit-street"
                          ref={streetRef}
                          placeholder="Rua, Avenida, etc."
                          value={addressForm.street}
                          onChange={handleAddressInputChange('street')}
                          className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                        />
                      </div>
                      <div className="space-y-2" style={{ width: '35%' }}>
                        <Label htmlFor="edit-number" className="text-sm font-medium text-checkout-title">Número</Label>
                        <Input
                          id="edit-number"
                          ref={numberRef}
                          placeholder="Ex: 123"
                          disabled={noNumber}
                          value={addressForm.number}
                          onChange={handleAddressInputChange('number')}
                          className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-noNumber"
                            checked={noNumber}
                            onCheckedChange={(checked) => {
                              setNoNumber(checked as boolean);
                              if (checked) {
                                setAddressForm(prev => ({ ...prev, number: "S/N" }));
                              } else {
                                setAddressForm(prev => ({ ...prev, number: "" }));
                              }
                            }}
                          />
                          <label htmlFor="edit-noNumber" className="text-sm text-muted-foreground cursor-pointer">
                            Sem número
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bairro (se não foi preenchido pelo CEP) */}
                  {showNeighborhoodField && (
                    <div>
                      <Label htmlFor="edit-neighborhood" className="text-sm font-medium text-checkout-title">Bairro</Label>
                      <Input
                        id="edit-neighborhood"
                        ref={neighborhoodRef}
                        placeholder="Nome do bairro"
                        value={addressForm.neighborhood}
                        onChange={handleAddressInputChange('neighborhood')}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm mt-1"
                      />
                    </div>
                  )}

                  {/* Número e Complemento (quando CEP preencheu endereço e bairro) */}
                  {!showStreetField && (
                    <div className="flex gap-4">
                      <div className="space-y-2" style={{ width: '35%' }}>
                        <Label htmlFor="edit-number2" className="text-sm font-medium text-checkout-title">Número</Label>
                        <Input
                          id="edit-number2"
                          ref={numberRef}
                          placeholder="Ex: 123"
                          disabled={noNumber}
                          value={addressForm.number}
                          onChange={handleAddressInputChange('number')}
                          className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-noNumber2"
                            checked={noNumber}
                            onCheckedChange={(checked) => {
                              setNoNumber(checked as boolean);
                              if (checked) {
                                setAddressForm(prev => ({ ...prev, number: "S/N" }));
                              } else {
                                setAddressForm(prev => ({ ...prev, number: "" }));
                              }
                            }}
                          />
                          <label htmlFor="edit-noNumber2" className="text-sm text-muted-foreground cursor-pointer">
                            Sem número
                          </label>
                        </div>
                      </div>
                      <div className="space-y-2" style={{ width: '65%' }}>
                        <Label htmlFor="edit-complement" className="text-sm font-medium text-checkout-title">Complemento (opcional)</Label>
                        <Input
                          id="edit-complement"
                          placeholder="Apto, bloco, referência"
                          value={addressForm.complement}
                          onChange={handleAddressInputChange('complement')}
                          className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Complemento sozinho (quando mostra endereço mas não mostra número junto) */}
                  {showStreetField && (
                    <div>
                      <Label htmlFor="edit-complement2" className="text-sm font-medium text-checkout-title">Complemento (opcional)</Label>
                      <Input
                        id="edit-complement2"
                        placeholder="Apto, bloco, referência"
                        value={addressForm.complement}
                        onChange={handleAddressInputChange('complement')}
                        className="border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm mt-1"
                      />
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={saveAddress}
                disabled={savingAddress || !addressForm.city || !addressForm.street || (!addressForm.number && !noNumber)}
                className="w-full bg-foreground text-background py-2 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingAddress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* ============== FORMA DE ENTREGA ============== */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Forma de entrega</h3>
            <button
              type="button"
              onClick={() => setShowShippingEdit(!showShippingEdit)}
              className="text-sm text-emerald-500 hover:text-emerald-600 underline"
            >
              Alterar
            </button>
          </div>
          
          {!showShippingEdit ? (
            <div className="text-sm space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-foreground">
                  {checkoutData.deliveryAddress?.shippingQuote?.service_name || 
                   checkoutData.deliveryAddress?.shippingMethod || 
                   "Entrega Padrão"}
                </span>
                <span className="text-foreground">
                  {checkoutData.deliveryAddress?.shippingQuote?.is_free ? (
                    <span className="text-green-600">Grátis</span>
                  ) : (
                    `R$ ${(checkoutData.deliveryAddress?.shippingPrice || 0).toFixed(2).replace('.', ',')}`
                  )}
                </span>
              </div>
              {checkoutData.deliveryAddress?.shippingQuote && (
                <p className="text-muted-foreground text-xs">
                  Entrega em até {checkoutData.deliveryAddress.shippingQuote.delivery_time} dia{checkoutData.deliveryAddress.shippingQuote.delivery_time > 1 ? "s úteis" : " útil"}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {store?.id && checkoutData.deliveryAddress?.zipCode && (
                <ShippingSelector
                  storeId={store.id}
                  destinationCep={checkoutData.deliveryAddress.zipCode}
                  items={cartItems.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    weight: 0.3,
                    height: 5,
                    width: 15,
                    length: 20,
                  }))}
                  selectedQuote={checkoutData.deliveryAddress?.shippingQuote || null}
                  onSelectQuote={(quote: ShippingQuote) => {
                    updateDeliveryAddress({
                      shippingQuote: quote,
                      shippingPrice: quote.price,
                      shippingMethod: quote.service_name,
                    });
                  }}
                  defaultShippingCost={store.default_shipping_cost || undefined}
                  freeShippingThreshold={store.free_shipping_threshold}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setSavingShipping(true);
                  setTimeout(() => {
                    setSavingShipping(false);
                    setShowShippingEdit(false);
                  }, 400);
                }}
                disabled={savingShipping}
                className="w-full bg-foreground text-background py-2 rounded-md text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {savingShipping ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Seção de Forma de Pagamento */}
      <div className="md:bg-white md:rounded-lg md:border md:border-border md:p-4">
        {isLoadingGateway ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <PaymentMethodSection
            orderTotal={orderTotal}
            shippingPrice={shippingPrice}
            onPaymentComplete={handlePaymentComplete}
            onBack={onBack}
            paymentError={paymentError}
            onClearError={onClearPaymentError}
            gatewayConfig={gatewayConfig.isActive ? {
              maxInstallments: gatewayConfig.installmentConfig.maxInstallments,
              interestRate: gatewayConfig.installmentConfig.interestRate,
              freeInstallments: gatewayConfig.installmentConfig.freeInstallments,
              minInstallmentValue: gatewayConfig.installmentConfig.minInstallmentValue,
              acceptedBrands: getAcceptedBrands(gatewayConfig.gatewayType),
              pixDiscount: gatewayConfig.pixDiscount,
              boletoDiscount: gatewayConfig.boletoDiscount,
              acceptCreditCard: gatewayConfig.acceptCreditCard,
              acceptPix: gatewayConfig.acceptPix,
              acceptBoleto: gatewayConfig.acceptBoleto,
            } : undefined}
            dynamicInstallments={dynamicInstallments}
          />
        )}
      </div>

      {/* Modal de Busca de CEP */}
      <CepSearchModal
        open={showCepSearchModal}
        onOpenChange={setShowCepSearchModal}
        onSelectCep={handleCepSelected}
      />
    </div>
  );
}
