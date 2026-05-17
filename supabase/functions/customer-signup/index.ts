import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  corsHeaders,
  hashPassword,
  signCustomerToken,
  validateEmail,
  validatePassword,
} from "../_shared/customerAuth.ts";

interface SignupRequest {
  store_id: string;
  email: string;
  password: string;
  nome: string;
  telefone?: string;
  cpf?: string;
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

    const body: SignupRequest = await req.json();
    const { store_id, email, password, nome, telefone, cpf } = body;

    if (!store_id || !email || !password || !nome) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: store_id, email, password, nome" }),
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

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return new Response(
        JSON.stringify({ error: pwCheck.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (nome.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Nome deve ter pelo menos 2 caracteres" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if customer already exists IN THIS STORE
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id, password_hash, email")
      .eq("store_id", store_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing?.password_hash) {
      return new Response(
        JSON.stringify({ error: "Já existe uma conta com este email nesta loja" }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const password_hash = await hashPassword(password);

    let customerId: string;
    let platformUserId: string;

    if (existing) {
      // Customer record exists (from guest checkout) — set password & link
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("customers")
        .update({
          password_hash,
          nome: nome.trim(),
          telefone: telefone || null,
          cpf: cpf || null,
          email_verified: false,
          needs_password_setup: false,
          password_setup_token: null,
          password_setup_token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, platform_user_id")
        .single();

      if (updateErr || !updated) {
        console.error("[customer-signup] update error:", updateErr);
        return new Response(
          JSON.stringify({ error: "Erro ao criar conta" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      customerId = updated.id;
      platformUserId = updated.platform_user_id;
    } else {
      // Create new customer
      const { data: created, error: insertErr } = await supabaseAdmin
        .from("customers")
        .insert({
          store_id,
          email: normalizedEmail,
          password_hash,
          nome: nome.trim(),
          telefone: telefone || null,
          cpf: cpf || null,
          email_verified: false,
          needs_password_setup: false,
        })
        .select("id, platform_user_id")
        .single();

      if (insertErr || !created) {
        console.error("[customer-signup] insert error:", insertErr);
        const isDuplicate = insertErr?.code === "23505";
        return new Response(
          JSON.stringify({
            error: isDuplicate
              ? "Já existe uma conta com este email nesta loja"
              : "Erro ao criar conta",
          }),
          { status: isDuplicate ? 409 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      customerId = created.id;
      platformUserId = created.platform_user_id;
    }

    const token = await signCustomerToken({
      customer_id: customerId,
      store_id,
      email: normalizedEmail,
      platform_user_id: platformUserId,
    });

    // Update last_login_at
    await supabaseAdmin
      .from("customers")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", customerId);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        customer: {
          id: customerId,
          email: normalizedEmail,
          nome: nome.trim(),
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[customer-signup] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
