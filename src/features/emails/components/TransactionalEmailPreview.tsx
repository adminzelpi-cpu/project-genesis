import { EmailType } from "../hooks/useEmailTemplates";

interface TransactionalEmailPreviewProps {
  emailType: EmailType;
  subject: string;
  preheader: string;
  body: string;
  includeOrderSummary: boolean;
  ctaText?: string;
  storeName: string;
  primaryColor: string;
  logoUrl?: string | null;
  mode: "desktop" | "mobile";
}

// Mock data for preview
const mockOrder = {
  number: "1234",
  products: [
    { name: "Polo Básica Azul", quantity: 2, price: 89.90, variation: "Tamanho M", image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop" },
    { name: "Camiseta Premium", quantity: 1, price: 69.90, variation: "Tamanho G", image_url: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=80&h=80&fit=crop" },
  ],
  subtotal: 249.70,
  shipping: 19.90,
  discount: 0,
  total: 269.60,
  trackingCode: "BR123456789",
};

const mockAddress = {
  street: "Rua das Flores",
  number: "123",
  complement: "Apto 45",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  zip: "01234-567",
};

function replaceVariables(text: string, storeName: string): string {
  return text
    .replace(/\{\{customer_name\}\}/g, "João")
    .replace(/\{\{store_name\}\}/g, storeName)
    .replace(/\{\{order_number\}\}/g, mockOrder.number)
    .replace(/\{\{order_total\}\}/g, `R$ ${mockOrder.total.toFixed(2).replace(".", ",")}`)
    .replace(/\{\{tracking_code\}\}/g, mockOrder.trackingCode)
    .replace(/\{\{payment_amount\}\}/g, `R$ ${mockOrder.total.toFixed(2).replace(".", ",")}`)
    .replace(/\{\{total\}\}/g, `R$ ${mockOrder.total.toFixed(2).replace(".", ",")}`)
    .replace(/\{\{retry_payment_url\}\}/g, "#");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function TransactionalEmailPreview({
  emailType,
  subject,
  preheader,
  body,
  includeOrderSummary,
  ctaText,
  storeName,
  primaryColor,
  logoUrl,
  mode,
}: TransactionalEmailPreviewProps) {
  const processedSubject = replaceVariables(subject, storeName);
  const processedPreheader = replaceVariables(preheader, storeName);
  const processedBody = replaceVariables(body, storeName);

  const isMobile = mode === "mobile";
  const containerWidth = isMobile ? "max-w-[360px]" : "max-w-full";

  const getStatusConfig = () => {
    switch (emailType) {
      case "order_confirmed":
        return { emoji: "📋", text: "Pedido Recebido!", bg: "#fef3c7", color: "#92400e" };
      case "order_preparing":
        return { emoji: "📦", text: "Preparando seu Pedido", bg: "#fef3c7", color: "#92400e" };
      case "order_shipped":
        return { emoji: "🚚", text: "Pedido Enviado!", bg: "#dbeafe", color: "#1e40af" };
      case "order_delivered":
        return { emoji: "🎉", text: "Pedido Entregue!", bg: "#dcfce7", color: "#166534" };
      case "order_cancelled":
        return { emoji: "❌", text: "Pedido Cancelado", bg: "#fee2e2", color: "#991b1b" };
      case "payment_confirmed":
        return { emoji: "✅", text: "Pagamento Confirmado!", bg: "#dcfce7", color: "#166534" };
      case "payment_failed":
        return { emoji: "⚠️", text: "Pagamento Não Aprovado", bg: "#fee2e2", color: "#991b1b" };
      case "boleto_generated":
        return { emoji: "📄", text: "Boleto Gerado", bg: "#dbeafe", color: "#1e40af" };
      case "pix_generated":
        return { emoji: "🟢", text: "PIX Gerado", bg: "#dcfce7", color: "#166534" };
      case "pix_expired":
        return { emoji: "⏰", text: "PIX Expirado", bg: "#fef3c7", color: "#92400e" };
      case "welcome":
        return { emoji: "🎉", text: "Bem-vindo(a)!", bg: "#dcfce7", color: "#166534" };
      case "tracking_code":
        return { emoji: "🚚", text: "Código de Rastreamento", bg: "#dbeafe", color: "#1e40af" };
      case "refund_processed":
        return { emoji: "💰", text: "Reembolso Processado", bg: "#dcfce7", color: "#166534" };
      case "invoice_generated":
        return { emoji: "📄", text: "Nota Fiscal Emitida", bg: "#dbeafe", color: "#1e40af" };
      default:
        return { emoji: "📧", text: "E-mail", bg: "#f3f4f6", color: "#374151" };
    }
  };

  const status = getStatusConfig();

  // Render products table (matches real email layout)
  const renderProducts = () => (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginTop: 16, borderCollapse: "collapse" }}>
      <tbody>
        {mockOrder.products.map((product, idx) => (
          <tr key={idx}>
            <td style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", width: isMobile ? 68 : 92 }}>
              <img
                src={product.image_url}
                alt={product.name}
                style={{ width: isMobile ? 56 : 80, height: isMobile ? 56 : 80, objectFit: "contain" as const, backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", display: "block" }}
              />
            </td>
            <td width="100%" style={{ padding: "12px 0 12px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", width: "100%" }}>
              <p style={{ margin: "0 0 2px 0", fontWeight: 500, color: "#1f2937", fontSize: 14 }}>{product.name}</p>
              <p style={{ margin: "0 0 2px 0", fontSize: 12, color: "#6b7280" }}>{product.variation}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Qtd: {product.quantity}</p>
            </td>
            <td width="1" style={{ padding: "12px 0 12px 8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "bottom", textAlign: "right", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 600, color: "#1f2937", fontSize: 14 }}>
                {formatCurrency(product.price * product.quantity)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Render totals (matches real email)
  const renderTotals = () => (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#6b7280", fontSize: 14 }}>
        <span>Subtotal</span>
        <span style={{ color: "#374151" }}>{formatCurrency(mockOrder.subtotal)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#6b7280", fontSize: 14 }}>
        <span>Frete</span>
        <span style={{ color: "#374151" }}>{mockOrder.shipping === 0 ? "Grátis" : formatCurrency(mockOrder.shipping)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0 0", fontSize: 16, fontWeight: 700, borderTop: "2px solid #e5e7eb", marginTop: 4 }}>
        <span style={{ color: "#1f2937" }}>Total</span>
        <span style={{ color: primaryColor }}>{formatCurrency(mockOrder.total)}</span>
      </div>
    </div>
  );

  // Render address (matches real email)
  const renderAddress = () => (
    <div style={{ marginTop: 16, padding: 16, backgroundColor: "#f8fafc", borderRadius: 8 }}>
      <p style={{ margin: "0 0 8px 0", fontSize: 13, fontWeight: 600, color: "#374151", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
        📍 Endereço de Entrega
      </p>
      <p style={{ margin: 0, color: "#4b5563", fontSize: 13, lineHeight: 1.6 }}>
        {mockAddress.street}, {mockAddress.number} - {mockAddress.complement}<br />
        {mockAddress.neighborhood}<br />
        {mockAddress.city} - {mockAddress.state}<br />
        CEP: {mockAddress.zip}
      </p>
    </div>
  );

  // Type-specific content that appears between greeting and order summary
  const renderTypeSpecificContent = () => {
    switch (emailType) {
      case "order_confirmed":
        return (
          <div style={{ textAlign: "center", padding: 16, backgroundColor: "#fffbeb", borderRadius: 12, marginBottom: 16, border: "1px solid #fde68a" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#92400e" }}>
              ⏳ Aguardando confirmação de pagamento
            </p>
            <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#a16207" }}>
              Assim que o pagamento for confirmado, iniciaremos o preparo do seu pedido.
            </p>
          </div>
        );

      case "order_preparing":
        return (
          <div style={{ textAlign: "center", padding: 24, backgroundColor: "#fffbeb", borderRadius: 12, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 40 }}>📦</p>
            <p style={{ margin: "12px 0 0 0", color: "#92400e", fontWeight: 500, fontSize: 14 }}>
              Seu pedido está sendo separado e embalado
            </p>
          </div>
        );

      case "order_shipped":
      case "tracking_code":
        return (
          <div style={{ textAlign: "center", padding: 20, backgroundColor: "#eff6ff", borderRadius: 12, marginBottom: 16 }}>
            <p style={{ margin: "0 0 6px 0", color: "#1e40af", fontWeight: 600, fontSize: 13 }}>Código de Rastreamento</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1e3a8a", letterSpacing: 2 }}>{mockOrder.trackingCode}</p>
            <a href="#" style={{ display: "inline-block", marginTop: 12, padding: "10px 20px", backgroundColor: "#2563eb", color: "#ffffff", textDecoration: "none", borderRadius: 8, fontWeight: 500, fontSize: 14 }}>
              Rastrear Pedido ↗
            </a>
          </div>
        );

      case "order_delivered":
        return (
          <>
            <div style={{ textAlign: "center", padding: 24, backgroundColor: "#f0fdf4", borderRadius: 12, marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 48 }}>🎉</p>
              <p style={{ margin: "12px 0 0 0", color: "#166534", fontWeight: 600, fontSize: 16 }}>Aproveite suas compras!</p>
            </div>
            <p style={{ margin: "0 0 16px 0", color: "#6b7280", fontSize: 13, textAlign: "center" }}>
              Obrigado por comprar conosco. Esperamos ver você novamente em breve!
            </p>
          </>
        );

      case "order_cancelled":
        return (
          <div style={{ padding: 16, backgroundColor: "#fef2f2", borderRadius: 12, borderLeft: "4px solid #ef4444", marginBottom: 16 }}>
            <p style={{ margin: 0, color: "#991b1b", fontSize: 14 }}>
              Se você não solicitou este cancelamento ou tem alguma dúvida, entre em contato conosco.
            </p>
          </div>
        );

      case "payment_confirmed":
        return (
          <>
            <div style={{ textAlign: "center", padding: 20, backgroundColor: "#f0fdf4", borderRadius: 12, marginBottom: 16 }}>
              <p style={{ margin: 0, color: "#166534", fontWeight: 600, fontSize: 16 }}>
                {formatCurrency(mockOrder.total)}
              </p>
              <p style={{ margin: "6px 0 0 0", color: "#16a34a", fontSize: 13 }}>Pagamento aprovado</p>
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <a href="#" style={{ display: "inline-block", padding: "14px 28px", backgroundColor: primaryColor, color: "#ffffff", textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 15 }}>
                Acompanhar Pedido ↗
              </a>
            </div>
          </>
        );

      case "payment_failed":
        return (
          <>
            <div style={{ padding: 16, backgroundColor: "#fef2f2", borderRadius: 12, borderLeft: "4px solid #ef4444", marginBottom: 16 }}>
              <p style={{ margin: 0, color: "#991b1b", fontSize: 14 }}>
                Você pode tentar novamente com outro cartão ou escolher outra forma de pagamento.
              </p>
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <a href="#" style={{ display: "inline-block", padding: "14px 28px", backgroundColor: primaryColor, color: "#ffffff", textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 15 }}>
                TENTAR NOVAMENTE ↗
              </a>
            </div>
          </>
        );

      case "pix_generated":
        return (
          <div style={{ textAlign: "center", padding: 20, backgroundColor: "#f0fdf4", borderRadius: 12, marginBottom: 16 }}>
            <p style={{ margin: "0 0 12px 0", color: "#166534", fontWeight: 600, fontSize: 16 }}>
              Valor: {formatCurrency(mockOrder.total)}
            </p>
            <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: 13 }}>
              ⏰ Expira em: 24/02/2026, 16:05
            </p>
            <div style={{ padding: 16, backgroundColor: "#ffffff", borderRadius: 8, marginTop: 12, border: "2px dashed #86efac" }}>
              <p style={{ margin: "0 0 8px 0", color: "#166534", fontWeight: 600, fontSize: 13 }}>Código PIX Copia e Cola:</p>
              <p style={{ fontFamily: "monospace", fontSize: 10, color: "#374151", wordBreak: "break-all" as const, lineHeight: 1.4, padding: 10, backgroundColor: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", margin: 0, userSelect: "all" as const }}>
                00020126580014br.gov.bcb.pix0136b3531477-f0d8-4ac1-88f0-95a89577668...
              </p>
              <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 11 }}>Selecione e copie o código acima</p>
            </div>
          </div>
        );

      case "pix_expired":
        return (
          <>
            <div style={{ padding: 16, backgroundColor: "#fffbeb", borderRadius: 12, borderLeft: "4px solid #f59e0b", marginBottom: 16 }}>
              <p style={{ margin: 0, color: "#92400e", fontSize: 14 }}>
                Mas não se preocupe! Você ainda pode finalizar sua compra gerando um novo PIX ou escolhendo outra forma de pagamento.
              </p>
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <a href="#" style={{ display: "inline-block", padding: "14px 28px", backgroundColor: primaryColor, color: "#ffffff", textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 15 }}>
                PAGAR AGORA ↗
              </a>
            </div>
          </>
        );

      case "boleto_generated":
        return (
          <div style={{ textAlign: "center", padding: 20, backgroundColor: "#eff6ff", borderRadius: 12, marginBottom: 16 }}>
            <p style={{ margin: "0 0 12px 0", color: "#1e40af", fontWeight: 600, fontSize: 16 }}>
              Valor: {formatCurrency(mockOrder.total)}
            </p>
            <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: 13 }}>
              Vencimento: 27/02/2026, 23:59
            </p>
            <div style={{ padding: 12, backgroundColor: "#ffffff", borderRadius: 8, border: "2px dashed #93c5fd", marginBottom: 12 }}>
              <p style={{ fontFamily: "monospace", fontSize: 11, color: "#374151", wordBreak: "break-all" as const, margin: 0 }}>
                23793.38128 60000.000003 00000.000400 1 84340000026960
              </p>
            </div>
            <a href="#" style={{ display: "inline-block", padding: "10px 24px", backgroundColor: "#2563eb", color: "#ffffff", textDecoration: "none", borderRadius: 8, fontWeight: 500, fontSize: 14 }}>
              Visualizar Boleto ↗
            </a>
          </div>
        );

      case "welcome":
        return (
          <>
            <div style={{ textAlign: "center", padding: 24, backgroundColor: "#f0fdf4", borderRadius: 12, marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 40 }}>🛍️</p>
              <p style={{ margin: "12px 0 0 0", color: "#166534", fontWeight: 600, fontSize: 16 }}>
                Sua conta foi criada com sucesso!
              </p>
              <p style={{ margin: "8px 0 0 0", color: "#4b5563", fontSize: 13 }}>
                Agora você pode acompanhar seus pedidos, salvar endereços e muito mais.
              </p>
            </div>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: 13 }}>
                Para acessar sua área do cliente, defina sua senha clicando no botão abaixo:
              </p>
              <a href="#" style={{ display: "inline-block", padding: "14px 32px", backgroundColor: "#166534", color: "#ffffff", textDecoration: "none", borderRadius: 8, fontWeight: 600, fontSize: 15 }}>
                Definir Minha Senha ↗
              </a>
            </div>
            <p style={{ margin: "16px 0 0 0", color: "#6b7280", fontSize: 12, textAlign: "center" }}>
              Este link é válido por 24 horas. Após esse período, você pode solicitar um novo link na loja.
            </p>
          </>
        );

      case "refund_processed":
        return (
          <>
            <div style={{ textAlign: "center", padding: 20, backgroundColor: "#f0fdf4", borderRadius: 12, marginBottom: 16 }}>
              <p style={{ margin: "0 0 6px 0", color: "#166534", fontWeight: 600, fontSize: 13 }}>Valor Reembolsado</p>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#166534" }}>
                {formatCurrency(mockOrder.total)}
              </p>
            </div>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 13, textAlign: "center" }}>
              O valor será creditado na sua conta em até 7 dias úteis, dependendo da sua instituição financeira.
            </p>
          </>
        );

      case "invoice_generated":
        return (
          <div style={{ textAlign: "center", padding: 20, backgroundColor: "#eff6ff", borderRadius: 12, marginBottom: 16 }}>
            <p style={{ margin: "0 0 6px 0", color: "#1e40af", fontWeight: 600, fontSize: 13 }}>Número da NF-e</p>
            <p style={{ margin: "0 0 12px 0", fontSize: 18, fontWeight: 700, color: "#1e3a8a" }}>000.042.157</p>
            <a href="#" style={{ display: "inline-block", padding: "10px 20px", backgroundColor: "#2563eb", color: "#ffffff", textDecoration: "none", borderRadius: 8, fontWeight: 500, fontSize: 14 }}>
              Visualizar Nota Fiscal ↗
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  // Determine which email types should show products & totals
  const showOrderDetails = includeOrderSummary && [
    "order_confirmed", "order_cancelled", "payment_failed", "pix_expired",
    "pix_generated", "boleto_generated"
  ].includes(emailType);

  // Determine which email types should show the address
  const showAddress = includeOrderSummary && [
    "order_confirmed", "order_shipped", "tracking_code"
  ].includes(emailType);

  // Footer message per type (matches real emails)
  const renderFooterMessage = () => {
    switch (emailType) {
      case "order_confirmed":
        return <p style={{ margin: "16px 0 0 0", color: "#6b7280", fontSize: 13, textAlign: "center" }}>Você receberá um e-mail assim que o pagamento for confirmado.</p>;
      case "order_preparing":
        return <p style={{ margin: "16px 0 0 0", color: "#6b7280", fontSize: 13, textAlign: "center" }}>Em breve você receberá o código de rastreamento.</p>;
      case "pix_generated":
        return <p style={{ margin: "12px 0 0 0", color: "#6b7280", fontSize: 13, textAlign: "center" }}>A confirmação do pagamento é instantânea após a transferência.</p>;
      case "boleto_generated":
        return <p style={{ margin: 0, color: "#6b7280", fontSize: 13, textAlign: "center" }}>Após o pagamento, a confirmação pode levar até 3 dias úteis.</p>;
      case "invoice_generated":
        return <p style={{ margin: 0, color: "#6b7280", fontSize: 13, textAlign: "center" }}>Guarde este documento para eventuais consultas ou garantias.</p>;
      case "welcome":
        return <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 13, textAlign: "center" }}>Obrigado por se cadastrar. Estamos felizes em tê-lo(a) conosco!</p>;
      default:
        return null;
    }
  };

  return (
    <div className={`${containerWidth} mx-auto border rounded-lg overflow-hidden bg-background shadow-sm`}>
      {/* Email Client Header */}
      <div className="bg-muted/50 px-4 py-3 border-b">
        <div className="flex items-center gap-2 mb-1">
          {logoUrl ? (
            <img src={logoUrl} alt={storeName} className="h-6 w-6 object-contain rounded" />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
              {storeName.charAt(0)}
            </div>
          )}
          <span className="font-medium text-sm">{storeName}</span>
        </div>
        <div className="text-sm font-medium truncate">{processedSubject}</div>
        <div className="text-xs text-muted-foreground truncate">{processedPreheader}</div>
      </div>

      {/* Email Body - matches real email template structure */}
      <div style={{ backgroundColor: "#e2e8f0", padding: isMobile ? "16px 8px" : "24px 16px" }}>
        <div style={{ maxWidth: isMobile ? 340 : 520, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          
          {/* Header with primary color + logo */}
          <div style={{ backgroundColor: primaryColor, padding: "20px 24px", textAlign: "center" }}>
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} style={{ maxHeight: 48, maxWidth: 180, display: "inline-block" }} />
            ) : (
              <h1 style={{ color: "#ffffff", margin: 0, fontSize: 24, fontWeight: 700 }}>{storeName}</h1>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: isMobile ? "20px 16px" : "28px 24px" }}>
            {/* Status Badge */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "10px 20px",
                  backgroundColor: status.bg,
                  color: status.color,
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 50,
                }}
              >
                {status.emoji} {status.text}
              </span>
            </div>

            {/* Greeting - left aligned like real email */}
            <h2 style={{ margin: "0 0 6px 0", color: "#1f2937", fontSize: 22, fontWeight: 700 }}>
              Olá, João!
            </h2>
            <p style={{ margin: "0 0 16px 0", color: "#4b5563", fontSize: 15, lineHeight: 1.5 }}>
              {processedBody}
            </p>

            {/* Type-specific content */}
            {renderTypeSpecificContent()}

            {/* Order products + totals */}
            {showOrderDetails && (
              <>
                {renderProducts()}
                {renderTotals()}
              </>
            )}

            {/* Address */}
            {showAddress && renderAddress()}

            {/* CTA Button (from custom template) */}
            {ctaText && !["payment_confirmed", "payment_failed", "pix_expired", "welcome", "order_shipped", "tracking_code"].includes(emailType) && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <a
                  href="#"
                  style={{
                    display: "inline-block",
                    padding: "14px 32px",
                    backgroundColor: primaryColor,
                    color: "#ffffff",
                    textDecoration: "none",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {ctaText}
                </a>
              </div>
            )}

            {/* Footer message per type */}
            {renderFooterMessage()}
          </div>

          {/* Footer - inside the white card like real email */}
          <div style={{ backgroundColor: "#f1f5f9", padding: "16px 24px", textAlign: "center", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: 13 }}>
              Este e-mail foi enviado por <strong>{storeName}</strong>
            </p>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 11 }}>
              Se você não esperava este e-mail, por favor ignore-o.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
