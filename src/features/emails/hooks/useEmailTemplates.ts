import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { toast } from "@/hooks/use-toast";

export interface EmailTemplate {
  id?: string;
  store_id: string;
  email_type: string;
  subject: string;
  preheader?: string;
  body?: string;
  include_order_summary: boolean;
  cta_text?: string;
  cta_url?: string;
}

export type EmailType = 
  | "order_confirmed"
  | "order_preparing"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "payment_confirmed"
  | "payment_failed"
  | "boleto_generated"
  | "pix_generated"
  | "pix_expired"
  | "welcome"
  | "tracking_code"
  | "refund_processed"
  | "invoice_generated";

// Default templates for each email type
export const defaultTemplates: Record<EmailType, Omit<EmailTemplate, "id" | "store_id">> = {
  order_confirmed: {
    email_type: "order_confirmed",
    subject: "📋 Pedido #{{order_number}} recebido!",
    preheader: "Recebemos seu pedido! Estamos aguardando a confirmação do pagamento.",
    body: "Olá {{customer_name}}, recebemos seu pedido com sucesso! Estamos aguardando a confirmação do pagamento para dar continuidade.",
    include_order_summary: true,
  },
  order_preparing: {
    email_type: "order_preparing",
    subject: "📦 Seu pedido #{{order_number}} está sendo preparado",
    preheader: "Boas notícias! Seu pedido está sendo preparado com carinho.",
    body: "Olá {{customer_name}}, boas notícias! Seu pedido está sendo preparado com muito carinho. Em breve você receberá o código de rastreamento.",
    include_order_summary: true,
  },
  order_shipped: {
    email_type: "order_shipped",
    subject: "🚚 Seu pedido #{{order_number}} foi enviado!",
    preheader: "Seu pedido está a caminho!",
    body: "Olá {{customer_name}}, seu pedido foi enviado e está a caminho! Use o código de rastreamento para acompanhar a entrega.",
    include_order_summary: true,
    cta_text: "Rastrear Pedido",
  },
  order_delivered: {
    email_type: "order_delivered",
    subject: "🎉 Seu pedido #{{order_number}} foi entregue!",
    preheader: "Seu pedido chegou! Aproveite suas compras.",
    body: "Olá {{customer_name}}, seu pedido foi entregue com sucesso! Esperamos que aproveite suas compras. Obrigado por comprar conosco!",
    include_order_summary: true,
  },
  order_cancelled: {
    email_type: "order_cancelled",
    subject: "❌ Pedido #{{order_number}} cancelado",
    preheader: "Seu pedido foi cancelado.",
    body: "Olá {{customer_name}}, infelizmente seu pedido foi cancelado. Se você não solicitou este cancelamento ou tem alguma dúvida, entre em contato conosco.",
    include_order_summary: true,
  },
  payment_confirmed: {
    email_type: "payment_confirmed",
    subject: "✅ Pagamento confirmado - Pedido #{{order_number}}",
    preheader: "Seu pagamento foi aprovado com sucesso!",
    body: "Olá {{customer_name}}, o pagamento do seu pedido foi confirmado! Agora vamos preparar tudo para enviar.",
    include_order_summary: true,
  },
  payment_failed: {
    email_type: "payment_failed",
    subject: "⚠️ Pagamento não aprovado - Pedido #{{order_number}}",
    preheader: "Houve um problema com seu pagamento.",
    body: "Olá {{customer_name}}, infelizmente o pagamento não foi aprovado. Você pode tentar novamente com outro cartão ou escolher outra forma de pagamento.",
    include_order_summary: true,
    cta_text: "TENTAR NOVAMENTE",
    cta_url: "{{retry_payment_url}}",
  },
  boleto_generated: {
    email_type: "boleto_generated",
    subject: "📄 Boleto gerado - Pedido #{{order_number}}",
    preheader: "Seu boleto está pronto para pagamento.",
    body: "Olá {{customer_name}}, o boleto para seu pedido foi gerado. Pague até a data de vencimento para garantir sua compra.",
    include_order_summary: true,
    cta_text: "Visualizar Boleto",
  },
  pix_generated: {
    email_type: "pix_generated",
    subject: "💠 PIX gerado - Pedido #{{order_number}}",
    preheader: "Seu código PIX está pronto!",
    body: "Olá {{customer_name}}, o PIX para seu pedido foi gerado. Escaneie o QR Code ou copie o código para pagar. A confirmação é instantânea!",
    include_order_summary: true,
  },
  pix_expired: {
    email_type: "pix_expired",
    subject: "⏰ PIX expirado - Pedido #{{order_number}}",
    preheader: "O prazo para pagamento do PIX expirou.",
    body: "Olá {{customer_name}}, o PIX do seu pedido expirou. Mas não se preocupe! Você ainda pode finalizar sua compra gerando um novo PIX ou escolhendo outra forma de pagamento.",
    include_order_summary: true,
    cta_text: "PAGAR AGORA",
    cta_url: "{{retry_payment_url}}?method=pix",
  },
  welcome: {
    email_type: "welcome",
    subject: "🎉 Bem-vindo(a) à {{store_name}}!",
    preheader: "Defina sua senha e acesse sua conta!",
    body: "Olá {{customer_name}}, seja muito bem-vindo(a) à {{store_name}}! Sua conta foi criada com sucesso. Para acessar sua área do cliente, acompanhar pedidos e salvar endereços, defina sua senha clicando no botão abaixo.",
    include_order_summary: false,
    cta_text: "Definir Senha",
  },
  tracking_code: {
    email_type: "tracking_code",
    subject: "🚚 Código de rastreamento - Pedido #{{order_number}}",
    preheader: "Acompanhe a entrega do seu pedido!",
    body: "Olá {{customer_name}}, o código de rastreamento do seu pedido está disponível! Use o link abaixo para acompanhar a entrega.",
    include_order_summary: true,
    cta_text: "Rastrear Pedido",
  },
  refund_processed: {
    email_type: "refund_processed",
    subject: "💰 Reembolso processado - Pedido #{{order_number}}",
    preheader: "Seu reembolso foi processado com sucesso.",
    body: "Olá {{customer_name}}, o reembolso do seu pedido foi processado com sucesso. O valor será creditado na sua conta em até 7 dias úteis.",
    include_order_summary: true,
  },
  invoice_generated: {
    email_type: "invoice_generated",
    subject: "📄 Nota fiscal - Pedido #{{order_number}}",
    preheader: "Sua nota fiscal está disponível.",
    body: "Olá {{customer_name}}, a nota fiscal do seu pedido foi emitida. Guarde este documento para eventuais consultas ou garantias.",
    include_order_summary: true,
    cta_text: "Visualizar Nota Fiscal",
  },
};

