import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("Callback recebido:", { code: !!code, state: !!state, error });

    if (error) {
      console.error("Erro no OAuth:", error);
      return new Response(
        `<html><body><script>window.opener.postMessage({type:'mp-oauth-error',error:'${error}'},'*');window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (!code || !state) {
      throw new Error("Código ou state não fornecido");
    }

    // Decode state to get storeId
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      throw new Error("State inválido");
    }

    const { storeId } = stateData;
    if (!storeId) {
      throw new Error("storeId não encontrado no state");
    }

    const clientId = Deno.env.get("MP_CLIENT_ID");
    const clientSecret = Deno.env.get("MP_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Credenciais do Mercado Pago não configuradas");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("Token response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error("Erro ao obter token:", tokenData);
      throw new Error(tokenData.message || "Erro ao obter token de acesso");
    }

    // Save tokens to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if gateway already exists
    const { data: existingGateway } = await supabase
      .from("store_payment_gateways")
      .select("id")
      .eq("store_id", storeId)
      .eq("gateway_type", "mercado_pago")
      .single();

    const gatewayData = {
      store_id: storeId,
      gateway_type: "mercado_pago",
      is_active: true,
      is_sandbox: false,
      oauth_access_token: tokenData.access_token,
      oauth_refresh_token: tokenData.refresh_token,
      oauth_user_id: tokenData.user_id?.toString(),
      oauth_expires_at: tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      verification_status: "verified",
      last_verified_at: new Date().toISOString(),
      display_name: "Mercado Pago",
    };

    if (existingGateway) {
      await supabase
        .from("store_payment_gateways")
        .update(gatewayData)
        .eq("id", existingGateway.id);
      console.log("Gateway atualizado para store:", storeId);
    } else {
      await supabase
        .from("store_payment_gateways")
        .insert(gatewayData);
      console.log("Gateway criado para store:", storeId);
    }

    // Return HTML that sends message to opener and closes
    return new Response(
      `<html><body><script>window.opener.postMessage({type:'mp-oauth-success'},'*');window.close();</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("Erro no callback:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      `<html><body><script>window.opener.postMessage({type:'mp-oauth-error',error:'${errorMessage}'},'*');window.close();</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
});
