import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storeKey } from '@/lib/storeStorageKeys';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
  variationId?: string;
  color?: string;
  size?: string;
  slug?: string;
  productCode?: number;
  colorCode?: number;
  sizeCode?: number;
  /** Mirrors product.display_variations_separately at add-to-cart time so
   *  downstream events (InitiateCheckout, AddPaymentInfo, Purchase) build the
   *  correct Meta `content_ids` group without re-fetching. */
  displaySeparately?: boolean;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, options?: { skipCartOpen?: boolean }) => void;
  removeItem: (id: string, variant?: string, variationId?: string) => void;
  updateQuantity: (id: string, quantity: number, variant?: string, variationId?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  onCartOpen?: () => void;
  setOnCartOpen: (callback: () => void) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const BASE_CART_KEY = 'shopping-cart';

function getCartStorageKey(): string {
  return storeKey(BASE_CART_KEY);
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track the current storage key so we can react to store changes
  const [storageKey, setStorageKey] = useState(getCartStorageKey);

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem(getCartStorageKey());
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });
  const [onCartOpen, setOnCartOpen] = useState<(() => void) | undefined>();

  // Detect store changes on navigation (SPA route changes)
  useEffect(() => {
    const checkStoreChange = () => {
      const newKey = getCartStorageKey();
      if (newKey !== storageKey) {
        setStorageKey(newKey);
        try {
          const savedCart = localStorage.getItem(newKey);
          setItems(savedCart ? JSON.parse(savedCart) : []);
        } catch {
          setItems([]);
        }
      }
    };

    // Listen for popstate (back/forward) and also poll on interval
    // to catch programmatic navigations
    window.addEventListener('popstate', checkStoreChange);
    const interval = setInterval(checkStoreChange, 1000);

    return () => {
      window.removeEventListener('popstate', checkStoreChange);
      clearInterval(interval);
    };
  }, [storageKey]);

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [items, storageKey]);

  // Sync across tabs for the same store
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const updatedCart = JSON.parse(e.newValue);
          setItems(updatedCart);
        } catch (error) {
          console.error('Failed to sync cart from other tab:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, options?: { skipCartOpen?: boolean }) => {
    setItems(prev => {
      const existing = prev.find(i => {
        if (item.variationId && i.variationId) {
          return i.variationId === item.variationId;
        }
        return i.id === item.id && i.variant === item.variant;
      });
      
      if (existing) {
        return prev.map(i => {
          const isMatch = item.variationId && i.variationId 
            ? i.variationId === item.variationId
            : i.id === item.id && i.variant === item.variant;
          
          return isMatch ? { ...i, quantity: i.quantity + 1 } : i;
        });
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    
    if (onCartOpen && !options?.skipCartOpen) {
      onCartOpen();
    }
  }, [onCartOpen]);

  const removeItem = useCallback((id: string, variant?: string, variationId?: string) => {
    setItems(prev => prev.filter(i => {
      if (variationId && i.variationId) {
        return i.variationId !== variationId;
      }
      if (variant) {
        return !(i.id === id && i.variant === variant);
      }
      return i.id !== id;
    }));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number, variant?: string, variationId?: string) => {
    if (quantity <= 0) {
      removeItem(id, variant, variationId);
      return;
    }
    setItems(prev => prev.map(i => {
      if (variationId && i.variationId) {
        return i.variationId === variationId ? { ...i, quantity } : i;
      }
      if (variant) {
        return (i.id === id && i.variant === variant) ? { ...i, quantity } : i;
      }
      return i.id === id ? { ...i, quantity } : i;
    }));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, onCartOpen, setOnCartOpen: (cb) => setOnCartOpen(() => cb) }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
