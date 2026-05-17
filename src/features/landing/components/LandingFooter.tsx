import { Link } from "react-router-dom";
import { buildAdminUrl } from "@/lib/adminUrl";
import logoZelpi from "@/assets/logo-zelpi-header.png";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <img src={logoZelpi} alt="Zelpi" className="h-7 w-auto object-contain" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              E-commerce inteligente para quem quer vender mais com menos esforço.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Produto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Diferenciais</a></li>
              <li><a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a></li>
              <li><a href={buildAdminUrl("/auth")} className="hover:text-foreground transition-colors">Criar loja</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-foreground transition-colors">Termos de uso</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Suporte</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/suporte" className="hover:text-foreground transition-colors">Central de ajuda</Link></li>
              <li><a href="mailto:contato@zelpi.com.br" className="hover:text-foreground transition-colors">contato@zelpi.com.br</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {year} Zelpi Soluções de Comércio Digital LTDA • CNPJ: 27.208.675/0001-87</p>
        </div>
      </div>
    </footer>
  );
}
