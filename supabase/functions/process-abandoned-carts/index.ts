import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getStorePublicUrl } from "../_shared/storeUrl.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AbandonedCart {
  id: string;
  store_id: string;
  customer_email: string;
  customer_name: string | null;
  cart_items: CartItem[];
  cart_total: number;
  abandoned_at: string;
  recovery_token: string;
  emails_sent: number;
  last_email_sent_at: string | null;
}

interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  variation?: string;
}

interface StoreSettings {
  abandoned_cart_enabled: boolean;
  abandoned_cart_delay_1: number;
  abandoned_cart_delay_2: number;
  abandoned_cart_delay_3: number;
  abandoned_cart_subject_1: string | null;
  abandoned_cart_preheader_1: string | null;
  abandoned_cart_body_1: string | null;
  abandoned_cart_enabled_1: boolean;
  abandoned_cart_subject_2: string | null;
  abandoned_cart_preheader_2: string | null;
  abandoned_cart_body_2: string | null;
  abandoned_cart_enabled_2: boolean;
  abandoned_cart_subject_3: string | null;
  abandoned_cart_preheader_3: string | null;
  abandoned_cart_body_3: string | null;
  abandoned_cart_enabled_3: boolean;
  sender_name: string | null;
  reply_to_email: string | null;
}

interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  theme_primary_color: string | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function replaceVariables(text: string, cart: AbandonedCart, store: Store): string {
  const firstName = (cart.customer_name || "Cliente").trim().split(/\s+/)[0];
  return text
    .replace(/\{\{customer_name\}\}/g, firstName)
    .replace(/\{\{store_name\}\}/g, store.name)
    .replace(/\{\{cart_total\}\}/g, formatCurrency(cart.cart_total))
    .replace(/\{\{products_count\}\}/g, String(cart.cart_items?.length || 0));
}

/**
 * Ensures a color has enough contrast for white text on both light and dark email themes.
 */
function getSafeButtonColor(hex: string): string {
  try {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance < 0.15 || luminance > 0.85) return "#4F46E5";
    return hex;
  } catch {
    return "#4F46E5";
  }
}

