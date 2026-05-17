import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Check, X, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCheckout } from './CheckoutContext';
import { useCart } from '@/contexts/CartContext';
import { saveAbandonedCart } from '@/features/abandoned-carts';
import { useCustomerLookup } from '@/features/checkout/hooks/useCustomerLookup';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StepPersonalDataProps {
  onNext: () => void;
  storeId?: string;
}

export const StepPersonalData: React.FC<StepPersonalDataProps> = ({ onNext, storeId }) => {
  const { checkoutData, updatePersonalData, setRecognizedCustomer, recognizedCustomer } = useCheckout();
  const { items, total } = useCart();
  const { personalData } = checkoutData;
  const [validationState, setValidationState] = useState<Record<string, { isValid: boolean | null; errorType?: 'empty' | 'invalid' }>>({
    email: { isValid: null },
    fullName: { isValid: null },
    phone: { isValid: null },
    cpf: { isValid: null }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const abandonedCartSavedRef = useRef<string | null>(null);
  const lastLookedUpCpfRef = useRef<string | null>(null);

  // Customer lookup by CPF
  const { data: customerData, isFetching: isLookingUp } = useCustomerLookup(storeId, personalData.cpf);

  // When customer is found by CPF, store in context and optionally pre-fill empty fields
  useEffect(() => {
    if (customerData && lastLookedUpCpfRef.current !== customerData.cpf) {
      lastLookedUpCpfRef.current = customerData.cpf;
      
      // Store recognized customer in context
      setRecognizedCustomer(customerData);
      
      console.log('[StepPersonalData] Customer recognized by CPF:', customerData.id);
      
      // Only pre-fill fields that are currently empty
      const updates: Partial<typeof personalData> = {};
      
      if (!personalData.email && customerData.email) {
        updates.email = customerData.email;
      }
      if (!personalData.fullName && customerData.nome) {
        updates.fullName = customerData.nome;
      }
      if (!personalData.phone && customerData.telefone) {
        updates.phone = formatPhone(customerData.telefone);
      }
      
      if (Object.keys(updates).length > 0) {
        updatePersonalData(updates);
        
        // Update validation state for pre-filled fields
        const newValidation: Record<string, { isValid: boolean }> = {};
        if (updates.email) newValidation.email = { isValid: validateEmail(updates.email) };
        if (updates.fullName) newValidation.fullName = { isValid: validateFullName(updates.fullName) };
        if (updates.phone) newValidation.phone = { isValid: validatePhone(updates.phone) };
        
        setValidationState(prev => ({ ...prev, ...newValidation }));
      }
      
      // Re-save abandoned cart with customer_id so phone/data is linked
      const email = updates.email || personalData.email;
      if (email && storeId) {
        // Privacy guard: only attach customer_id if the email being used in this
        // checkout matches the recognized customer's email. Otherwise, this is a
        // different person (or same user using a different email) and we must NOT
        // leak the recognized customer's CPF/phone via the recovery link.
        const emailMatchesCustomer =
          customerData.email &&
          customerData.email.trim().toLowerCase() === email.trim().toLowerCase();

        // Reset the ref to force re-save with customer_id
        abandonedCartSavedRef.current = null;
        const cartItems = items.map(item => ({
          product_id: item.id,
          variation_id: item.variationId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image,
          variation: item.variant,
        }));
        const phoneClean = (updates.phone || personalData.phone || '').replace(/\D/g, '');
        saveAbandonedCart({
          store_id: storeId,
          customer_email: email,
          customer_name: updates.fullName || personalData.fullName || customerData.nome || undefined,
          customer_id: emailMatchesCustomer ? customerData.id : undefined,
          customer_phone: phoneClean || undefined,
          cart_items: cartItems,
          cart_total: total,
        }).then(result => {
          if (result) {
            abandonedCartSavedRef.current = `${email}|${updates.fullName || personalData.fullName || ''}`;
            console.log(
              '[StepPersonalData] Abandoned cart updated. customer_id linked:',
              emailMatchesCustomer ? customerData.id : 'no (email mismatch)'
            );
          }
        });
      }
    }
  }, [customerData]);

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

  const handleInputChange = (field: keyof typeof personalData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = e.target.value;
    
    if (field === 'phone') {
      value = formatPhone(value);
    } else if (field === 'cpf') {
      value = formatCPF(value);
    }
    
    updatePersonalData({ [field]: value });
    
    let isValid = false;
    
    if (field === 'email') {
      isValid = validateEmail(value);
      // Don't save on typing - save on blur only to avoid partial emails (e.g. gmail.co)
    } else if (field === 'fullName') {
      isValid = validateFullName(value);
    } else if (field === 'phone') {
      isValid = validatePhone(value);
    } else if (field === 'cpf') {
      isValid = validateCPF(value);
    }
    
    if (isValid) {
      setValidationState(prev => ({ ...prev, [field]: { isValid: true } }));
    } else if (validationState[field].isValid === true) {
      setValidationState(prev => ({ ...prev, [field]: { isValid: null } }));
    }
  };

  // Save abandoned cart when email is valid (stricter check to avoid partial emails like .co)
  const isStrictValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email);

  const saveCartAsAbandoned = async (email: string, name?: string) => {
    if (!storeId || !email || !isStrictValidEmail(email)) return;
    
    // Skip if same email+name combo already saved
    const key = `${email}|${name || ''}`;
    if (abandonedCartSavedRef.current === key) return;
    
    try {
      const cartItems = items.map(item => ({
        product_id: item.id,
        variation_id: item.variationId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image_url: item.image,
        variation: item.variant,
      }));

      const phoneClean = (personalData.phone || '').replace(/\D/g, '');
      const result = await saveAbandonedCart({
        store_id: storeId,
        customer_email: email,
        customer_name: name || personalData.fullName || undefined,
        customer_id: recognizedCustomer?.id || undefined,
        customer_phone: phoneClean || undefined,
        cart_items: cartItems,
        cart_total: total,
      });
      
      if (result) {
        abandonedCartSavedRef.current = key;
        console.log('[StepPersonalData] Abandoned cart saved for:', email);
      }
    } catch (error) {
      console.error('[StepPersonalData] Error saving abandoned cart:', error);
    }
  };

  const handleBlur = (field: keyof typeof personalData) => {
    const value = checkoutData.personalData[field];
    let isEmpty = !value || value.trim() === '';
    
    if (field === 'phone' || field === 'cpf') {
      const cleanValue = value.replace(/\D/g, '');
      isEmpty = !cleanValue || cleanValue.length === 0;
      
      if (field === 'cpf' && cleanValue.length > 0 && cleanValue.length < 11) {
        setValidationState(prev => ({ ...prev, [field]: { isValid: false, errorType: 'empty' } }));
        return;
      }
    }
    
    let isValid = false;
    
    if (isEmpty) {
      setValidationState(prev => ({ ...prev, [field]: { isValid: false, errorType: 'empty' } }));
      return;
    }
    
    switch (field) {
      case 'email':
        isValid = validateEmail(value);
        if (isValid) {
          saveCartAsAbandoned(value);
        }
        break;
      case 'fullName':
        isValid = validateFullName(value);
        // Update abandoned cart with name
        if (isValid && checkoutData.personalData.email && validateEmail(checkoutData.personalData.email)) {
          saveCartAsAbandoned(checkoutData.personalData.email, value);
        }
        break;
      case 'phone':
        isValid = validatePhone(value);
        // Re-save abandoned cart so phone is persisted even for new (non-existing) customers
        if (isValid && checkoutData.personalData.email && validateEmail(checkoutData.personalData.email)) {
          // Force re-save (phone changed) by clearing the dedupe key
          abandonedCartSavedRef.current = null;
          saveCartAsAbandoned(checkoutData.personalData.email, checkoutData.personalData.fullName);
        }
        break;
      case 'cpf':
        isValid = validateCPF(value);
        if (isValid && checkoutData.personalData.email && validateEmail(checkoutData.personalData.email)) {
          abandonedCartSavedRef.current = null;
          saveCartAsAbandoned(checkoutData.personalData.email, checkoutData.personalData.fullName);
        }
        break;
    }

    setValidationState(prev => ({ ...prev, [field]: { isValid, errorType: isValid ? undefined : 'invalid' } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newValidationState: Record<string, { isValid: boolean; errorType?: 'empty' | 'invalid' }> = {};
    
    Object.keys(checkoutData.personalData).forEach((field) => {
      const key = field as keyof typeof personalData;
      const value = checkoutData.personalData[key];
      let isEmpty = !value || value.trim() === '';
      
      if (key === 'phone' || key === 'cpf') {
        const cleanValue = value.replace(/\D/g, '');
        isEmpty = !cleanValue || cleanValue.length === 0;
        
        if (key === 'cpf' && cleanValue.length > 0 && cleanValue.length < 11) {
          newValidationState[key] = { isValid: false, errorType: 'empty' };
          return;
        }
      }
      
      if (isEmpty) {
        newValidationState[key] = { isValid: false, errorType: 'empty' };
        return;
      }
      
      let isValid = false;
      switch (key) {
        case 'email':
          isValid = validateEmail(value);
          break;
        case 'fullName':
          isValid = validateFullName(value);
          break;
        case 'phone':
          isValid = validatePhone(value);
          break;
        case 'cpf':
          isValid = validateCPF(value);
          break;
      }
      
      newValidationState[key] = { isValid, errorType: isValid ? undefined : 'invalid' };
    });
    
    setValidationState(newValidationState);
    
    if (Object.values(newValidationState).every(v => v.isValid === true)) {
      setIsLoading(true);
      
      // Save newsletter subscription if opted in
      if (newsletterOptIn && storeId && checkoutData.personalData.email) {
        try {
          await supabase
            .from('newsletter_subscribers')
            .upsert(
              {
                store_id: storeId,
                email: checkoutData.personalData.email.trim().toLowerCase(),
                name: checkoutData.personalData.fullName || null,
                source: 'checkout',
                consented_at: new Date().toISOString(),
              },
              { onConflict: 'store_id,email' }
            );
        } catch (err) {
          console.error('Newsletter subscription error:', err);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 400));
      setIsLoading(false);
      onNext();
    }
  };

  return (
    <div className="md:bg-background md:border md:border-checkout-border md:rounded-lg md:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background text-sm font-bold">
            1
          </span>
          Identificação
        </h2>
        <p className="text-sm text-muted-foreground">
          Preencha seus dados para continuar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-checkout-title">E-mail</Label>
          <div className="relative mt-1">
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={personalData.email}
              onChange={handleInputChange('email')}
              onBlur={() => handleBlur('email')}
              required
              className={cn(
                "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                validationState.email.isValid === false && "border-checkout-error"
              )}
            />
            {validationState.email.isValid !== null && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validationState.email.isValid === true ? (
                  <Check className="w-4 h-4 text-checkout-success" />
                ) : (
                  <X className="w-4 h-4 text-checkout-error" />
                )}
              </div>
            )}
          </div>
          {validationState.email.isValid === false && (
            <p className="text-xs text-checkout-error mt-1">
              {validationState.email.errorType === 'empty' 
                ? 'Preencha este campo' 
                : 'E-mail inválido'}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="fullName" className="text-sm font-medium text-checkout-title">Nome Completo</Label>
          <div className="relative mt-1">
            <Input
              id="fullName"
              placeholder="Ex: João Silva"
              value={personalData.fullName}
              onChange={handleInputChange('fullName')}
              onBlur={() => handleBlur('fullName')}
              required
              className={cn(
                "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                validationState.fullName.isValid === false && "border-checkout-error"
              )}
            />
            {validationState.fullName.isValid !== null && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validationState.fullName.isValid === true ? (
                  <Check className="w-4 h-4 text-checkout-success" />
                ) : (
                  <X className="w-4 h-4 text-checkout-error" />
                )}
              </div>
            )}
          </div>
          {validationState.fullName.isValid === false && (
            <p className="text-xs text-checkout-error mt-1">
              {validationState.fullName.errorType === 'empty' 
                ? 'Preencha este campo' 
                : 'Digite seu nome completo'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-checkout-title">Celular/WhatsApp</Label>
            <div className="relative mt-1">
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={personalData.phone}
                onChange={handleInputChange('phone')}
                onBlur={() => handleBlur('phone')}
                required
                inputMode="numeric"
                className={cn(
                  "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                  validationState.phone.isValid === false && "border-checkout-error"
                )}
              />
              {validationState.phone.isValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validationState.phone.isValid === true ? (
                    <Check className="w-4 h-4 text-checkout-success" />
                  ) : (
                    <X className="w-4 h-4 text-checkout-error" />
                  )}
                </div>
              )}
            </div>
            {validationState.phone.isValid === false && (
              <p className="text-xs text-checkout-error mt-1">
                {validationState.phone.errorType === 'empty' 
                  ? 'Preencha este campo' 
                  : 'Celular inválido. Digite DDD + 9 dígitos'}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="cpf" className="text-sm font-medium text-checkout-title">CPF</Label>
            <div className="relative mt-1">
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={personalData.cpf}
                onChange={handleInputChange('cpf')}
                onBlur={() => handleBlur('cpf')}
                required
                inputMode="numeric"
                className={cn(
                  "pr-10 border-checkout-border focus:border-checkout-focus placeholder:text-checkout-placeholder text-sm",
                  validationState.cpf.isValid === false && "border-checkout-error"
                )}
              />
              {validationState.cpf.isValid !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {validationState.cpf.isValid === true ? (
                    <Check className="w-4 h-4 text-checkout-success" />
                  ) : (
                    <X className="w-4 h-4 text-checkout-error" />
                  )}
                </div>
              )}
            </div>
            {validationState.cpf.isValid === false && (
              <p className="text-xs text-checkout-error mt-1">
                {validationState.cpf.errorType === 'empty' 
                  ? 'Digite 11 dígitos' 
                  : 'CPF inválido'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-3 pt-2">
          <Checkbox
            id="newsletter-optin"
            checked={newsletterOptIn}
            onCheckedChange={(checked) => setNewsletterOptIn(checked === true)}
            className="mt-0.5 border-checkout-border data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
          />
          <label
            htmlFor="newsletter-optin"
            className="text-xs text-muted-foreground leading-relaxed cursor-pointer select-none"
          >
            Quero receber ofertas e novidades por e-mail
          </label>
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 flex items-center justify-center space-x-2 font-medium text-sm transition-all disabled:opacity-100 hover:opacity-90 hover:brightness-95"
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
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-medium">PROCESSANDO...</span>
              </>
            ) : (
              <>
                <span className="font-medium">CONTINUAR</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};