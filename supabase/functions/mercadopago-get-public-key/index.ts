import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Returns the Mercado Pago public_key for a given store.
// Public key is safe to expose to the browser (used by MP's SDK to tokenize cards client-side).
// In the manual (token-only) flow, the merchant must save the public_key alongside the access token.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { storeId } = await req.json();
    if (!storeId || typeof storeId !== "string") {
      return new Response(
        JSON.stringify({ error: "storeId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: gateway, error: gwError } = await supabase
      .from("store_payment_gateways")
      .select("credentials")
      .eq("store_id", storeId)
      .eq("gateway_type", "mercado_pago")
      .eq("is_active", true)
      .maybeSingle();

    if (gwError || !gateway) {
      return new Response(
        JSON.stringify({ error: "Mercado Pago não configurado para esta loja" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = (gateway.credentials as Record<string, unknown>) || {};
    const publicKey = credentials.public_key as string | undefined;

    if (!publicKey || typeof publicKey !== "string" || publicKey.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "Public Key do Mercado Pago não configurada. Acesse Configurações de Pagamento e informe a Public Key junto com o Access Token.",
          code: "PUBLIC_KEY_MISSING",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ publicKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("mercadopago-get-public-key error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
