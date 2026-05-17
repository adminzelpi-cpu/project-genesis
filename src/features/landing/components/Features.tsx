import {
  MessageSquare,
  Send,
  Mail,
  ShoppingCart,
  BarChart3,
  Palette,
  CreditCard,
  Package,
} from "lucide-react";

const pillars = [
  {
    tag: "Inteligência",
    title: "Vendedor IA 24h no chat da loja",
    description:
      "Um assistente treinado nos seus produtos que tira dúvidas, sugere tamanhos, calcula frete e leva o cliente até o checkout — sem você precisar estar online.",
    icon: MessageSquare,
    accent: "from-primary/10 to-primary/5",
    iconColor: "text-primary",
  },
  {
    tag: "Recuperação",
    title: "WhatsApp Marketing automático",
    description:
      "Recupere carrinhos abandonados, avise sobre PIX pendente e faça pós-venda automaticamente pelo WhatsApp — o canal onde seu cliente já está.",
    icon: Send,
    accent: "from-emerald-500/10 to-emerald-500/5",
    iconColor: "text-emerald-600",
  },
  {
    tag: "Engajamento",
    title: "E-mails que vendem sozinhos",
    description:
      "Automações de boas-vindas, carrinho abandonado, confirmação de pedido e mais. Tudo configurado e pronto pra converter sem esforço.",
    icon: Mail,
    accent: "from-amber-500/10 to-amber-500/5",
    iconColor: "text-amber-600",
  },
];

const extras = [
  {
    icon: ShoppingCart,
    title: "Checkout otimizado",
    desc: "Conversão alta com PIX, cartão e boleto integrados.",
  },
  {
    icon: BarChart3,
    title: "Dashboard completo",
    desc: "Métricas de vendas, conversão e comportamento.",
  },
  {
    icon: Palette,
    title: "Temas profissionais",
    desc: "Sua loja bonita, responsiva e personalizável.",
  },
  {
    icon: CreditCard,
    title: "Pagamentos flexíveis",
    desc: "Parcelamento, desconto no PIX e boleto.",
  },
  {
    icon: Package,
    title: "Gestão de produtos",
    desc: "Variações, estoque, fotos e SEO integrados.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 px-6">
      <div className="container mx-auto">
        {/* Section intro */}
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold text-primary mb-2 tracking-wide uppercase">
            Diferenciais
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
            Não é só uma loja.
            <br />
            É uma máquina de vendas.
          </h2>
        </div>

        {/* Main pillars — stacked cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {pillars.map((p, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:shadow-md hover:border-border/80"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center mb-5`}>
                <p.icon className={`w-5 h-5 ${p.iconColor}`} />
              </div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {p.tag}
              </span>
              <h3 className="text-lg font-bold text-foreground mb-2 leading-snug">
                {p.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>

        {/* Secondary features — compact row */}
        <div className="border-t border-border pt-12">
          <p className="text-sm font-semibold text-muted-foreground mb-8 uppercase tracking-wide">
            E também inclui
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {extras.map((e, i) => (
              <div key={i} className="flex gap-3">
                <e.icon className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {e.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
