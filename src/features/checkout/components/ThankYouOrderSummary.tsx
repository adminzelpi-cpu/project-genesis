import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, MapPin, Package, ShoppingBag } from "lucide-react";
import { useState } from "react";

export interface OrderProduct {
  id: string;
  name: string;
  variant?: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ShippingInfo {
  methodName?: string;
  carrier?: string;
  deliveryDays?: number;
}

interface ThankYouOrderSummaryProps {
  products: OrderProduct[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  address?: DeliveryAddress;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  /** @deprecated Use defaultExpanded instead based on payment method */
  paymentMethod?: string;
}

export function ThankYouOrderSummary({
  products,
  subtotal,
  shipping,
  discount = 0,
  total,
  address,
  collapsible = true,
  defaultExpanded = false,
}: ThankYouOrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const itemCount = products.reduce((sum, p) => sum + p.quantity, 0);

  const ProductsAndTotals = () => (
    <>
      {/* Products List */}
      <div className="space-y-3">
        {products.map((product) => (
          <div key={`${product.id}-${product.variant}`} className="flex gap-3">
            <div className="w-14 h-14 lg:w-16 lg:h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                  <Package className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <p className="font-medium text-sm leading-tight text-foreground line-clamp-2">
                {product.name}
              </p>
              {product.variant && (
                <p className="text-xs text-muted-foreground mt-0.5">{product.variant}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                Qtd: {product.quantity}
              </p>
            </div>
            <div className="flex flex-col items-end justify-end flex-shrink-0">
              <p className="font-semibold text-sm text-foreground whitespace-nowrap">
                {formatPrice(product.price * product.quantity)}
              </p>
              {product.quantity > 1 && (
                <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatPrice(product.price)} cada
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-4 pt-4 border-t space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Desconto</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Entrega</span>
          <span className={shipping === 0 ? "text-green-600 font-medium" : "text-foreground"}>
            {shipping === 0 ? "Grátis" : formatPrice(shipping)}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-semibold text-foreground text-base">{formatPrice(total)}</span>
        </div>
      </div>
    </>
  );

  if (!collapsible) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base lg:text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="hidden sm:inline">Resumo do Pedido</span>
            <span className="sm:hidden">Resumo</span>
            <span className="text-muted-foreground text-sm font-normal ml-auto">
              {itemCount} {itemCount === 1 ? "item" : "itens"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductsAndTotals />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="pb-4">
            <CardTitle className="text-base lg:text-lg flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ShoppingBag className="w-5 h-5 shrink-0" />
                <span className="hidden sm:inline">Resumo do Pedido</span>
                <span className="sm:hidden">Resumo</span>
                <span className="text-muted-foreground text-sm font-normal whitespace-nowrap">
                  {itemCount} {itemCount === 1 ? "item" : "itens"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary font-semibold">{formatPrice(total)}</span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ProductsAndTotals />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/** Separate delivery address card */
export function ThankYouDeliveryAddress({
  address,
  shippingInfo,
}: {
  address: DeliveryAddress;
  shippingInfo?: ShippingInfo;
}) {
  const hasShipping = !!(shippingInfo?.methodName || shippingInfo?.carrier || shippingInfo?.deliveryDays);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base lg:text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <span>Endereço de Entrega</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p className="text-foreground font-medium">
            {address.street}, {address.number}
            {address.complement && ` - ${address.complement}`}
          </p>
          <p>{address.neighborhood}</p>
          <p>
            {address.city} - {address.state}
          </p>
          <p>CEP: {address.zipCode}</p>
        </div>
        {hasShipping && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Forma de envio
            </p>
            <p className="text-sm text-foreground font-medium">
              {shippingInfo?.methodName || "Entrega"}
              {shippingInfo?.carrier && shippingInfo.carrier !== shippingInfo.methodName
                ? ` · ${shippingInfo.carrier}`
                : ""}
            </p>
            {shippingInfo?.deliveryDays != null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Prazo estimado: {shippingInfo.deliveryDays}{" "}
                {shippingInfo.deliveryDays === 1 ? "dia útil" : "dias úteis"}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
