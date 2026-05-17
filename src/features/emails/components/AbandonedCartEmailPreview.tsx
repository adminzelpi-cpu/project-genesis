interface AbandonedCartEmailPreviewProps {
  subject: string;
  preheader: string;
  body: string;
  storeName: string;
  primaryColor: string;
  logoUrl?: string | null;
  emailNumber: 1 | 2 | 3;
  mode: "desktop" | "mobile";
}

const mockProducts = [
  {
    id: "1",
    name: "Camiseta Premium Algodão",
    price: 89.90,
    quantity: 2,
    image_url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop",
    variation: "Azul Marinho - M",
  },
  {
    id: "2",
    name: "Calça Jeans Slim Fit",
    price: 159.90,
    quantity: 1,
    image_url: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=80&h=80&fit=crop",
    variation: "Escura - 42",
  },
  {
    id: "3",
    name: "Tênis Casual Confort",
    price: 249.90,
    quantity: 1,
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop",
    variation: "Branco - 41",
  },
  {
    id: "4",
    name: "Jaqueta Corta-Vento",
    price: 199.90,
    quantity: 1,
    image_url: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=80&h=80&fit=crop",
    variation: "Preta - G",
  },
];

const mockCustomerName = "João";
const mockTotal = 749.50;

function replaceVariables(text: string, storeName: string): string {
  return text
    .replace(/\{\{customer_name\}\}/g, mockCustomerName)
    .replace(/\{\{store_name\}\}/g, storeName)
    .replace(/\{\{cart_total\}\}/g, formatCurrency(mockTotal))
    .replace(/\{\{products_count\}\}/g, "4");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function AbandonedCartEmailPreview({
  subject,
  preheader,
  body,
  storeName,
  primaryColor,
  logoUrl,
  emailNumber,
  mode,
}: AbandonedCartEmailPreviewProps) {
  const displaySubject = replaceVariables(subject, storeName);
  const displayPreheader = replaceVariables(preheader, storeName);
  const displayBody = replaceVariables(body, storeName);

  const productsToShow = mockProducts.slice(0, 4);
  const extraProducts = mockProducts.length - 4;
  const isMobile = mode === "mobile";

  const emailConfig = {
    1: { emoji: "🛒", title: "Você esqueceu algo!" },
    2: { emoji: "⏰", title: "Seus produtos estão esperando" },
    3: { emoji: "🔥", title: "Última chance!" },
  };

  const config = emailConfig[emailNumber];

  return (
    <div className={`${isMobile ? "max-w-[360px]" : "max-w-full"} mx-auto border rounded-lg overflow-hidden bg-background shadow-sm`}>
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
        <div className="text-sm font-medium truncate">{displaySubject}</div>
        <div className="text-xs text-muted-foreground truncate">{displayPreheader}</div>
      </div>

      {/* Email Body - matches real email structure */}
      <div style={{ backgroundColor: "#e2e8f0", padding: isMobile ? "16px 8px" : "32px 16px" }}>
        <div style={{ maxWidth: isMobile ? 340 : 520, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          
          {/* Header with primary color + logo */}
          <div style={{ backgroundColor: primaryColor, padding: "28px 24px", textAlign: "center" }}>
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} style={{ maxHeight: 48, maxWidth: 180, display: "inline-block" }} />
            ) : (
              <h1 style={{ color: "#ffffff", margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{storeName}</h1>
            )}
          </div>

          {/* Content */}
          <div style={{ padding: isMobile ? "24px 16px" : "32px 24px" }}>
            {/* Emoji & Title */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ fontSize: 40, lineHeight: 1 }}>{config.emoji}</span>
              <h2 style={{ margin: "12px 0 8px 0", color: "#1f2937", fontSize: 20, fontWeight: 700 }}>{config.title}</h2>
              <p style={{ margin: 0, color: "#4b5563", fontSize: 14, lineHeight: 1.6 }}>
                Olá, {mockCustomerName}! {displayBody}
              </p>
            </div>

            {/* Products List - table layout matching real email */}
            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 16, borderCollapse: "collapse" }}>
              <tbody>
              {productsToShow.map((product) => (
                <tr key={product.id}>
                  <td style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", width: isMobile ? 68 : 92 }}>
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{ width: isMobile ? 56 : 80, height: isMobile ? 56 : 80, objectFit: "contain", backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", display: "block" }}
                    />
                  </td>
                  <td width="100%" style={{ padding: "12px 0 12px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top", width: "100%" }}>
                    <p style={{ margin: "0 0 2px 0", fontWeight: 500, color: "#1f2937", fontSize: 14 }}>{product.name}</p>
                    {product.variation && (
                      <p style={{ margin: "0 0 2px 0", fontSize: 12, color: "#6b7280" }}>{product.variation}</p>
                    )}
                    <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Qtd: {product.quantity}</p>
                  </td>
                  <td width="1" style={{ padding: "12px 0 12px 8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "bottom", textAlign: "right", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 600, color: primaryColor, fontSize: 14 }}>
                      {formatCurrency(product.price * product.quantity)}
                    </span>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>

            {extraProducts > 0 && (
              <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", margin: "0 0 16px 0" }}>
                + {extraProducts} {extraProducts === 1 ? "item" : "itens"} no carrinho
              </p>
            )}

            {/* Cart Total */}
            <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 24, border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 13, color: "#6b7280", display: "block", marginBottom: 4 }}>Total do carrinho</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: primaryColor, letterSpacing: -1 }}>{formatCurrency(mockTotal)}</span>
            </div>

            {/* CTA Button */}
            <div style={{ textAlign: "center" }}>
              <a
                href="#"
                style={{
                  display: "inline-block",
                  width: "100%",
                  maxWidth: "100%",
                  padding: "16px 32px",
                  backgroundColor: primaryColor,
                  color: "#ffffff",
                  textDecoration: "none",
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 16,
                  textAlign: "center",
                  boxSizing: "border-box" as const,
                }}
              >
                Finalizar Compra ↗
              </a>
            </div>

            <p style={{ margin: "20px 0 0 0", color: "#9ca3af", fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>
              Se você não iniciou esta compra, por favor ignore este e-mail.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "20px 24px" }}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            Este e-mail foi enviado por <strong>{storeName}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}