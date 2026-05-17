import { ShoppingCart, Package } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface OrderProduct {
  id: string;
  name: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
}

interface RetryOrderSummaryProps {
  products: OrderProduct[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
}

const formatPrice = (price: number) =>
  price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ProductsList({ products }: { products: OrderProduct[] }) {
  return (
    <div className="space-y-4">
      {products.map((product, idx) => (
        <div
          key={`${product.id}-${product.variant || idx}`}
          className="flex gap-3 pb-4 border-b"
        >
          <div className="w-20 h-20 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="font-medium text-sm mb-1 line-clamp-2 leading-tight">
              {product.name}
            </h3>
            {product.variant && (
              <p className="text-sm text-muted-foreground mb-1">{product.variant}</p>
            )}
            <p className="text-sm text-muted-foreground">Qtd: {product.quantity}</p>
          </div>
          <div className="flex flex-col items-end justify-end">
            <p className="font-bold text-sm">{formatPrice(product.price * product.quantity)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Totals({ subtotal, shipping, discount = 0, total }: Omit<RetryOrderSummaryProps, "products">) {
  return (
    <div className="mt-4 pt-4 border-t border-checkout-border space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-checkout-muted">Subtotal</span>
        <span className="text-checkout-text">{formatPrice(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Desconto</span>
          <span>-{formatPrice(discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-checkout-muted">Entrega</span>
        <span className={shipping === 0 ? "text-green-600 font-medium" : "text-checkout-text"}>
          {shipping === 0 ? "Grátis" : formatPrice(shipping)}
        </span>
      </div>
      <div className="flex justify-between pt-2 border-t border-checkout-border">
        <span className="font-semibold text-checkout-text">Total</span>
        <span className="font-semibold text-checkout-text">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

export function RetryOrderSummary({ products, subtotal, shipping, discount = 0, total }: RetryOrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const itemCount = products.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <>
      {/* Mobile - Collapsible */}
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
                <span className="font-medium text-checkout-text">{formatPrice(total)}</span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-checkout-muted" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-checkout-muted" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <ProductsList products={products} />
                <Totals subtotal={subtotal} shipping={shipping} discount={discount} total={total} />
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
          <ProductsList products={products} />
          <Totals subtotal={subtotal} shipping={shipping} discount={discount} total={total} />
        </div>
      </div>
    </>
  );
}
