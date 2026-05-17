import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ValidateKeyRequest {
  apiKey: string;
  storeId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { apiKey, storeId }: ValidateKeyRequest = await req.json();

    if (!apiKey || !storeId) {
      return new Response(
        JSON.stringify({ valid: false, error: "Chave e ID da loja são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key by making a test request to Pagar.me
    const authToken = btoa(`${apiKey}:`);
    
    const response = await fetch("https://api.pagar.me/core/v5/customers?size=1", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Pagar.me validation error:", response.status, errorData);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ valid: false, error: "Chave de API inválida ou sem permissão" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ valid: false, error: "Erro ao validar chave" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Key is valid, save or update gateway configuration
    const isSandbox = apiKey.startsWith("sk_test_");
    
    // Check if gateway already exists
    const { data: existingGateway } = await supabase
      .from("store_payment_gateways")
      .select("id")
      .eq("store_id", storeId)
      .eq("gateway_type", "pagarme")
      .single();

    const gatewayData = {
      store_id: storeId,
      gateway_type: "pagarme",
      is_active: true,
      is_sandbox: isSandbox,
      credentials: { api_key: apiKey },
      verification_status: "verified",
      last_verified_at: new Date().toISOString(),
      display_name: isSandbox ? "Pagar.me (Teste)" : "Pagar.me",
    };

    if (existingGateway) {
      // Deactivate all other gateways for this store
      await supabase
        .from("store_payment_gateways")
        .update({ is_active: false })
        .eq("store_id", storeId)
        .neq("id", existingGateway.id);

      // Update existing gateway
      const { error: updateError } = await supabase
        .from("store_payment_gateways")
        .update(gatewayData)
        .eq("id", existingGateway.id);

      if (updateError) {
        console.error("Error updating gateway:", updateError);
        throw updateError;
      }
    } else {
      // Deactivate all other gateways for this store
      await supabase
        .from("store_payment_gateways")
        .update({ is_active: false })
        .eq("store_id", storeId);

      // Create new gateway
      const { error: insertError } = await supabase
        .from("store_payment_gateways")
        .insert(gatewayData);

      if (insertError) {
        console.error("Error inserting gateway:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ valid: true, sandbox: isSandbox }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error validating Pagar.me key:", error);
    return new Response(
      JSON.stringify({ valid: false, error: "Erro interno ao validar chave" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
