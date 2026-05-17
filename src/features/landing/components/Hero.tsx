import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { buildAdminUrl } from "@/lib/adminUrl";

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.04),transparent_60%)]" />
      
      <div className="container relative z-10 mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div className="space-y-8">
            <div className="space-y-5">
              <h1 className="text-[2.75rem] sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight text-foreground">
                Sua loja com um
                <span className="block mt-1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  vendedor que nunca dorme.
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                A Zelpi combina e-commerce com inteligência artificial para vender,
                atender e recuperar clientes automaticamente — no chat, WhatsApp e e-mail.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a href={buildAdminUrl("/auth")}>
                <Button size="lg" className="w-full sm:w-auto text-base px-7 py-6 font-semibold">
                  Começar agora
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto text-base px-7 py-6 gap-2 text-muted-foreground"
                onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="w-4 h-4" />
                Como funciona
              </Button>
            </div>

            {/* Micro social proof */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-2">
                {[
                  "bg-primary/80",
                  "bg-emerald-500/80",
                  "bg-amber-500/80",
                  "bg-rose-500/80",
                ].map((bg, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-background flex items-center justify-center text-[10px] font-bold text-white`}>
                    {["M", "A", "R", "L"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">500+</span> lojistas já vendem com a Zelpi
              </p>
            </div>
          </div>

          {/* Right: Visual element — abstract product card stack */}
          <div className="relative hidden lg:block">
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Background card */}
              <div className="absolute top-8 left-8 right-0 bottom-0 rounded-2xl bg-muted/60 border border-border" />
              
              {/* Main card — Chat simulation */}
              <div className="relative rounded-2xl bg-card border border-border shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-sm font-bold">Z</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Assistente Zelpi</p>
                    <p className="text-xs text-muted-foreground">Online agora</p>
                  </div>
                  <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                {/* Chat messages */}
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm max-w-[75%]">
                      Quero uma polo tamanho M, tem?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 text-sm max-w-[80%] text-foreground">
                      Temos sim! A Polo Classic em M está disponível. Com PIX, sai por <span className="font-semibold text-primary">R$ 89,90</span> com 10% off. Quer finalizar?
                    </div>
                  </div>
                </div>

                {/* Mini product card inside chat */}
                <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3 border border-border/50">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
                    <span className="text-2xl">👕</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Polo Classic — M</p>
                    <p className="text-xs text-muted-foreground">Frete grátis para SP</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">R$ 89,90</p>
                    <p className="text-[10px] text-muted-foreground line-through">R$ 99,90</p>
                  </div>
                </div>

                <Button size="sm" className="w-full text-sm font-medium">
                  Finalizar compra
                </Button>
              </div>

              {/* Floating notification */}
              <div className="absolute -bottom-4 -left-4 bg-card rounded-xl border border-border shadow-md px-4 py-3 flex items-center gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-emerald-600 text-sm">✓</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Venda recuperada</p>
                  <p className="text-[10px] text-muted-foreground">via WhatsApp • agora</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
