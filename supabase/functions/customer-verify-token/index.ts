import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, verifyCustomerToken } from "../_shared/customerAuth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, store_id } = await req.json();

    if (!token || !store_id) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing token or store_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const payload = await verifyCustomerToken(token);

    if (!payload) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // CRITICAL: token must match this store
    if (payload.store_id !== store_id) {
      return new Response(
        JSON.stringify({ valid: false, error: "Token from different store" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, email, nome, store_id")
      .eq("id", payload.customer_id)
      .eq("store_id", store_id)
      .maybeSingle();

    if (!customer) {
      return new Response(
        JSON.stringify({ valid: false, error: "Customer not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        customer: {
          id: customer.id,
          email: customer.email,
          nome: customer.nome,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("[customer-verify-token] error:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
