import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logErrorToDb } from "../_shared/errorLogger.ts";
import { getStorePublicUrl } from "../_shared/storeUrl.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Types
interface EmailRequest {
  store_id: string;
  order_id?: string;
  email_type: EmailType;
  recipient_email: string;
  recipient_name: string;
  order_data?: OrderData;
  payment_data?: PaymentData;
  retry_payment_url?: string;
  store_slug?: string;
}

type EmailType =
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
  | "invoice_generated"
  | "password_reset";

interface OrderData {
  order_number: string;
  products: ProductItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  delivery_address?: DeliveryAddress;
  shipping_method?: string;
  shipping_carrier?: string;
  shipping_delivery_days?: number;
  tracking_code?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  refund_amount?: number;
  refund_reason?: string;
  invoice_number?: string;
  invoice_url?: string;
  setup_token?: string;
  store_slug?: string;
  reset_link?: string;
  reset_expires_in?: string;
}

interface ProductItem {
  name: string;
  quantity: number;
  price: number;
  image_url?: string;
  variation?: string;
}

interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

interface PaymentData {
  method: "pix" | "boleto" | "credit_card";
  qr_code?: string;
  qr_code_base64?: string;
  barcode?: string;
  barcode_url?: string;
  expiration_date?: string;
  amount: number;
}

interface StoreEmailSettings {
  order_confirmed_enabled: boolean;
  order_preparing_enabled: boolean;
  order_shipped_enabled: boolean;
  order_delivered_enabled: boolean;
  order_cancelled_enabled: boolean;
  payment_confirmed_enabled: boolean;
  payment_failed_enabled: boolean;
  boleto_generated_enabled: boolean;
  pix_generated_enabled: boolean;
  pix_expired_enabled: boolean;
  welcome_enabled: boolean;
  tracking_code_enabled: boolean;
  refund_processed_enabled: boolean;
  invoice_generated_enabled: boolean;
  sender_name: string;
  reply_to_email: string;
  store_name: string;
  store_logo?: string;
}

// Custom template from store_email_templates table
interface CustomEmailTemplate {
  subject: string;
  preheader?: string | null;
  body?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  include_order_summary: boolean;
}

// Email subject mapping - {order_number} already includes # prefix
const emailSubjects: Record<EmailType, string> = {
  order_confirmed: "📋 Pedido {order_number} recebido!",
  order_preparing: "📦 Seu pedido {order_number} está sendo preparado",
  order_shipped: "🚚 Seu pedido {order_number} foi enviado!",
  order_delivered: "🎉 Seu pedido {order_number} foi entregue!",
  order_cancelled: "❌ Pedido {order_number} cancelado",
  payment_confirmed: "✅ Pagamento confirmado - Pedido {order_number}",
  payment_failed: "⚠️ Pagamento não aprovado - Pedido {order_number}",
  boleto_generated: "📄 Boleto gerado - Pedido {order_number}",
  pix_generated: "🟢 PIX gerado - Pedido {order_number}",
  pix_expired: "⏰ PIX expirado - Pedido {order_number}",
  welcome: "🎉 Bem-vindo(a) à {store_name}!",
  tracking_code: "🚚 Código de rastreamento - Pedido {order_number}",
  refund_processed: "💰 Reembolso processado - Pedido {order_number}",
  invoice_generated: "📄 Nota fiscal - Pedido {order_number}",
  password_reset: "🔐 Redefinir sua senha - {store_name}",
};

/**
 * Ensures a color has enough contrast for white text on both light and dark email themes.
 * If the color is too dark (close to black) or too light, returns a safe fallback.
 */
