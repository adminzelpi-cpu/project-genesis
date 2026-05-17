import { memo } from "react";
import { ShoppingBag, ArrowRight, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface CartSummaryItem {
  name: string;
  price: number;
  quantity: number;
  variant?: string;
}

interface ChatCartSummaryProps {
  items: CartSummaryItem[];
  total: number;
  accentColor: string;
  onCheckout: () => void;
  onAdjust: () => void;
}

export const ChatCartSummary = memo(({ items, total, accentColor, onCheckout, onAdjust }: ChatCartSummaryProps) => {
  return (
    <div className="ml-9 mt-2 rounded-xl border bg-background shadow-sm overflow-hidden max-w-[300px]">
      {/* Header */}
      <div className="px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Resumo do Pedido</span>
        </div>
      </div>

      {/* Items */}
      <div className="px-3 py-2 space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-start gap-2 text-[11px]">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}
              </p>
              {item.variant && (
                <p className="text-muted-foreground text-[10px]">{item.variant}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
              {item.quantity > 1 && (
                <p className="text-muted-foreground text-[10px]">{formatCurrency(item.price)} cada</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="px-3 py-2 border-t bg-muted/30">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold">Total</span>
          <span className="text-sm font-bold">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t flex gap-2">
        <button
          onClick={onAdjust}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          <Pencil className="h-3 w-3" />
          Ajustar
        </button>
        <button
          onClick={onCheckout}
          className="flex-[2] flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          Finalizar compra
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
});

ChatCartSummary.displayName = "ChatCartSummary";
