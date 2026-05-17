import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactRequest {
  store_id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildMerchantEmail(opts: {
  storeName: string;
  storeLogo?: string | null;
  primaryColor: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
}): string {
  const { storeName, storeLogo, primaryColor, customerName, customerEmail, subject, message } = opts;
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e2e8f0;">
    <tr><td style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <tr><td style="background:${primaryColor};padding:20px 24px;text-align:center;">
          ${storeLogo
            ? `<img src="${storeLogo}" alt="${escapeHtml(storeName)}" style="max-height:48px;max-width:180px;">`
            : `<h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${escapeHtml(storeName)}</h1>`}
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <h2 style="margin:0 0 6px 0;color:#1f2937;font-size:20px;">📬 Nova mensagem de contato</h2>
          <p style="margin:0 0 20px 0;color:#6b7280;font-size:14px;">Você recebeu uma nova mensagem através da página de contato da sua loja.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:90px;">Nome:</td>
                <td style="padding:6px 0;color:#1f2937;font-size:14px;font-weight:600;">${escapeHtml(customerName)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">E-mail:</td>
                <td style="padding:6px 0;color:#1f2937;font-size:14px;"><a href="mailto:${escapeHtml(customerEmail)}" style="color:${primaryColor};text-decoration:none;">${escapeHtml(customerEmail)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Assunto:</td>
                <td style="padding:6px 0;color:#1f2937;font-size:14px;">${escapeHtml(subject)}</td></tr>
          </table>

          <div style="border-left:3px solid ${primaryColor};padding:12px 16px;background:#f8fafc;border-radius:4px;">
            <p style="margin:0 0 6px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Mensagem</p>
            <p style="margin:0;color:#1f2937;font-size:14px;line-height:1.6;">${nl2br(message)}</p>
          </div>

          <div style="text-align:center;margin-top:24px;">
            <a href="mailto:${escapeHtml(customerEmail)}?subject=${encodeURIComponent("Re: " + subject)}" style="display:inline-block;padding:12px 24px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
              Responder ao cliente
            </a>
          </div>

          <p style="margin:20px 0 0 0;color:#9ca3af;font-size:12px;text-align:center;">
            💡 Basta clicar em "Responder" no seu app de e-mail — a resposta vai direto para o cliente.
          </p>
        </td></tr>
        <tr><td style="background:#f1f5f9;padding:14px 24px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">Mensagem recebida via formulário de contato de <strong>${escapeHtml(storeName)}</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildCustomerCopy(opts: {
  storeName: string;
  storeLogo?: string | null;
  primaryColor: string;
  customerName: string;
  subject: string;
  message: string;
}): string {
  const { storeName, storeLogo, primaryColor, customerName, subject, message } = opts;
  const firstName = customerName.trim().split(/\s+/)[0] || "cliente";
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e2e8f0;">
    <tr><td style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        <tr><td style="background:${primaryColor};padding:20px 24px;text-align:center;">
          ${storeLogo
            ? `<img src="${storeLogo}" alt="${escapeHtml(storeName)}" style="max-height:48px;max-width:180px;">`
            : `<h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${escapeHtml(storeName)}</h1>`}
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <h2 style="margin:0 0 6px 0;color:#1f2937;font-size:22px;">Olá, ${escapeHtml(firstName)}!</h2>
          <p style="margin:0 0 16px 0;color:#4b5563;font-size:15px;line-height:1.5;">
            Recebemos sua mensagem e responderemos o mais rápido possível. Obrigado por entrar em contato! 💙
          </p>

          <p style="margin:24px 0 8px 0;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Sua mensagem</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:16px;">
            <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:80px;">Assunto:</td>
                <td style="padding:4px 0;color:#1f2937;font-size:14px;">${escapeHtml(subject)}</td></tr>
          </table>
          <div style="border-left:3px solid ${primaryColor};padding:12px 16px;background:#f8fafc;border-radius:4px;">
            <p style="margin:0;color:#1f2937;font-size:14px;line-height:1.6;">${nl2br(message)}</p>
          </div>

          <p style="margin:24px 0 0 0;color:#6b7280;font-size:13px;text-align:center;">
            Esta é apenas uma cópia da mensagem que você enviou.
          </p>
        </td></tr>
        <tr><td style="background:#f1f5f9;padding:14px 24px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">Equipe <strong>${escapeHtml(storeName)}</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ContactRequest;

    // ==== Validation ====
    if (!body.store_id || !body.name || !body.email || !body.message) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const name = body.name.trim().slice(0, 120);
    const email = body.email.trim().toLowerCase().slice(0, 200);
    const subject = (body.subject?.trim() || "Contato via loja").slice(0, 200);
    const message = body.message.trim().slice(0, 5000);

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (name.length < 2 || message.length < 5) {
      return new Response(
        JSON.stringify({ error: "Nome ou mensagem muito curtos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==== Load store ====
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, email, logo_url, theme_primary_color")
      .eq("id", body.store_id)
      .maybeSingle();

    if (storeErr || !store) {
      return new Response(
        JSON.stringify({ error: "Loja não encontrada." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!store.email) {
      return new Response(
        JSON.stringify({ error: "Esta loja não possui e-mail de contato configurado.", code: "no_merchant_email" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const primaryColor = (store as any).theme_primary_color || "#4F46E5";
    const fromAddress = `${store.name} <noreply@zelpi.com.br>`;

    // ==== 1) Send to merchant ====
    const merchantHtml = buildMerchantEmail({
      storeName: store.name,
      storeLogo: store.logo_url,
      primaryColor,
      customerName: name,
      customerEmail: email,
      subject,
      message,
    });

    const merchantSend = await resend.emails.send({
      from: fromAddress,
      to: [store.email],
      reply_to: email,
      subject: `[Contato] ${subject} — ${name}`,
      html: merchantHtml,
    });

    if ((merchantSend as any).error) {
      console.error("[send-contact-message] merchant send error:", (merchantSend as any).error);
      return new Response(
        JSON.stringify({ error: "Falha ao enviar mensagem. Tente novamente." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ==== 2) Send copy to customer (best-effort) ====
    const customerHtml = buildCustomerCopy({
      storeName: store.name,
      storeLogo: store.logo_url,
      primaryColor,
      customerName: name,
      subject,
      message,
    });

    try {
      await resend.emails.send({
        from: fromAddress,
        to: [email],
        reply_to: store.email,
        subject: `Recebemos sua mensagem — ${store.name}`,
        html: customerHtml,
      });
    } catch (e) {
      console.warn("[send-contact-message] customer copy failed (non-fatal):", e);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-contact-message] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro inesperado." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
