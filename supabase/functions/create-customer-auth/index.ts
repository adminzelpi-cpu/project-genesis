import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateCustomerAuthRequest {
  email: string;
  full_name?: string;
  customer_id: string;
  store_slug: string;
}

/**
 * Generates a password setup/reset token for a customer (per-store, store-isolated auth).
 * The customer will be sent to /redefinir-senha?token=... — same flow used by "forgot password".
 * Token is stored in `customers.password_reset_token` (NOT auth.users — that system is legacy).
 */
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

    const { email, customer_id }: CreateCustomerAuthRequest = await req.json();

    if (!email || !customer_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate secure password setup token (24h expiry).
    // We reuse password_reset_token + the /redefinir-senha page so there's only ONE flow.
    const setupToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Check if customer already has a password_hash. If yes, no need to send setup link.
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, password_hash")
      .eq("id", customer_id)
      .maybeSingle();

    if (customerError || !customer) {
      console.error("[create-customer-auth] Customer not found:", customer_id, customerError);
      return new Response(
        JSON.stringify({ error: "Customer not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (customer.password_hash) {
      // Already has a password — no setup email needed
      return new Response(
        JSON.stringify({
          success: true,
          needs_password_setup: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Write token to customers (store-isolated auth)
    const { error: updateError } = await supabaseAdmin
      .from("customers")
      .update({
        password_reset_token: setupToken,
        password_reset_token_expires_at: tokenExpiresAt,
      })
      .eq("id", customer_id);

    if (updateError) {
      console.error("[create-customer-auth] Failed to save token:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[create-customer-auth] Generated password setup token for customer ${customer_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        needs_password_setup: true,
        setup_token: setupToken,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in create-customer-auth:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