// Email type metadata for UI
export const emailTypesMeta: Record<EmailType, { label: string; description: string; category: string }> = {
  order_confirmed: { label: "Pedido recebido", description: "Enviado quando o pedido é criado (aguardando pagamento via PIX/Boleto)", category: "order" },
  order_preparing: { label: "Pedido em preparação", description: "Enviado quando o pedido começa a ser preparado", category: "order" },
  order_shipped: { label: "Pedido enviado", description: "Enviado quando o pedido é despachado", category: "order" },
  order_delivered: { label: "Pedido entregue", description: "Enviado quando o pedido é entregue", category: "order" },
  order_cancelled: { label: "Pedido cancelado", description: "Enviado quando o pedido é cancelado", category: "order" },
  payment_confirmed: { label: "Pagamento confirmado", description: "Enviado quando o pagamento é aprovado", category: "payment" },
  payment_failed: { label: "Pagamento recusado", description: "Enviado quando o pagamento falha", category: "payment" },
  boleto_generated: { label: "Boleto gerado", description: "Enviado com os dados do boleto", category: "payment" },
  pix_generated: { label: "PIX gerado", description: "Enviado com o QR code PIX", category: "payment" },
  pix_expired: { label: "PIX expirado", description: "Enviado quando o PIX expira", category: "payment" },
  welcome: { label: "Boas-vindas", description: "Enviado quando o cliente cria uma conta", category: "customer" },
  tracking_code: { label: "Código de rastreamento", description: "Enviado com o código de rastreio", category: "logistics" },
  refund_processed: { label: "Reembolso processado", description: "Enviado quando um reembolso é realizado", category: "payment" },
  invoice_generated: { label: "Nota fiscal emitida", description: "Enviado quando a NF-e é gerada", category: "logistics" },
};

