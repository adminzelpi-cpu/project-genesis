import { buildAdminUrl } from "@/lib/adminUrl";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Crie sua loja",
    desc: "Cadastro rápido. Em minutos sua loja já está no ar com domínio próprio.",
  },
  {
    num: "02",
    title: "Adicione produtos",
    desc: "Fotos, variações, preços e estoque — tudo num editor simples e direto.",
  },
  {
    num: "03",
    title: "Ative as automações",
    desc: "Chat IA, WhatsApp e e-mail marketing funcionando automaticamente.",
  },
  {
    num: "04",
    title: "Venda no automático",
    desc: "Receba pedidos, recupere carrinhos e fidelize clientes sem esforço.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="como-funciona" className="py-24 px-6 bg-muted/40">
      <div className="container mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="text-sm font-semibold text-primary mb-2 tracking-wide uppercase">
            Como funciona
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
            Do zero à primeira venda
            <br />
            em poucos minutos.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              <span className="text-5xl font-black text-border/60 select-none leading-none">
                {s.num}
              </span>
              <h3 className="text-base font-bold text-foreground mt-3 mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <a href={buildAdminUrl("/auth")}>
          <Button size="lg" className="text-base px-7 py-6 font-semibold">
            Criar minha loja
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </a>
      </div>
    </section>
  );
};
