import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { buildAdminUrl } from "@/lib/adminUrl";
import logoZelpi from "@/assets/logo-zelpi-header.png";

const navLinks = [
  { label: "Diferenciais", href: "#features" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Comparativo", href: "#comparison" },
];

export const LandingHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-background/90 backdrop-blur-lg border-b border-border/60"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          <a href="/" className="shrink-0">
            <img src={logoZelpi} alt="Zelpi" className="h-8 w-auto object-contain" />
          </a>

          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a href={buildAdminUrl("/auth")}>
              <Button variant="ghost" size="sm" className="text-sm">
                Entrar
              </Button>
            </a>
            <a href={buildAdminUrl("/auth")}>
              <Button size="sm" className="text-sm font-semibold">
                Criar loja
              </Button>
            </a>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-background border-t border-border">
          <div className="container mx-auto px-6 py-4 space-y-4">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-sm text-muted-foreground hover:text-foreground text-left"
                >
                  {link.label}
                </button>
              ))}
            </nav>
            <div className="flex flex-col gap-2 pt-3 border-t border-border">
              <a href={buildAdminUrl("/auth")}>
                <Button variant="outline" size="sm" className="w-full text-sm">
                  Entrar
                </Button>
              </a>
              <a href={buildAdminUrl("/auth")}>
                <Button size="sm" className="w-full text-sm font-semibold">
                  Criar loja
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
