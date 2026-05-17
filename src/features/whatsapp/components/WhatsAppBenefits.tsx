import { Bot, ShoppingCart, Megaphone, Package } from "lucide-react";

const benefits = [
  {
    icon: Bot,
    title: "Vendedor IA 24/7",
    description: "Responde dúvidas, recomenda produtos e fecha vendas no WhatsApp automaticamente.",
  },
  {
    icon: ShoppingCart,
    title: "Recuperação automática",
    description: "Carrinho abandonado, PIX expirado e clientes inativos voltam a comprar sem você fazer nada.",
  },
  {
    icon: Megaphone,
    title: "Marketing inteligente",
    description: "Campanhas segmentadas, upsell pós-compra e reativação para aumentar o LTV.",
  },
  {
    icon: Package,
    title: "Pós-venda automatizado",
    description: "Confirmação, pagamento, envio, rastreio e NPS direto na conversa do cliente.",
  },
];

export function WhatsAppBenefits() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {benefits.map((b) => (
        <div
          key={b.title}
          className="flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-[#25D366]/40"
        >
          <div className="h-9 w-9 shrink-0 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
            <b.icon className="h-4 w-4 text-[#25D366]" />
          </div>
          <div>
            <div className="font-medium text-sm">{b.title}</div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{b.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
