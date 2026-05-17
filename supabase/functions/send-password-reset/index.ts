import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ResetRequest {
  email: string;
  store_id?: string;
  redirect_url: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, store_id, redirect_url }: ResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-password-reset] Generating reset link for ${email}`);

    // Generate the password reset link using admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirect_url,
      },
    });

    if (linkError) {
      console.error("[send-password-reset] Error generating link:", linkError);
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the actual confirmation URL with tokens
    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      console.error("[send-password-reset] No action link generated");
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-password-reset] Action link generated successfully`);

    // Get store branding if store_id provided
    let storeName = "Zelpi";
    let storeLogo: string | null = null;
    let primaryColor = "#4F46E5";

    if (store_id) {
      const { data: store } = await supabase
        .from("stores")
        .select("name, logo_url")
        .eq("id", store_id)
        .single();

      if (store) {
        storeName = store.name || storeName;
        storeLogo = store.logo_url;
      }

      // Get sender name from email settings
      const { data: emailSettings } = await supabase
        .from("store_email_settings")
        .select("sender_name")
        .eq("store_id", store_id)
        .single();

      if (emailSettings?.sender_name) {
        storeName = emailSettings.sender_name;
      }
    }

    const backgroundColor = "#e2e8f0";

    // Build email HTML
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinir Senha</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${backgroundColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${backgroundColor};">
          <tr>
            <td style="padding: 24px 16px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${primaryColor} 0%, #7C3AED 100%); padding: 20px 24px; text-align: center;">
                    ${storeLogo 
                      ? `<img src="${storeLogo}" alt="${storeName}" style="max-height: 48px; max-width: 180px;">`
                      : `<h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${storeName}</h1>`
                    }
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 28px 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                      <span style="display: inline-block; padding: 10px 20px; background-color: #dbeafe; color: #1e40af; font-size: 15px; font-weight: 600; border-radius: 50px;">
                        🔐 Redefinição de Senha
                      </span>
                    </div>
                    
                    <h2 style="margin: 0 0 6px 0; color: #1f2937; font-size: 22px; text-align: center;">Redefinir sua senha</h2>
                    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.5; text-align: center;">
                      Recebemos sua solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
                    </p>
                    
                    <div style="text-align: center; margin: 24px 0;">
                      <a href="${actionLink}" style="display: inline-block; padding: 14px 32px; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        Redefinir Senha
                      </a>
                    </div>
                    
                    <div style="padding: 16px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 24px 0;">
                      <p style="margin: 0; color: #92400e; font-size: 13px;">
                        ⚠️ Este link é válido por <strong>24 horas</strong>. Após esse período, você precisará solicitar um novo link.
                      </p>
                    </div>
                    
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                      Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanecerá inalterada.
                    </p>
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

    // Send via Resend
    const senderEmail = "noreply@zelpi.com.br";
    const emailResponse = await resend.emails.send({
      from: `${storeName} <${senderEmail}>`,
      to: [email],
      subject: `🔐 Redefinir senha - ${storeName}`,
      html,
    });

    console.log("[send-password-reset] Resend response:", emailResponse);

    if (emailResponse.error) {
      console.error("[send-password-reset] Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-password-reset] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
