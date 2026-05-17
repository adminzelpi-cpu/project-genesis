import { Check, X } from "lucide-react";

const rows = [
  { feature: "Chat IA vendedor 24h", zelpi: true, others: false },
  { feature: "WhatsApp Marketing", zelpi: true, others: "Pago à parte" },
  { feature: "E-mails automáticos", zelpi: true, others: "Pago à parte" },
  { feature: "PIX, Cartão e Boleto", zelpi: true, others: "Parcial" },
  { feature: "Checkout otimizado", zelpi: true, others: false },
  { feature: "Temas responsivos", zelpi: true, others: true },
  { feature: "Produtos ilimitados", zelpi: true, others: "Depende do plano" },
  { feature: "Dashboard analítico", zelpi: true, others: true },
];

export const Comparison = () => {
  const renderCell = (v: boolean | string) => {
    if (v === true)
      return <Check className="w-4 h-4 text-primary mx-auto" />;
    if (v === false)
      return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
    return <span className="text-xs text-muted-foreground">{v}</span>;
  };

  return (
    <section id="comparison" className="py-24 px-6">
      <div className="container mx-auto">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-semibold text-primary mb-2 tracking-wide uppercase">
            Comparativo
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
            O que outras plataformas
            <br />
            não oferecem.
          </h2>
        </div>

        <div className="max-w-2xl">
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-muted/50 border-b border-border">
              <span>Recurso</span>
              <span className="text-center text-primary">Zelpi</span>
              <span className="text-center">Outros</span>
            </div>

            {rows.map((r, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_80px_80px] items-center px-5 py-3 text-sm ${
                  i !== rows.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <span className="text-foreground">{r.feature}</span>
                <div className="flex justify-center">{renderCell(r.zelpi)}</div>
                <div className="flex justify-center">{renderCell(r.others)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
