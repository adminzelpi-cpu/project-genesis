import React from 'react';
import { Lock, Store } from 'lucide-react';
import { useStorefront } from '@/features/storefront/hooks/useStorefront';
import { Link } from 'react-router-dom';
import { useStoreSlug, useStorePath } from '@/contexts/StoreSlugContext';

export const CheckoutHeader = () => {
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const { store } = useStorefront(storeSlug);

  return (
    <header className="bg-background border-b border-checkout-border">
      <div className="container mx-auto px-4 py-4 max-w-[700px] lg:max-w-[1200px]">
        <div className="flex items-center justify-between">
          <Link to={buildPath("/")} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            {store?.logo_url ? (
              <img
                src={store.logo_url}
                alt={`Logo ${store.name}`}
                className="h-10 w-auto max-w-[160px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'hsl(var(--store-primary, var(--primary)))' }}
                >
                  <Store className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-foreground">{store?.name || 'Loja'}</h1>
              </div>
            )}
          </Link>
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Lock className="w-4 h-4" />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold">COMPRA</span>
              <span className="font-semibold">100% SEGURA</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
