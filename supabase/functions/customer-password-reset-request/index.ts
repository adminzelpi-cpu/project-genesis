import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  corsHeaders,
  generateSecureToken,
  validateEmail,
} from "../_shared/customerAuth.ts";

interface ResetRequestBody {
  store_id: string;
  email: string;
  reset_url_base: string; // e.g. https://loja.com/redefinir-senha
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { store_id, email, reset_url_base }: ResetRequestBody = await req.json();

    if (!store_id || !email || !reset_url_base) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Always return success to avoid email enumeration
    const successResp = new Response(
      JSON.stringify({ success: true, message: "Se o email existir, enviaremos as instruções." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, nome, email")
      .eq("store_id", store_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!customer) {
      console.log(`[password-reset-request] No customer for ${normalizedEmail} in store ${store_id}`);
      return successResp;
    }

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h

    await supabaseAdmin
      .from("customers")
      .update({
        password_reset_token: token,
        password_reset_token_expires_at: expiresAt,
      })
      .eq("id", customer.id);

    // Get store info for email branding
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("name, slug")
      .eq("id", store_id)
      .single();

    const resetLink = `${reset_url_base}?token=${encodeURIComponent(token)}`;

    // Send via existing transactional email function
    try {
      await supabaseAdmin.functions.invoke("send-transactional-email", {
        body: {
          store_id,
          email_type: "password_reset",
          recipient_email: customer.email,
          recipient_name: customer.nome ?? "",
          order_data: {
            reset_link: resetLink,
            reset_expires_in: "1 hora",
          },
        },
      });
    } catch (emailErr) {
      console.error("[password-reset-request] email send error:", emailErr);
    }

    return successResp;
  } catch (error: unknown) {
    console.error("[customer-password-reset-request] error:", error);
    return new Response(
      JSON.stringify({ success: true }), // Still generic
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
