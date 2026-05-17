import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { accessToken, storeId, publicKey } = await req.json();

    if (!accessToken || !storeId) {
      return new Response(
        JSON.stringify({ valid: false, error: "Access Token e Store ID são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate public key format (optional but recommended for card payments)
    const trimmedPublicKey = typeof publicKey === "string" ? publicKey.trim() : "";
    if (trimmedPublicKey && !/^(APP_USR-|TEST-)/.test(trimmedPublicKey)) {
      return new Response(
        JSON.stringify({ valid: false, error: "Public Key inválida. Deve começar com APP_USR- ou TEST-." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure access token and public key are from the same environment
    const tokenIsTest = accessToken.startsWith("TEST-");
    const keyIsTest = trimmedPublicKey.startsWith("TEST-");
    if (trimmedPublicKey && tokenIsTest !== keyIsTest) {
      return new Response(
        JSON.stringify({ valid: false, error: "Access Token e Public Key devem ser do mesmo ambiente (ambos produção ou ambos teste)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the access token by making a test request to MP API
    const response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ valid: false, error: "Access Token inválido. Verifique se copiou corretamente." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await response.json();
    console.log("MP User:", userData.id, userData.email);

    // Check if gateway already exists for this store
    const { data: existingGateway } = await supabase
      .from("store_payment_gateways")
      .select("id")
      .eq("store_id", storeId)
      .eq("gateway_type", "mercado_pago")
      .maybeSingle();

    if (existingGateway) {
      // Deactivate all other gateways for this store
      await supabase
        .from("store_payment_gateways")
        .update({ is_active: false })
        .eq("store_id", storeId)
        .neq("id", existingGateway.id);

      // Update existing gateway with manual credentials
      const { error: updateError } = await supabase
        .from("store_payment_gateways")
        .update({
          oauth_access_token: accessToken,
          oauth_refresh_token: null, // No refresh for manual tokens
          oauth_user_id: userData.id?.toString(),
          oauth_expires_at: null, // Manual tokens don't expire automatically
          is_active: true,
          is_sandbox: accessToken.startsWith("TEST-"),
          verification_status: "verified",
          last_verified_at: new Date().toISOString(),
          display_name: userData.email || `MP ${userData.id}`,
          credentials: {
            connection_type: "manual",
            user_email: userData.email,
            ...(trimmedPublicKey ? { public_key: trimmedPublicKey } : {}),
          },
        })
        .eq("id", existingGateway.id);

      if (updateError) throw updateError;
    } else {
      // Deactivate all other gateways for this store
      await supabase
        .from("store_payment_gateways")
        .update({ is_active: false })
        .eq("store_id", storeId);

      // Create new gateway
      const { error: insertError } = await supabase
        .from("store_payment_gateways")
        .insert({
          store_id: storeId,
          gateway_type: "mercado_pago",
          oauth_access_token: accessToken,
          oauth_refresh_token: null,
          oauth_user_id: userData.id?.toString(),
          oauth_expires_at: null,
          is_active: true,
          is_sandbox: accessToken.startsWith("TEST-"),
          verification_status: "verified",
          last_verified_at: new Date().toISOString(),
          display_name: userData.email || `MP ${userData.id}`,
          credentials: {
            connection_type: "manual",
            user_email: userData.email,
            ...(trimmedPublicKey ? { public_key: trimmedPublicKey } : {}),
          },
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        userId: userData.id,
        email: userData.email,
        isSandbox: accessToken.startsWith("TEST-"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao validar token MP:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
