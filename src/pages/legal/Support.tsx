import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle, FileText, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingFooter } from "@/features/landing/components/LandingFooter";

const supportOptions = [
  {
    icon: Mail,
    title: "E-mail",
    description: "Envie sua dúvida ou solicitação por e-mail",
    action: "contato@zelpi.com.br",
    href: "mailto:contato@zelpi.com.br",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Atendimento rápido via WhatsApp",
    action: "Iniciar conversa",
    href: "https://wa.me/5500000000000",
  },
  {
    icon: FileText,
    title: "Documentação",
    description: "Tutoriais e guias de uso da plataforma",
    action: "Em breve",
    href: "#",
  },
  {
    icon: HelpCircle,
    title: "FAQ",
    description: "Perguntas frequentes sobre a Zelpi",
    action: "Em breve",
    href: "#",
  },
];

export default function Support() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Z</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Zelpi
            </span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Central de Suporte</h1>
          <p className="text-xl text-muted-foreground">
            Estamos aqui para ajudar você a ter sucesso com a Zelpi
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {supportOptions.map((option, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <option.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={option.href}
                  target={option.href.startsWith("http") ? "_blank" : undefined}
                  rel={option.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="text-primary hover:underline font-medium"
                >
                  {option.action}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted/50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Horário de Atendimento</h2>
          <p className="text-muted-foreground mb-2">Segunda a Sexta: 9h às 18h</p>
          <p className="text-muted-foreground">Sábados: 9h às 13h</p>
        </div>

        <div className="mt-12 pt-8 border-t">
          <h2 className="text-2xl font-semibold mb-6">Dados da Empresa</h2>
          <div className="text-muted-foreground space-y-2">
            <p><strong>Razão Social:</strong> 27.208.675 MANOEL JOSE DA SILVA FILHO</p>
            <p><strong>CNPJ:</strong> 27.208.675/0001-87</p>
            <p><strong>E-mail:</strong> contato@zelpi.com.br</p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
