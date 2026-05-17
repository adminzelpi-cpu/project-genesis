import React, { useState, useEffect } from 'react';
import { MapPin, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCheckout } from './CheckoutContext';
import { ShippingSelector } from './ShippingSelector';
import { ShippingQuote, ShippingItem } from '@/features/shipping';
import { useCart } from '@/contexts/CartContext';

interface AddressConfirmationCardProps {
  storeId?: string;
  defaultShippingCost?: number;
  freeShippingThreshold?: number | null;
  onEdit: () => void;
  selectedShippingQuote: ShippingQuote | null;
  onSelectShippingQuote: (quote: ShippingQuote | null) => void;
  onShippingLoadingChange?: (isLoading: boolean) => void;
}

export function AddressConfirmationCard({
  storeId,
  defaultShippingCost,
  freeShippingThreshold,
  onEdit,
  selectedShippingQuote,
  onSelectShippingQuote,
  onShippingLoadingChange,
}: AddressConfirmationCardProps) {
  const { checkoutData } = useCheckout();
  const { items: cartItems } = useCart();
  const { deliveryAddress } = checkoutData;

  // Prepare items for shipping calculation
  const shippingItems: ShippingItem[] = cartItems.map(item => ({
    weight: 0.3,
    length: 20,
    height: 5,
    width: 15,
    quantity: item.quantity,
    price: item.price,
  }));

  const formatAddress = () => {
    const parts = [];
    
    if (deliveryAddress.street) {
      parts.push(deliveryAddress.street);
    }
    if (deliveryAddress.number) {
      parts.push(deliveryAddress.number);
    }
    if (deliveryAddress.complement) {
      parts.push(deliveryAddress.complement);
    }
    
    const line1 = parts.join(', ');
    const line2 = `${deliveryAddress.neighborhood} - ${deliveryAddress.city}/${deliveryAddress.state}`;
    const cep = deliveryAddress.zipCode;
    
    return { line1, line2, cep };
  };

  const address = formatAddress();

  return (
    <div className="space-y-4">
      {/* Address Card */}
      <div className="border border-foreground rounded-lg p-4 bg-foreground/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-foreground bg-foreground flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-background" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-sm">
                  {address.line1}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {address.line2}
              </p>
              <p className="text-xs text-muted-foreground">
                CEP: {address.cep}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-muted-foreground hover:text-foreground underline flex-shrink-0"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Shipping Selector */}
      {storeId && deliveryAddress.zipCode && (
        <div className="space-y-3">
          <ShippingSelector
            storeId={storeId}
            destinationCep={deliveryAddress.zipCode}
            items={shippingItems}
            selectedQuote={selectedShippingQuote}
            onSelectQuote={onSelectShippingQuote}
            defaultShippingCost={defaultShippingCost}
            freeShippingThreshold={freeShippingThreshold}
            onLoadingChange={onShippingLoadingChange}
          />
        </div>
      )}
    </div>
  );
}
