import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { storeKey } from '@/lib/storeStorageKeys';
import { getStoredCustomerSession } from '@/features/auth/hooks/useCustomerAuth';

interface PersonalData {
  email: string;
  fullName: string;
  phone: string;
  cpf: string;
}

interface ShippingQuote {
  service_code: string;
  service_name: string;
  carrier: string;
  price: number;
  delivery_time: number;
  is_free: boolean;
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

interface DeliveryAddress {
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  recipient: string;
  shippingMethod: string;
  shippingPrice: number | undefined;
  shippingQuote: ShippingQuote | null;
  observations: string;
  orderNotes: string;
  noNumber: boolean;
  savedAddressId?: string; // ID of saved address if selected
}

interface PaymentMethod {
  type: 'credit_card' | 'pix' | 'boleto';
  cardNumber?: string;
  cardName?: string;
  cardExpiry?: string;
  cardCvv?: string;
  expiryDate?: string;
  cvv?: string;
  installments?: number;
}

interface CheckoutData {
  personalData: PersonalData;
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
}

// Customer recognized by CPF
interface RecognizedCustomer {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  addresses: SavedAddress[];
}

interface CheckoutContextType {
  checkoutData: CheckoutData;
  updatePersonalData: (data: Partial<PersonalData>) => void;
  updateDeliveryAddress: (data: Partial<DeliveryAddress>) => void;
  updatePaymentMethod: (data: Partial<PaymentMethod>) => void;
  orderSummaryExpanded: boolean;
  setOrderSummaryExpanded: (expanded: boolean) => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  appliedDiscount: number;
  setAppliedDiscount: (discount: number) => void;
  appliedCouponId: string | null;
  setAppliedCouponId: (id: string | null) => void;
  recognizedCustomer: RecognizedCustomer | null;
  setRecognizedCustomer: (customer: RecognizedCustomer | null) => void;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

export const useCheckout = () => {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
};

interface CheckoutProviderProps {
  children: ReactNode;
}

// Data expiration in days
const CHECKOUT_DATA_EXPIRY_DAYS = 7;

const getDefaultCheckoutData = (): CheckoutData => ({
  personalData: {
    email: '',
    fullName: '',
    phone: '',
    cpf: '',
  },
  deliveryAddress: {
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    recipient: '',
    shippingMethod: '',
    shippingPrice: undefined,
    shippingQuote: null,
    observations: '',
    orderNotes: '',
    noNumber: false,
  },
  paymentMethod: {
    type: 'pix',
  },
});

interface StoredCheckoutData {
  data: CheckoutData;
  savedAt: number;
  lastCompletedStep: number;
}

// Session tracking helpers
const SESSION_REACHED_PAYMENT_KEY = 'checkout_reached_payment';

export const setReachedPayment = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(storeKey(SESSION_REACHED_PAYMENT_KEY), 'true');
  }
};

export const hasReachedPaymentInSession = (): boolean => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(storeKey(SESSION_REACHED_PAYMENT_KEY)) === 'true';
  }
  return false;
};

export const clearReachedPayment = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(storeKey(SESSION_REACHED_PAYMENT_KEY));
  }
};

// Validation helpers
export const isPersonalDataComplete = (data: PersonalData): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cpfClean = data.cpf?.replace(/\D/g, '') || '';
  const phoneClean = data.phone?.replace(/\D/g, '') || '';
  
  return !!(
    data.email && emailRegex.test(data.email) &&
    data.fullName && data.fullName.trim().split(' ').length >= 2 &&
    phoneClean.length >= 10 &&
    cpfClean.length === 11
  );
};

export const isDeliveryAddressComplete = (data: DeliveryAddress): boolean => {
  const cepClean = data.zipCode?.replace(/\D/g, '') || '';
  
  return !!(
    cepClean.length === 8 &&
    data.street &&
    (data.number || data.noNumber) &&
    data.neighborhood &&
    data.city &&
    data.state &&
    data.shippingMethod
  );
};

