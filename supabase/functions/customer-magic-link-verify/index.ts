/**
 * customer-magic-link-verify
 *
 * Validates a magic link token and issues a FULL-scope JWT (30 days).
 * Tokens are stored as SHA-256 hashes; we hash the incoming token and
 * lookup by hash. One-shot: token row is cleared on success so the link
 * cannot be replayed.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, signCustomerToken } from "../_shared/customerAuth.ts";

interface VerifyBody {
  store_id: string;
  token: string;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    const { store_id, token }: VerifyBody = await req.json();

    if (!store_id || !token) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const tokenHash = await sha256Hex(token);

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, email, nome, platform_user_id, magic_link_token_expires_at")
      .eq("store_id", store_id)
      .eq("magic_link_token", tokenHash)
      .maybeSingle();

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Link inválido ou já utilizado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (
      !customer.magic_link_token_expires_at ||
      new Date(customer.magic_link_token_expires_at) < new Date()
    ) {
      await supabaseAdmin
        .from("customers")
        .update({ magic_link_token: null, magic_link_token_expires_at: null })
        .eq("id", customer.id);

      return new Response(
        JSON.stringify({ error: "Link expirado. Solicite um novo." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // One-shot: invalidate token, promote to verified, mark login.
    await supabaseAdmin
      .from("customers")
      .update({
        magic_link_token: null,
        magic_link_token_expires_at: null,
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
      scope: "full",
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
    console.error("[customer-magic-link-verify] error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
