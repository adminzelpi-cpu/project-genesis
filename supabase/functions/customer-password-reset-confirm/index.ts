import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  corsHeaders,
  hashPassword,
  signCustomerToken,
  validatePassword,
} from "../_shared/customerAuth.ts";

interface ConfirmBody {
  store_id: string;
  token: string;
  new_password: string;
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

    const { store_id, token, new_password }: ConfirmBody = await req.json();

    if (!store_id || !token || !new_password) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const pwCheck = validatePassword(new_password);
    if (!pwCheck.valid) {
      return new Response(
        JSON.stringify({ error: pwCheck.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, email, nome, platform_user_id, password_reset_token_expires_at")
      .eq("store_id", store_id)
      .eq("password_reset_token", token)
      .maybeSingle();

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (
      !customer.password_reset_token_expires_at ||
      new Date(customer.password_reset_token_expires_at) < new Date()
    ) {
      return new Response(
        JSON.stringify({ error: "Token expirado. Solicite um novo." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const password_hash = await hashPassword(new_password);

    await supabaseAdmin
      .from("customers")
      .update({
        password_hash,
        password_reset_token: null,
        password_reset_token_expires_at: null,
        email_verified: true,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer.id);

    const jwt = await signCustomerToken({
      customer_id: customer.id,
      store_id,
      email: customer.email!,
      platform_user_id: customer.platform_user_id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        token: jwt,
        customer: {
          id: customer.id,
          email: customer.email,
          nome: customer.nome,
          store_id,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[customer-password-reset-confirm] error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
