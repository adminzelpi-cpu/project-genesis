export const SocialProof = () => {
  const metrics = [
    { value: "500+", label: "Lojas ativas" },
    { value: "50k+", label: "Pedidos processados" },
    { value: "R$ 2M+", label: "Em vendas" },
    { value: "4.9★", label: "Avaliação" },
  ];

  return (
    <section className="py-10 border-y border-border/60">
      <div className="container mx-auto px-6">
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
          {metrics.map((m, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">{m.value}</span>
              <span className="text-sm text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