function getSafeButtonColor(hex: string): string {
  try {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    // Relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Too dark (invisible on dark bg) or too light (invisible on light bg / white text unreadable)
    if (luminance < 0.15 || luminance > 0.85) return "#4F46E5";
    return hex;
  } catch {
    return "#4F46E5";
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate email HTML based on type
function generateEmailHtml(
  emailType: EmailType,
  settings: StoreEmailSettings,
  orderData?: OrderData,
  paymentData?: PaymentData,
  recipientName?: string,
  retryPaymentUrl?: string,
  storeSlug?: string,
  themePrimaryColor?: string,
  customTemplate?: CustomEmailTemplate | null,
  storeBaseUrl?: string,
): string {
  const storeName = settings.store_name;
  const logoUrl = settings.store_logo;
  const rawPrimaryColor = themePrimaryColor || "#4F46E5";
  const primaryColor = getSafeButtonColor(rawPrimaryColor);
  const backgroundColor = "#e2e8f0";
  
  // Use only first name for a friendlier greeting
  recipientName = recipientName ? recipientName.trim().split(/\s+/)[0] : undefined;

  // Helper to replace template variables in custom body/preheader
  const replaceTemplateVars = (text: string): string => {
    return text
      .replace(/\{\{customer_name\}\}/g, recipientName || "cliente")
      .replace(/\{\{order_number\}\}/g, orderData?.order_number || "")
      .replace(/\{\{store_name\}\}/g, storeName || "")
      .replace(/\{\{tracking_code\}\}/g, orderData?.tracking_code || "")
      .replace(/\{\{total\}\}/g, formatCurrency(orderData?.total || 0))
      .replace(/\{\{retry_payment_url\}\}/g, retryPaymentUrl || "#");
  };

  // Get custom body message if template exists
  const customBody = customTemplate?.body ? replaceTemplateVars(customTemplate.body) : null;
  const customPreheader = customTemplate?.preheader ? replaceTemplateVars(customTemplate.preheader) : null;
  
  // Base template wrapper - reduced header padding
  const wrapContent = (content: string, preheaderText?: string) => `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${storeName}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      ${preheaderText ? `
      <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
        ${preheaderText}
        &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
      </div>
      ` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor};">
        <tr>
          <td style="padding: 24px 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background-color: ${primaryColor}; padding: 20px 24px; text-align: center;">
                  ${logoUrl 
                    ? `<img src="${logoUrl}" alt="${storeName}" style="max-height: 48px; max-width: 180px;">`
                    : `<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${storeName}</h1>`
                  }
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 28px 24px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0 0 4px 0; color: #64748b; font-size: 13px;">
                    Este e-mail foi enviado por <strong>${storeName}</strong>
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                    Se você não esperava este e-mail, por favor ignore-o.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Products table with images - using table layout (email compatible)
  const renderProducts = (products: ProductItem[]) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; border-collapse: collapse;">
      ${products.map(product => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; width: 84px;">
            ${product.image_url 
              ? `<img src="${product.image_url}" alt="${product.name}" style="width: 80px; height: 80px; object-fit: contain; background-color: #ffffff; border-radius: 8px; display: block; border: 1px solid #e2e8f0;">`
              : `<div style="width: 80px; height: 80px; background-color: #f1f5f9; border-radius: 8px;"></div>`
            }
          </td>
          <td width="100%" style="padding: 12px 0 12px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; width: 100%;">
            <p style="margin: 0 0 4px 0; font-weight: 500; color: #1f2937; font-size: 14px; line-height: 1.35;">${product.name}</p>
            ${product.variation 
              ? `<p style="margin: 0 0 2px 0; font-size: 12px; color: #6b7280;">${product.variation}</p>`
              : ""
            }
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Qtd: ${product.quantity}</p>
          </td>
          <td width="1" style="padding: 12px 0 12px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: bottom; text-align: right; white-space: nowrap;">
            <p style="margin: 0; font-weight: 600; color: #1f2937; font-size: 14px;">${formatCurrency(product.price * product.quantity)}</p>
            ${product.quantity > 1
              ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #9ca3af;">${formatCurrency(product.price)} cada</p>`
              : ""
            }
          </td>
        </tr>
      `).join("")}
    </table>
  `;

  // Order totals - more compact
  const renderTotals = (order: OrderData) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
      <tr>
        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
        <td style="padding: 6px 0; text-align: right; color: #374151; font-size: 14px;">${formatCurrency(order.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Frete</td>
        <td style="padding: 6px 0; text-align: right; color: #374151; font-size: 14px;">${order.shipping === 0 ? "Grátis" : formatCurrency(order.shipping)}</td>
      </tr>
      ${order.discount > 0 ? `
        <tr>
          <td style="padding: 6px 0; color: #16a34a; font-size: 14px;">Desconto</td>
          <td style="padding: 6px 0; text-align: right; color: #16a34a; font-size: 14px;">-${formatCurrency(order.discount)}</td>
        </tr>
      ` : ""}
      <tr>
        <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #1f2937; border-top: 2px solid #e5e7eb;">Total</td>
        <td style="padding: 12px 0 0 0; text-align: right; font-size: 16px; font-weight: 700; color: ${primaryColor}; border-top: 2px solid #e5e7eb;">${formatCurrency(order.total)}</td>
      </tr>
    </table>
  `;

  // Delivery address - compact
  const renderAddress = (address: DeliveryAddress, order?: OrderData) => {
    const hasShipping = !!(order?.shipping_method || order?.shipping_carrier || order?.shipping_delivery_days);
    const shippingName = order?.shipping_method || (order?.shipping_carrier ? "Entrega" : "");
    const showCarrier = order?.shipping_carrier && order?.shipping_carrier !== order?.shipping_method;
    return `
    <div style="margin-top: 16px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">
        📍 Endereço de Entrega
      </p>
      <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.6;">
        ${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ""}<br>
        ${address.neighborhood}<br>
        ${address.city} - ${address.state}<br>
        CEP: ${address.zip_code}
      </p>
      ${hasShipping ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
            🚚 Forma de envio
          </p>
          <p style="margin: 0; color: #374151; font-size: 13px; font-weight: 500;">
            ${shippingName}${showCarrier ? ` · ${order?.shipping_carrier}` : ""}
          </p>
          ${order?.shipping_delivery_days != null ? `
            <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 12px;">
              Prazo: ${order.shipping_delivery_days} ${order.shipping_delivery_days === 1 ? "dia útil" : "dias úteis"}
            </p>
          ` : ""}
        </div>
      ` : ""}
    </div>
  `;
  };

  // Status badge - more compact
  const renderStatusBadge = (text: string, bgColor: string, textColor: string, emoji: string) => `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; padding: 10px 20px; background-color: ${bgColor}; color: ${textColor}; font-size: 15px; font-weight: 600; border-radius: 50px;">
        ${emoji} ${text}
      </span>
    </div>
  `;

  // Format order number for display - always #NNNN format
  const formatOrderNumber = (orderNumber?: string): string => {
    if (!orderNumber) return "";
    // Strip any existing prefix like PED, #PED, # etc
    const cleaned = orderNumber.replace(/^#?PED[-]?/i, "").replace(/^#/, "");
    return `#${cleaned}`;
  };

  const displayOrderNumber = formatOrderNumber(orderData?.order_number);

  // Helper: generates the greeting + message block. Uses custom body if available.
  const renderGreeting = (defaultMessage: string): string => {
    const message = customBody || defaultMessage;
    return `
      <h2 style="margin: 0 0 6px 0; color: #1f2937; font-size: 22px;">Olá, ${recipientName || "cliente"}!</h2>
      <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 15px; line-height: 1.5;">
        ${message}
      </p>
    `;
  };

  // Helper: get preheader (custom or default)
  const getPreheader = (defaultPreheader: string): string => customPreheader || defaultPreheader;

  // Generate content based on email type
  switch (emailType) {
    case "order_confirmed":
      return wrapContent(`
        ${renderStatusBadge("Pedido Recebido!", "#fef3c7", "#92400e", "📋")}
        ${renderGreeting(`Recebemos seu pedido <strong>${displayOrderNumber}</strong> com sucesso!`)}
        <div style="text-align: center; padding: 16px; background-color: #fffbeb; border-radius: 12px; margin-bottom: 16px; border: 1px solid #fde68a;">
          <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 500;">
            ⏳ Aguardando confirmação de pagamento
          </p>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #a16207;">
            Assim que o pagamento for confirmado, iniciaremos o preparo do seu pedido.
          </p>
        </div>
        ${orderData?.products ? renderProducts(orderData.products) : ""}
        ${orderData ? renderTotals(orderData) : ""}
        ${orderData?.delivery_address ? renderAddress(orderData.delivery_address, orderData) : ""}
        ${storeBaseUrl ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${storeBaseUrl}/customer/orders" style="display: inline-block; padding: 14px 28px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Acompanhar Pedido &#8599;
            </a>
            <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 13px;">
              Você receberá um e-mail assim que o pagamento for confirmado.
            </p>
          </div>
        ` : `
          <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
            Você receberá um e-mail assim que o pagamento for confirmado.
          </p>
        `}
      `, getPreheader("Recebemos seu pedido e estamos aguardando a confirmação do pagamento."));

    case "order_preparing":
      return wrapContent(`
        ${renderStatusBadge("Preparando seu Pedido", "#fef3c7", "#92400e", "📦")}
        ${renderGreeting(`Boas notícias! Seu pedido <strong>${displayOrderNumber}</strong> está sendo preparado com muito carinho.`)}
        <div style="text-align: center; padding: 24px; background-color: #fffbeb; border-radius: 12px;">
          <p style="margin: 0; font-size: 40px;">📦</p>
          <p style="margin: 12px 0 0 0; color: #92400e; font-weight: 500; font-size: 14px;">Seu pedido está sendo separado e embalado</p>
        </div>
        ${orderData?.products ? renderProducts(orderData.products) : ""}
        ${storeBaseUrl ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${storeBaseUrl}/customer/orders" style="display: inline-block; padding: 14px 28px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Acompanhar Pedido &#8599;
            </a>
          </div>
        ` : `
          <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
            Em breve você receberá o código de rastreamento.
          </p>
        `}
      `, getPreheader("Boas notícias! Seu pedido está sendo preparado com carinho."));

    case "order_shipped":
      return wrapContent(`
        ${renderStatusBadge("Pedido Enviado!", "#dbeafe", "#1e40af", "🚚")}
        ${renderGreeting(`Seu pedido <strong>${displayOrderNumber}</strong> está a caminho!`)}
        ${orderData?.tracking_code ? `
          <div style="text-align: center; padding: 20px; background-color: #eff6ff; border-radius: 12px; margin-bottom: 16px;">
            <p style="margin: 0 0 6px 0; color: #1e40af; font-weight: 600; font-size: 13px;">Código de Rastreamento</p>
            <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1e3a8a; letter-spacing: 2px;">${orderData.tracking_code}</p>
            ${orderData.tracking_url ? `
              <a href="${orderData.tracking_url}" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
                Rastrear Pedido &#8599;
              </a>
            ` : ""}
          </div>
        ` : ""}
        ${orderData?.estimated_delivery ? `
          <p style="text-align: center; color: #4b5563; font-size: 13px;">
            <strong>Previsão de entrega:</strong> ${orderData.estimated_delivery}
          </p>
        ` : ""}
        ${orderData?.delivery_address ? renderAddress(orderData.delivery_address, orderData) : ""}
        ${storeBaseUrl ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${storeBaseUrl}/customer/orders" style="display: inline-block; padding: 14px 28px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Acompanhar Pedido &#8599;
            </a>
          </div>
        ` : ""}
      `, getPreheader("Seu pedido está a caminho! Acompanhe a entrega."));

    case "order_delivered":
      return wrapContent(`
        ${renderStatusBadge("Pedido Entregue!", "#dcfce7", "#166534", "🎉")}
        ${renderGreeting(`Seu pedido <strong>${displayOrderNumber}</strong> foi entregue com sucesso!`)}
        <div style="text-align: center; padding: 24px; background-color: #f0fdf4; border-radius: 12px;">
          <p style="margin: 0; font-size: 48px;">🎉</p>
          <p style="margin: 12px 0 0 0; color: #166534; font-weight: 600; font-size: 16px;">Aproveite suas compras!</p>
        </div>
        <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
          Obrigado por comprar conosco. Esperamos ver você novamente em breve!
        </p>
      `, getPreheader("Seu pedido chegou! Aproveite suas compras."));

    case "order_cancelled":
      return wrapContent(`
        ${renderStatusBadge("Pedido Cancelado", "#fee2e2", "#991b1b", "❌")}
        ${renderGreeting(`Infelizmente seu pedido <strong>${displayOrderNumber}</strong> foi cancelado.`)}
        <div style="padding: 16px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            Se você não solicitou este cancelamento ou tem alguma dúvida, entre em contato conosco.
          </p>
        </div>
        ${orderData?.products ? renderProducts(orderData.products) : ""}
      `, getPreheader("Seu pedido foi cancelado. Entre em contato se precisar de ajuda."));

    case "payment_confirmed":
      return wrapContent(`
        ${renderStatusBadge("Pagamento Confirmado!", "#dcfce7", "#166534", "✅")}
        ${renderGreeting(`O pagamento do seu pedido <strong>${displayOrderNumber}</strong> foi confirmado!`)}
        <div style="text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 12px;">
          <p style="margin: 0; color: #166534; font-weight: 600; font-size: 16px;">
            ${formatCurrency(paymentData?.amount || orderData?.total || 0)}
          </p>
          <p style="margin: 6px 0 0 0; color: #16a34a; font-size: 13px;">Pagamento aprovado</p>
        </div>
        ${storeBaseUrl ? `
          <div style="text-align: center; margin-top: 20px;">
            <a href="${storeBaseUrl}/customer/orders" style="display: inline-block; padding: 14px 28px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              Acompanhar Pedido &#8599;
            </a>
          </div>
        ` : `
          <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
            Seu pedido será preparado em breve.
          </p>
        `}
      `, getPreheader("Seu pagamento foi aprovado! Vamos preparar seu pedido."));

    case "payment_failed":
      return wrapContent(`
        ${renderStatusBadge("Pagamento Não Aprovado", "#fee2e2", "#991b1b", "⚠️")}
        ${renderGreeting(`Infelizmente o pagamento do pedido <strong>${displayOrderNumber}</strong> não foi aprovado.`)}
        <div style="padding: 16px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #ef4444; margin-bottom: 16px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            Você pode tentar novamente com outro cartão ou escolher outra forma de pagamento.
          </p>
        </div>
        ${retryPaymentUrl ? `
          <div style="text-align: center; margin-top: 16px;">
            <a href="${retryPaymentUrl}" style="display: inline-block; padding: 14px 28px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              TENTAR NOVAMENTE &#8599;
            </a>
          </div>
        ` : ""}
        ${orderData?.products ? renderProducts(orderData.products) : ""}
        ${orderData ? renderTotals(orderData) : ""}
      `, getPreheader("Houve um problema com seu pagamento. Tente novamente."));

    case "boleto_generated":
      return wrapContent(`
        ${renderStatusBadge("Boleto Gerado", "#dbeafe", "#1e40af", "📄")}
        ${renderGreeting(`O boleto para o pedido <strong>${displayOrderNumber}</strong> foi gerado.`)}
        <div style="text-align: center; padding: 20px; background-color: #eff6ff; border-radius: 12px; margin-bottom: 16px;">
          <p style="margin: 0 0 12px 0; color: #1e40af; font-weight: 600; font-size: 16px;">
            Valor: ${formatCurrency(paymentData?.amount || orderData?.total || 0)}
          </p>
          ${paymentData?.expiration_date ? `
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
              Vencimento: ${formatDate(paymentData.expiration_date)}
            </p>
          ` : ""}
          ${paymentData?.barcode ? `
            <div style="padding: 12px; background-color: #ffffff; border-radius: 8px; margin-bottom: 12px; border: 2px dashed #93c5fd;">
              <p style="margin: 0; font-family: monospace; font-size: 11px; color: #374151; word-break: break-all;">
                ${paymentData.barcode}
              </p>
            </div>
          ` : ""}
          ${paymentData?.barcode_url ? `
            <a href="${paymentData.barcode_url}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
              Visualizar Boleto &#8599;
            </a>
          ` : ""}
        </div>
        <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
          Após o pagamento, a confirmação pode levar até 3 dias úteis.
        </p>
      `, getPreheader("Seu boleto está pronto para pagamento. Pague até o vencimento."));

    case "pix_generated":
      return wrapContent(`
        ${renderStatusBadge("PIX Gerado", "#dcfce7", "#166534", "🟢")}
        ${renderGreeting(`O PIX para o pedido <strong>${displayOrderNumber}</strong> foi gerado.`)}
        <div style="text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 12px; margin-bottom: 16px;">
          <p style="margin: 0 0 12px 0; color: #166534; font-weight: 600; font-size: 16px;">
            Valor: ${formatCurrency(paymentData?.amount || orderData?.total || 0)}
          </p>
          ${paymentData?.expiration_date ? `
            <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
              ⏰ Expira em: ${formatDate(paymentData.expiration_date)}
            </p>
          ` : ""}
          ${paymentData?.qr_code ? `
            <div style="padding: 16px; background-color: #ffffff; border-radius: 8px; margin-top: 12px; border: 2px dashed #86efac;">
              <p style="margin: 0 0 8px 0; color: #166534; font-weight: 600; font-size: 13px;">Código PIX Copia e Cola:</p>
              <p style="margin: 0; font-family: monospace; font-size: 10px; color: #374151; word-break: break-all; line-height: 1.4; user-select: all; padding: 10px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
                ${paymentData.qr_code}
              </p>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 11px;">Selecione e copie o código acima</p>
            </div>
          ` : ""}
        </div>
        ${orderData?.products ? renderProducts(orderData.products) : ""}
        ${orderData ? renderTotals(orderData) : ""}
        <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
          A confirmação do pagamento é instantânea após a transferência.
        </p>
      `, getPreheader("Seu código PIX está pronto! Copie o código para pagar."));

    case "pix_expired":
      return wrapContent(`
        ${renderStatusBadge("PIX Expirado", "#fef3c7", "#92400e", "⏰")}
        ${renderGreeting(`O PIX do pedido <strong>${displayOrderNumber}</strong> expirou.`)}
        <div style="padding: 16px; background-color: #fffbeb; border-radius: 12px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            Mas não se preocupe! Você ainda pode finalizar sua compra gerando um novo PIX ou escolhendo outra forma de pagamento.
          </p>
        </div>
        ${retryPaymentUrl ? `
          <div style="text-align: center; margin-top: 16px;">
            <a href="${retryPaymentUrl}?method=pix" style="display: inline-block; padding: 14px 28px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
              PAGAR AGORA &#8599;
            </a>
          </div>
        ` : ""}
        ${orderData?.products ? renderProducts(orderData.products) : ""}
        ${orderData ? renderTotals(orderData) : ""}
      `, getPreheader("O prazo para pagamento do PIX expirou. Gere um novo para finalizar."));

    case "welcome":
      const setupToken = orderData?.setup_token;
      const setupPasswordUrl = setupToken && storeBaseUrl
        ? `${storeBaseUrl}/redefinir-senha?token=${setupToken}&mode=welcome`
        : (storeBaseUrl || "#");
      return wrapContent(`
        ${renderStatusBadge("Bem-vindo(a)!", "#dcfce7", "#166534", "🎉")}
        ${renderGreeting(`Seja muito bem-vindo(a) à <strong>${storeName}</strong>!`)}
        <div style="text-align: center; padding: 24px; background-color: #f0fdf4; border-radius: 12px;">
          <p style="margin: 0; font-size: 40px;">🛍️</p>
          <p style="margin: 12px 0 0 0; color: #166534; font-weight: 600; font-size: 16px;">
            Sua conta foi criada com sucesso!
          </p>
          <p style="margin: 8px 0 0 0; color: #4b5563; font-size: 13px;">
            Agora você pode acompanhar seus pedidos, salvar endereços e muito mais.
          </p>
        </div>
        <div style="text-align: center; margin-top: 16px;">
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
            Para acessar sua área do cliente, defina sua senha clicando no botão abaixo:
          </p>
          <a href="${setupPasswordUrl}" style="display: inline-block; padding: 14px 32px; background-color: #166534; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Definir Senha &#8599;
          </a>
        </div>
        <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
          Este link é válido por 24 horas. Após esse período, você pode solicitar um novo link na loja.
        </p>
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
          Obrigado por se cadastrar. Estamos felizes em tê-lo(a) conosco!
        </p>
      `, getPreheader("Defina sua senha e acesse sua conta!"));

    case "tracking_code":
      return wrapContent(`
        ${renderStatusBadge("Código de Rastreamento", "#dbeafe", "#1e40af", "🚚")}
        ${renderGreeting(`O código de rastreamento do seu pedido <strong>${displayOrderNumber}</strong> está disponível!`)}
        <div style="text-align: center; padding: 20px; background-color: #eff6ff; border-radius: 12px; margin-bottom: 16px;">
          <p style="margin: 0 0 6px 0; color: #1e40af; font-weight: 600; font-size: 13px;">Código de Rastreamento</p>
          <p style="margin: 0; font-size: 22px; font-weight: 700; color: #1e3a8a; letter-spacing: 2px;">${orderData?.tracking_code || "N/A"}</p>
          ${orderData?.tracking_url ? `
            <a href="${orderData.tracking_url}" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
              Rastrear Pedido &#8599;
            </a>
          ` : ""}
        </div>
        ${orderData?.estimated_delivery ? `
          <p style="text-align: center; color: #4b5563; font-size: 13px;">
            <strong>Previsão de entrega:</strong> ${orderData.estimated_delivery}
          </p>
        ` : ""}
        ${orderData?.delivery_address ? renderAddress(orderData.delivery_address, orderData) : ""}
      `, getPreheader("Acompanhe a entrega do seu pedido com o código de rastreio!"));

    case "refund_processed":
      return wrapContent(`
        ${renderStatusBadge("Reembolso Processado", "#dcfce7", "#166534", "💰")}
        ${renderGreeting(`O reembolso do pedido <strong>${displayOrderNumber}</strong> foi processado com sucesso.`)}
        <div style="text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 12px; margin-bottom: 16px;">
          <p style="margin: 0 0 6px 0; color: #166534; font-weight: 600; font-size: 13px;">Valor Reembolsado</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #166534;">
            ${formatCurrency(orderData?.refund_amount || orderData?.total || 0)}
          </p>
        </div>
        ${orderData?.refund_reason ? `
          <div style="padding: 12px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0 0 4px 0; color: #374151; font-weight: 500; font-size: 13px;">Motivo:</p>
            <p style="margin: 0; color: #6b7280; font-size: 13px;">${orderData.refund_reason}</p>
          </div>
        ` : ""}
        <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
          O valor será creditado na sua conta em até 7 dias úteis, dependendo da sua instituição financeira.
        </p>
      `, getPreheader("Seu reembolso foi processado com sucesso."));

    case "invoice_generated":
      return wrapContent(`
        ${renderStatusBadge("Nota Fiscal Emitida", "#dbeafe", "#1e40af", "📄")}
        ${renderGreeting(`A nota fiscal do pedido <strong>${displayOrderNumber}</strong> foi emitida.`)}
        <div style="text-align: center; padding: 20px; background-color: #eff6ff; border-radius: 12px; margin-bottom: 16px;">
          ${orderData?.invoice_number ? `
            <p style="margin: 0 0 6px 0; color: #1e40af; font-weight: 600; font-size: 13px;">Número da NF-e</p>
            <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1e3a8a;">${orderData.invoice_number}</p>
          ` : ""}
          ${orderData?.invoice_url ? `
            <a href="${orderData.invoice_url}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
              Visualizar Nota Fiscal &#8599;
            </a>
          ` : ""}
        </div>
        <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
          Guarde este documento para eventuais consultas ou garantias.
        </p>
      `, getPreheader("Sua nota fiscal está disponível para download."));

    case "password_reset": {
      const resetLink = orderData?.reset_link || "#";
      const expiresIn = orderData?.reset_expires_in || "1 hora";
      return wrapContent(`
        ${renderStatusBadge("Redefinição de Senha", "#dbeafe", "#1e40af", "🔐")}
        ${renderGreeting(`Recebemos uma solicitação para redefinir a senha da sua conta em <strong>${storeName}</strong>.`)}
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            Redefinir Senha &#8599;
          </a>
        </div>
        <div style="padding: 16px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 16px 0;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            ⚠️ Este link é válido por <strong>${expiresIn}</strong>. Após esse período, você precisará solicitar um novo link.
          </p>
        </div>
        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
          Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanecerá inalterada.
        </p>
      `, getPreheader("Clique no link para criar uma nova senha de acesso."));
    }

    default:
      return wrapContent(`
        <h2 style="margin: 0 0 6px 0; color: #1f2937; font-size: 22px;">Olá, ${recipientName}!</h2>
        <p style="margin: 0; color: #4b5563; font-size: 15px;">
          Obrigado por comprar conosco!
        </p>
      `);
  }
}

// Check if email type is enabled
function isEmailTypeEnabled(settings: StoreEmailSettings, emailType: EmailType): boolean {
  const enabledMap: Record<EmailType, boolean> = {
    order_confirmed: settings.order_confirmed_enabled,
    order_preparing: settings.order_preparing_enabled,
    order_shipped: settings.order_shipped_enabled,
    order_delivered: settings.order_delivered_enabled,
    order_cancelled: settings.order_cancelled_enabled,
    payment_confirmed: settings.payment_confirmed_enabled,
    payment_failed: settings.payment_failed_enabled,
    boleto_generated: settings.boleto_generated_enabled,
    pix_generated: settings.pix_generated_enabled,
    pix_expired: settings.pix_expired_enabled,
    welcome: settings.welcome_enabled,
    tracking_code: settings.tracking_code_enabled,
    refund_processed: settings.refund_processed_enabled,
    invoice_generated: settings.invoice_generated_enabled,
    password_reset: true, // Always enabled — security/account access flow
  };
  return enabledMap[emailType] ?? true;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body: EmailRequest = await req.json();
    const { store_id, order_id, email_type, recipient_email, recipient_name, order_data, payment_data, retry_payment_url, store_slug } = body;

    console.log(`[send-transactional-email] Processing ${email_type} for store ${store_id}`);

    // Get store email settings
    const { data: settings, error: settingsError } = await supabase.rpc("get_store_email_settings", {
      p_store_id: store_id,
    });

    if (settingsError) {
      console.error("Error fetching email settings:", settingsError);
      throw new Error("Failed to fetch email settings");
    }

    const emailSettings = settings as StoreEmailSettings;

    // Check if this email type is enabled
    if (!isEmailTypeEnabled(emailSettings, email_type)) {
      console.log(`[send-transactional-email] Email type ${email_type} is disabled for store ${store_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: "email_type_disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch custom template for this email type (if merchant customized it)
    let customTemplate: CustomEmailTemplate | null = null;
    const { data: templateData } = await supabase
      .from("store_email_templates")
      .select("subject, preheader, body, cta_text, cta_url, include_order_summary")
      .eq("store_id", store_id)
      .eq("email_type", email_type)
      .maybeSingle();

    if (templateData) {
      customTemplate = templateData as CustomEmailTemplate;
      console.log(`[send-transactional-email] Using custom template for ${email_type}`);
    }

    // Get store slug and theme color if not provided
    let finalStoreSlug = store_slug;
    let themePrimaryColor: string | undefined;
    if (!finalStoreSlug) {
      const { data: storeData } = await supabase
        .from("stores")
        .select("slug, theme_primary_color")
        .eq("id", store_id)
        .single();
      finalStoreSlug = storeData?.slug;
      themePrimaryColor = storeData?.theme_primary_color || undefined;
    } else {
      const { data: storeData } = await supabase
        .from("stores")
        .select("theme_primary_color")
        .eq("id", store_id)
        .single();
      themePrimaryColor = storeData?.theme_primary_color || undefined;
    }

    // Resolve the public storefront URL (custom domain → fallback to slug.zelpi.com.br)
    const storeBaseUrl = finalStoreSlug
      ? await getStorePublicUrl(supabase, { id: store_id, slug: finalStoreSlug })
      : undefined;

    // Generate subject - use custom template subject if available, otherwise default
    const rawSubject = customTemplate?.subject || emailSubjects[email_type];
    const subject = rawSubject
      .replace(/\{order_number\}/g, order_data?.order_number || "")
      .replace(/\{\{order_number\}\}/g, order_data?.order_number || "")
      .replace(/\{store_name\}/g, emailSettings.store_name || "")
      .replace(/\{\{store_name\}\}/g, emailSettings.store_name || "");

    // Generate email HTML
    const html = generateEmailHtml(email_type, emailSettings, order_data, payment_data, recipient_name, retry_payment_url, finalStoreSlug, themePrimaryColor, customTemplate, storeBaseUrl);

    // Send email via Resend
    const senderEmail = "noreply@zelpi.com.br";
    const senderName = emailSettings.sender_name || emailSettings.store_name || "Loja";

    console.log(`[send-transactional-email] Sending email to ${recipient_email} from ${senderName} <${senderEmail}>`);

    const emailResponse = await resend.emails.send({
      from: `${senderName} <${senderEmail}>`,
      to: [recipient_email],
      subject: subject,
      html: html,
      reply_to: emailSettings.reply_to_email || undefined,
    });

    console.log("[send-transactional-email] Resend response:", emailResponse);

    const emailData = emailResponse.data;
    const emailError = emailResponse.error;
    const emailId = emailData?.id;

    // Log the email
    const { error: logError } = await supabase.rpc("insert_email_log", {
      p_store_id: store_id,
      p_order_id: order_id || null,
      p_email_type: email_type,
      p_recipient_email: recipient_email,
      p_recipient_name: recipient_name,
      p_subject: subject,
      p_status: emailId ? "sent" : "failed",
      p_resend_id: emailId || null,
      p_error_message: emailError ? JSON.stringify(emailError) : null,
    });

    if (logError) {
      console.error("[send-transactional-email] Error logging email:", logError);
    }

    return new Response(
      JSON.stringify({
        success: !!emailId,
        email_id: emailId,
        error: emailError,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[send-transactional-email] Error:", error);
    
    // Log critical email error
    await logErrorToDb({
      category: "email",
      severity: "high",
      message: `Falha ao enviar email transacional: ${error.message}`,
      stackTrace: error.stack,
      context: {
        function: "send-transactional-email",
        error: error.message,
      },
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
