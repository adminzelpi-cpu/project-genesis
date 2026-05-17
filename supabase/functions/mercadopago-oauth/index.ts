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
    const { storeId, redirectUri } = await req.json();
    
    if (!storeId) {
      throw new Error("storeId é obrigatório");
    }

    const clientId = Deno.env.get("MP_CLIENT_ID");
    
    if (!clientId) {
      console.error("MP_CLIENT_ID não configurado");
      return new Response(
        JSON.stringify({ 
          error: "Mercado Pago não configurado. Configure as credenciais primeiro.",
          code: "CREDENTIALS_NOT_CONFIGURED"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Generate state with storeId for security and tracking
    const state = btoa(JSON.stringify({ storeId, timestamp: Date.now() }));
    
    // Mercado Pago OAuth URL
    const authUrl = new URL("https://auth.mercadopago.com/authorization");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("redirect_uri", redirectUri || `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-callback`);
    authUrl.searchParams.set("state", state);

    console.log(`OAuth iniciado para store ${storeId}`);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString(), state }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Erro ao iniciar OAuth:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
