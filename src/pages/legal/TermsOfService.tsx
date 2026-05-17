import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/features/landing/components/LandingFooter";

export default function TermsOfService() {
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
        <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar ou usar a plataforma Zelpi, você concorda em ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar ou usar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Zelpi é uma plataforma de e-commerce e automação de anúncios que permite a lojistas criar e gerenciar lojas virtuais, integrar-se com plataformas de anúncios (Meta, Google) e automatizar campanhas de marketing digital.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Você deve fornecer informações precisas e completas durante o cadastro;</li>
              <li>É sua responsabilidade manter a confidencialidade de sua senha;</li>
              <li>Você é responsável por todas as atividades realizadas em sua conta;</li>
              <li>Deve notificar imediatamente sobre qualquer uso não autorizado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Uso Aceitável</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Ao usar a Zelpi, você concorda em não:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violar leis ou regulamentos aplicáveis;</li>
              <li>Infringir direitos de propriedade intelectual de terceiros;</li>
              <li>Transmitir conteúdo ilegal, ofensivo ou prejudicial;</li>
              <li>Interferir na operação da plataforma ou de outros usuários;</li>
              <li>Usar a plataforma para atividades fraudulentas;</li>
              <li>Vender produtos proibidos ou regulamentados sem autorização.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Integrações com Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Zelpi permite integração com serviços de terceiros como Meta (Facebook/Instagram) e Google. Ao utilizar essas integrações, você também está sujeito aos termos de uso dessas plataformas. A Zelpi não se responsabiliza por alterações ou indisponibilidades nesses serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo da plataforma Zelpi, incluindo software, design, textos e logos, é de propriedade exclusiva da Zelpi ou de seus licenciadores. Você não pode copiar, modificar ou distribuir qualquer parte sem autorização expressa.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Pagamentos e Taxas</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>As taxas pelos serviços serão informadas claramente antes da contratação;</li>
              <li>Os pagamentos são processados por terceiros e estão sujeitos a seus termos;</li>
              <li>A Zelpi pode alterar as taxas com aviso prévio de 30 dias;</li>
              <li>A falta de pagamento pode resultar em suspensão dos serviços.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Zelpi não será responsável por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso ou impossibilidade de uso da plataforma. Nossa responsabilidade total é limitada ao valor pago pelo serviço nos últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Rescisão</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos suspender ou encerrar sua conta a qualquer momento por violação destes termos. Você pode encerrar sua conta a qualquer momento através das configurações. Após o encerramento, você perderá acesso aos dados da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos modificar estes termos a qualquer momento. Notificaremos sobre alterações significativas por e-mail ou através da plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Lei Aplicável</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca de domicílio do usuário.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes termos, entre em contato através do e-mail: <a href="mailto:contato@zelpi.com.br" className="text-primary hover:underline">contato@zelpi.com.br</a>
            </p>
          </section>

          <section className="pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Zelpi</strong><br />
              CNPJ: 27.208.675/0001-87<br />
              27.208.675 MANOEL JOSE DA SILVA FILHO
            </p>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