function generateEmailHtml(
  store: Store,
  cart: AbandonedCart,
  emailNumber: number,
  customMessage: string | null,
  customPreheader: string | null,
  trackingId: string,
  siteBaseUrl: string,
): string {
  const rawPrimaryColor = store.theme_primary_color || "#4F46E5";
  const primaryColor = getSafeButtonColor(rawPrimaryColor);
  const recoveryUrl = `${siteBaseUrl}/recover-cart?token=${cart.recovery_token}`;
  
  // Tracking URLs - use env variable directly
  const sbUrl = Deno.env.get("SUPABASE_URL") || "";
  const trackingPixelUrl = `${sbUrl}/functions/v1/email-tracking?t=${trackingId}&a=o`;
  const trackedCTAUrl = `${sbUrl}/functions/v1/email-tracking?t=${trackingId}&a=c&r=${encodeURIComponent(recoveryUrl)}`;
  
  const defaultMessages = [
    { 
      emoji: "🛒", 
      title: "Você esqueceu algo!", 
      message: "Notamos que você deixou alguns itens no carrinho. Sabemos que às vezes a vida acontece - por isso guardamos tudo pra você!",
      preheader: "Os itens que você escolheu ainda estão aqui esperando por você."
    },
    { 
      emoji: "⏰", 
      title: "Seus produtos estão esperando", 
      message: "Os produtos que você selecionou continuam disponíveis. Muitos clientes estão de olho nesses mesmos itens - garanta o seu antes que acabe!",
      preheader: "Não deixe escapar! Seus itens estão reservados por tempo limitado."
    },
    { 
      emoji: "🔥", 
      title: "Última chance!", 
      message: "Esta é nossa última tentativa de te lembrar. Os itens do seu carrinho estão prestes a expirar. Finalize agora e receba em poucos dias!",
      preheader: "Esta é sua última chance de garantir os produtos do seu carrinho."
    },
  ];

  const defaults = defaultMessages[emailNumber - 1] || defaultMessages[0];
  
  const finalMessage = replaceVariables(customMessage || defaults.message, cart, store);
  const finalPreheader = replaceVariables(customPreheader || defaults.preheader, cart, store);
  const customerName = (cart.customer_name || "Cliente").trim().split(/\s+/)[0];

  // Get products to show (max 4) and count extras
  const productsToShow = (cart.cart_items || []).slice(0, 4);
  const extraProductsCount = Math.max(0, (cart.cart_items?.length || 0) - 4);

  // Generate product list HTML (1 per row, same as transactional emails)
  const productsHtml = productsToShow.map((item: CartItem) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; width: 84px;">
        ${item.image_url 
          ? `<img src="${item.image_url}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: contain; background-color: #ffffff; border-radius: 8px; display: block; border: 1px solid #e2e8f0;">`
          : `<div style="width: 80px; height: 80px; background-color: #f1f5f9; border-radius: 8px;"></div>`
        }
      </td>
      <td width="100%" style="padding: 12px 0 12px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; width: 100%;">
        <p style="margin: 0 0 4px 0; font-weight: 500; color: #1f2937; font-size: 14px; line-height: 1.35;">${item.name}</p>
        ${item.variation ? `<p style="margin: 0 0 2px 0; font-size: 12px; color: #6b7280;">${item.variation}</p>` : ''}
        <p style="margin: 0; font-size: 12px; color: #6b7280;">Qtd: ${item.quantity}</p>
      </td>
      <td width="1" style="padding: 12px 0 12px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: bottom; text-align: right; white-space: nowrap;">
        <p style="margin: 0; font-weight: 600; color: ${primaryColor}; font-size: 14px;">${formatCurrency(item.price * item.quantity)}</p>
        ${item.quantity > 1
          ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #9ca3af;">${formatCurrency(item.price)} cada</p>`
          : ''
        }
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${store.name}</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
      <style>
        @media only screen and (max-width: 600px) {
          .email-container { width: 100% !important; padding: 16px !important; }
          .content-padding { padding: 24px 16px !important; }
          .header-padding { padding: 24px 16px !important; }
          .product-table { width: 100% !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <!-- Preheader text (hidden) -->
      <div style="display: none; max-height: 0px; overflow: hidden;">
        ${finalPreheader}
        &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
      </div>
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #e2e8f0;">
        <tr>
          <td style="padding: 32px 16px;">
            <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              
              <!-- Header -->
              <tr>
                <td class="header-padding" style="background-color: ${primaryColor}; padding: 28px 24px; text-align: center;">
                  ${store.logo_url 
                    ? `<img src="${store.logo_url}" alt="${store.name}" style="max-height: 48px; max-width: 180px;">`
                    : `<h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">${store.name}</h1>`
                  }
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td class="content-padding" style="padding: 32px 24px;">
                  
                  <!-- Emoji & Title -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 40px; line-height: 1;">${defaults.emoji}</span>
                    <h2 style="margin: 12px 0 8px 0; color: #1f2937; font-size: 20px; font-weight: 700;">${defaults.title}</h2>
                    <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                      Olá${customerName !== 'Cliente' ? `, ${customerName}` : ''}! ${finalMessage}
                    </p>
                  </div>

                  <!-- Products List -->
                  <table role="presentation" class="product-table" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px; border-collapse: collapse;">
                    ${productsHtml}
                  </table>

                  ${extraProductsCount > 0 ? `
                  <p style="text-align: center; font-size: 13px; color: #6b7280; margin: 0 0 16px 0;">
                    + ${extraProductsCount} ${extraProductsCount === 1 ? 'item' : 'itens'} no carrinho
                  </p>
                  ` : ''}

                  <!-- Cart Total -->
                  <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                    <span style="font-size: 13px; color: #6b7280; display: block; margin-bottom: 4px;">Total do carrinho</span>
                    <span style="font-size: 28px; font-weight: 800; color: ${primaryColor}; letter-spacing: -1px;">${formatCurrency(cart.cart_total)}</span>
                  </div>

                  <!-- CTA Button - Above the fold, prominent (tracked) -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="text-align: center;">
                        <a href="${trackedCTAUrl}" style="display: inline-block; max-width: 100%; padding: 16px 32px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; text-align: center; box-sizing: border-box; -webkit-text-size-adjust: none; mso-line-height-rule: exactly;">
                          Finalizar Compra &#8599;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 11px; text-align: center; line-height: 1.5;">
                    Se você não iniciou esta compra, por favor ignore este e-mail.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 13px;">
                    Este e-mail foi enviado por <strong>${store.name}</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!-- Tracking pixel (invisible) -->
      <img src="${trackingPixelUrl}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;border:0;" />
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[process-abandoned-carts] Starting processing...");

    // Get all stores with abandoned cart enabled
    const { data: storeSettings, error: settingsError } = await supabase
      .from("store_email_settings")
      .select(`
        store_id, abandoned_cart_enabled, 
        abandoned_cart_delay_1, abandoned_cart_delay_2, abandoned_cart_delay_3,
        abandoned_cart_subject_1, abandoned_cart_preheader_1, abandoned_cart_body_1, abandoned_cart_enabled_1,
        abandoned_cart_subject_2, abandoned_cart_preheader_2, abandoned_cart_body_2, abandoned_cart_enabled_2,
        abandoned_cart_subject_3, abandoned_cart_preheader_3, abandoned_cart_body_3, abandoned_cart_enabled_3,
        sender_name, reply_to_email
      `)
      .eq("abandoned_cart_enabled", true);

    if (settingsError) {
      console.error("[process-abandoned-carts] Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!storeSettings || storeSettings.length === 0) {
      console.log("[process-abandoned-carts] No stores with abandoned cart enabled");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalProcessed = 0;
    const now = new Date();

    for (const settings of storeSettings) {
      // Get store info
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, theme_primary_color")
        .eq("id", settings.store_id)
        .single();

      if (storeError || !store) {
        console.error(`[process-abandoned-carts] Error fetching store ${settings.store_id}:`, storeError);
        continue;
      }

      // Resolve public URL once per store (custom domain → fallback)
      const siteBaseUrl = await getStorePublicUrl(supabase, { id: store.id, slug: store.slug });

      // Get abandoned carts that need emails
      // Only process carts older than 15 minutes (grace period)
      const gracePeriodCutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      
      const { data: carts, error: cartsError } = await supabase
        .from("abandoned_carts")
        .select("*")
        .eq("store_id", settings.store_id)
        .is("recovered_at", null)
        .lt("emails_sent", 3)
        .lt("abandoned_at", gracePeriodCutoff);

      if (cartsError) {
        console.error(`[process-abandoned-carts] Error fetching carts for store ${store.name}:`, cartsError);
        continue;
      }

      if (!carts || carts.length === 0) {
        continue;
      }

      const delays = [
        settings.abandoned_cart_delay_1 || 60,
        settings.abandoned_cart_delay_2 || 1440,
        settings.abandoned_cart_delay_3 || 4320,
      ];

      for (const cart of carts) {
        const abandonedAt = new Date(cart.abandoned_at);
        const emailNumber = cart.emails_sent + 1;
        const delayMinutes = delays[cart.emails_sent];
        
        if (!delayMinutes) continue;

        // Check if this specific email is enabled
        const emailEnabledKey = `abandoned_cart_enabled_${emailNumber}` as keyof typeof settings;
        const isEmailEnabled = settings[emailEnabledKey] !== false;
        if (!isEmailEnabled) continue;

        const shouldSendAt = new Date(abandonedAt.getTime() + delayMinutes * 60 * 1000);
        
        // Check if it's time to send
        if (now < shouldSendAt) {
          continue;
        }

        // Check if we already sent an email recently (within 1 hour buffer)
        if (cart.last_email_sent_at) {
          const lastSent = new Date(cart.last_email_sent_at);
          const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          if (lastSent > hourAgo) {
            continue;
          }
        }

        // Get custom content for this email
        const subjectKey = `abandoned_cart_subject_${emailNumber}` as keyof typeof settings;
        const preheaderKey = `abandoned_cart_preheader_${emailNumber}` as keyof typeof settings;
        const bodyKey = `abandoned_cart_body_${emailNumber}` as keyof typeof settings;
        
        const defaultSubjects = [
          `🛒 Você esqueceu algo no carrinho!`,
          `⏰ Seus produtos ainda estão esperando`,
          `🔥 Última chance - Finalize sua compra!`,
        ];
        
        const customSubject = (settings[subjectKey] as string) || defaultSubjects[emailNumber - 1];
        const customPreheader = (settings[preheaderKey] as string) || null;
        const customBody = (settings[bodyKey] as string) || null;

        // Replace variables in subject
        const finalSubject = replaceVariables(customSubject, cart, store);

        try {
          // Generate a tracking ID for this email
          const trackingId = crypto.randomUUID();
          
          const html = generateEmailHtml(store, cart, emailNumber, customBody, customPreheader, trackingId, siteBaseUrl);
          
          const { error: emailError } = await resend.emails.send({
            from: settings.sender_name 
              ? `${settings.sender_name} <noreply@zelpi.com.br>` 
              : `${store.name} <noreply@zelpi.com.br>`,
            to: [cart.customer_email],
            subject: finalSubject,
            html,
            reply_to: settings.reply_to_email || undefined,
          });

          if (emailError) {
            console.error(`[process-abandoned-carts] Error sending email to ${cart.customer_email}:`, emailError);
            continue;
          }

          // Update cart with email sent info
          await supabase
            .from("abandoned_carts")
            .update({
              emails_sent: emailNumber,
              last_email_sent_at: now.toISOString(),
            })
            .eq("id", cart.id);

          // Log the email with tracking_id and abandoned_cart_id
          await supabase
            .from("email_logs")
            .insert({
              store_id: store.id,
              email_type: `abandoned_cart_${emailNumber}`,
              recipient_email: cart.customer_email,
              recipient_name: cart.customer_name || "",
              subject: finalSubject,
              status: "sent",
              sent_at: now.toISOString(),
              tracking_id: trackingId,
              abandoned_cart_id: cart.id,
            });

          console.log(`[process-abandoned-carts] Sent email ${emailNumber} to ${cart.customer_email} for store ${store.name}`);
          totalProcessed++;
        } catch (error) {
          console.error(`[process-abandoned-carts] Error processing cart ${cart.id}:`, error);
        }
      }
    }

    console.log(`[process-abandoned-carts] Processed ${totalProcessed} emails`);

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-abandoned-carts] Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