// Available variables for each email type
export const emailVariables: Record<string, { tag: string; label: string; example: string }[]> = {
  all: [
    { tag: "{{customer_name}}", label: "Nome do cliente", example: "João" },
    { tag: "{{store_name}}", label: "Nome da loja", example: "Minha Loja" },
  ],
  order: [
    { tag: "{{order_number}}", label: "Número do pedido", example: "#1234" },
    { tag: "{{order_total}}", label: "Total do pedido", example: "R$ 299,90" },
  ],
  tracking: [
    { tag: "{{tracking_code}}", label: "Código de rastreio", example: "BR123456789" },
  ],
  payment: [
    { tag: "{{payment_amount}}", label: "Valor do pagamento", example: "R$ 299,90" },
  ],
};

export function useEmailTemplates() {
  const { store: activeStore } = useActiveStore();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates", activeStore?.id],
    queryFn: async () => {
      if (!activeStore?.id) return {};

      const { data, error } = await supabase
        .from("store_email_templates")
        .select("*")
        .eq("store_id", activeStore.id);

      if (error) throw error;

      // Convert array to object keyed by email_type
      const templatesMap: Record<string, EmailTemplate> = {};
      data?.forEach((template) => {
        templatesMap[template.email_type] = template as EmailTemplate;
      });

      return templatesMap;
    },
    enabled: !!activeStore?.id,
  });

  const saveTemplate = useMutation({
    mutationFn: async (template: Omit<EmailTemplate, "id">) => {
      if (!activeStore?.id) throw new Error("No active store");

      // Check if template exists
      const { data: existing } = await supabase
        .from("store_email_templates")
        .select("id")
        .eq("store_id", activeStore.id)
        .eq("email_type", template.email_type)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("store_email_templates")
          .update({
            subject: template.subject,
            preheader: template.preheader,
            body: template.body,
            include_order_summary: template.include_order_summary,
            cta_text: template.cta_text,
            cta_url: template.cta_url,
          })
          .eq("store_id", activeStore.id)
          .eq("email_type", template.email_type);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("store_email_templates")
          .insert({
            ...template,
            store_id: activeStore.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates", activeStore?.id] });
      toast({
        title: "Template salvo",
        description: "O template do e-mail foi atualizado.",
      });
    },
    onError: (error) => {
      console.error("Error saving email template:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o template.",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (emailType: string) => {
      if (!activeStore?.id) throw new Error("No active store");

      const { error } = await supabase
        .from("store_email_templates")
        .delete()
        .eq("store_id", activeStore.id)
        .eq("email_type", emailType);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates", activeStore?.id] });
      toast({
        title: "Template restaurado",
        description: "O template foi restaurado para o padrão.",
      });
    },
  });

  // Get template for a specific email type (custom or default)
  const getTemplate = (emailType: EmailType): EmailTemplate => {
    const customTemplate = templates?.[emailType];
    const defaultTemplate = defaultTemplates[emailType];

    if (customTemplate) {
      return {
        ...defaultTemplate,
        ...customTemplate,
        store_id: activeStore?.id || "",
      };
    }

    return {
      ...defaultTemplate,
      store_id: activeStore?.id || "",
    };
  };

  return {
    templates,
    isLoading,
    saveTemplate: saveTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
    isSaving: saveTemplate.isPending,
    getTemplate,
  };
}
