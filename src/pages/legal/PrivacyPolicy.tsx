import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/features/landing/components/LandingFooter";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A Zelpi ("nós", "nosso" ou "Zelpi") está comprometida em proteger a privacidade dos usuários de nossa plataforma de e-commerce e automação de anúncios. Esta Política de Privacidade descreve como coletamos, usamos, compartilhamos e protegemos suas informações pessoais quando você utiliza nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Informações que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Coletamos as seguintes categorias de informações:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Dados de Cadastro:</strong> Nome, e-mail, telefone, CNPJ/CPF, endereço comercial.</li>
              <li><strong>Dados de Uso:</strong> Informações sobre como você interage com nossa plataforma.</li>
              <li><strong>Dados de Integrações:</strong> Quando você conecta serviços de terceiros (Meta, Google), coletamos tokens de acesso e informações necessárias para a automação.</li>
              <li><strong>Dados de Transações:</strong> Informações sobre vendas, pedidos e pagamentos processados em sua loja.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Como Usamos suas Informações</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fornecer, manter e melhorar nossos serviços de e-commerce e automação;</li>
              <li>Processar transações e enviar notificações relacionadas;</li>
              <li>Gerenciar integrações com plataformas de anúncios (Meta, Google);</li>
              <li>Automatizar campanhas de marketing e anúncios em nome do lojista;</li>
              <li>Comunicar atualizações, ofertas e informações de suporte;</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Compartilhamos dados apenas nas seguintes situações:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Plataformas de Anúncios:</strong> Meta (Facebook/Instagram) e Google para gerenciamento de campanhas;</li>
              <li><strong>Processadores de Pagamento:</strong> Para processar transações financeiras;</li>
              <li><strong>Provedores de Serviço:</strong> Empresas que nos auxiliam na operação da plataforma;</li>
              <li><strong>Obrigações Legais:</strong> Quando exigido por lei ou ordem judicial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Integrações com Meta e Google</h2>
            <p className="text-muted-foreground leading-relaxed">
              Quando você conecta sua conta Meta ou Google à Zelpi, solicitamos permissões específicas para gerenciar seus ativos de anúncios, catálogos de produtos e páginas. Você pode revogar essas permissões a qualquer momento através das configurações de sua conta ou diretamente nas plataformas Meta e Google.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas técnicas e organizacionais apropriadas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição. Isso inclui criptografia de dados em trânsito e em repouso, controles de acesso rigorosos e monitoramento contínuo.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Confirmação da existência de tratamento de dados;</li>
              <li>Acesso aos seus dados pessoais;</li>
              <li>Correção de dados incompletos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados;</li>
              <li>Portabilidade dos dados;</li>
              <li>Revogação do consentimento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Retenção de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais. Após o encerramento da conta, os dados serão mantidos pelo período exigido por lei e então excluídos de forma segura.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato através do e-mail: <a href="mailto:privacidade@zelpi.com.br" className="text-primary hover:underline">privacidade@zelpi.com.br</a>
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