export const CheckoutProvider: React.FC<CheckoutProviderProps> = ({ children }) => {
  // Load from localStorage on mount with expiration check
  const [checkoutData, setCheckoutData] = useState<CheckoutData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storeKey('checkout_data_v2'));
      if (saved) {
        try {
          const parsed: StoredCheckoutData = JSON.parse(saved);
          const expiryMs = CHECKOUT_DATA_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          const isExpired = Date.now() - parsed.savedAt > expiryMs;
          
          if (!isExpired && parsed.data) {
            return parsed.data;
          } else {
            localStorage.removeItem(storeKey('checkout_data_v2'));
          }
        } catch (e) {
          console.error('Error parsing saved checkout data:', e);
          localStorage.removeItem(storeKey('checkout_data_v2'));
        }
      }
    }
    return getDefaultCheckoutData();
  });

  const [orderSummaryExpanded, setOrderSummaryExpanded] = useState(false);
  
  // Load coupon data from localStorage for cart->checkout persistence
  const [couponCode, setCouponCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storeKey('cart_coupon'));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.code || '';
        } catch (e) {
          return '';
        }
      }
    }
    return '';
  });
  
  const [appliedDiscount, setAppliedDiscount] = useState(() => {
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
  
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storeKey('cart_coupon'));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.id || null;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  
  const [recognizedCustomer, setRecognizedCustomer] = useState<RecognizedCustomer | null>(null);

  // Calculate last completed step for saving
  const getLastCompletedStep = (): number => {
    if (isDeliveryAddressComplete(checkoutData.deliveryAddress)) return 2;
    if (isPersonalDataComplete(checkoutData.personalData)) return 1;
    return 0;
  };

  // Pre-fill from store-isolated customer session if personalData is empty
  const authPrefillDone = useRef(false);
  useEffect(() => {
    if (authPrefillDone.current) return;
    if (checkoutData.personalData.email) return;
    const session = getStoredCustomerSession();
    if (!session) return;
    authPrefillDone.current = true;
    const email = session.email || '';
    const fullName = session.nome || '';
    if (email || fullName) {
      setCheckoutData(prev => ({
        ...prev,
        personalData: {
          ...prev.personalData,
          ...(email && !prev.personalData.email ? { email } : {}),
          ...(fullName && !prev.personalData.fullName ? { fullName } : {}),
        },
      }));
    }
  }, []);

  // Save to localStorage whenever checkoutData changes (with timestamp)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storageData: StoredCheckoutData = {
        data: checkoutData,
        savedAt: Date.now(),
        lastCompletedStep: getLastCompletedStep(),
      };
      localStorage.setItem(storeKey('checkout_data_v2'), JSON.stringify(storageData));
    }
  }, [checkoutData]);

  const updatePersonalData = (data: Partial<PersonalData>) => {
    setCheckoutData(prev => ({
      ...prev,
      personalData: { ...prev.personalData, ...data }
    }));
  };

  const updateDeliveryAddress = (data: Partial<DeliveryAddress>) => {
    setCheckoutData(prev => ({
      ...prev,
      deliveryAddress: { ...prev.deliveryAddress, ...data }
    }));
  };

  const updatePaymentMethod = (data: Partial<PaymentMethod>) => {
    setCheckoutData(prev => ({
      ...prev,
      paymentMethod: { ...prev.paymentMethod, ...data }
    }));
  };

  const value: CheckoutContextType = {
    checkoutData,
    updatePersonalData,
    updateDeliveryAddress,
    updatePaymentMethod,
    orderSummaryExpanded,
    setOrderSummaryExpanded,
    couponCode,
    setCouponCode,
    appliedDiscount,
    setAppliedDiscount,
    appliedCouponId,
    setAppliedCouponId,
    recognizedCustomer,
    setRecognizedCustomer,
  };

  return (
    <CheckoutContext.Provider value={value}>
      {children}
    </CheckoutContext.Provider>
  );
};
