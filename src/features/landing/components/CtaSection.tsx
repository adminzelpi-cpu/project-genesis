import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { buildAdminUrl } from "@/lib/adminUrl";

export const CtaSection = () => {
  return (
    <section className="py-24 px-6">
      <div className="container mx-auto">
        <div className="relative rounded-3xl bg-foreground overflow-hidden px-8 py-16 sm:px-16 sm:py-20 text-center">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-background leading-tight">
              Pronto pra vender mais
              <br />
              com menos esforço?
            </h2>
            <p className="text-background/60 text-base">
              Monte sua loja, ative as automações e deixe a Zelpi trabalhar por você.
            </p>

            <a href={buildAdminUrl("/auth")}>
              <Button
                size="lg"
                className="text-base px-8 py-6 font-semibold bg-background text-foreground hover:bg-background/90 mt-2"
              >
                Criar minha loja
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>

            <p className="text-xs text-background/40 pt-2">
              Setup em minutos • Suporte incluso
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
