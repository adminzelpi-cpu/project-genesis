import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  corsHeaders,
  verifyPassword,
  signCustomerToken,
  validateEmail,
} from "../_shared/customerAuth.ts";

interface LoginRequest {
  store_id: string;
  email: string;
  password: string;
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

    const { store_id, email, password }: LoginRequest = await req.json();

    if (!store_id || !email || !password) {
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

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, email, nome, password_hash, platform_user_id, auth_user_id, needs_password_setup")
      .eq("store_id", store_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    // Generic error to avoid email enumeration
    const invalidResponse = () =>
      new Response(
        JSON.stringify({ error: "Email ou senha incorretos" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    if (!customer) {
      return invalidResponse();
    }

    // Legacy customer (no password_hash) — needs password setup migration
    if (!customer.password_hash) {
      return new Response(
        JSON.stringify({
          error: "needs_password_setup",
          message: "Você precisa definir uma senha para esta loja. Use 'Esqueci minha senha'.",
          needs_password_setup: true,
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const ok = await verifyPassword(password, customer.password_hash);
    if (!ok) {
      return invalidResponse();
    }

    const token = await signCustomerToken({
      customer_id: customer.id,
      store_id,
      email: customer.email!,
      platform_user_id: customer.platform_user_id,
    });

    await supabaseAdmin
      .from("customers")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", customer.id);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        customer: {
          id: customer.id,
          email: customer.email,
          nome: customer.nome,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[customer-login] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
