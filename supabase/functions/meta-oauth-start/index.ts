import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_GRAPH_VERSION = "v25.0";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storeId, redirectUrl } = await req.json();
    if (!storeId) {
      return new Response(JSON.stringify({ error: "storeId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = btoa(JSON.stringify({
      storeId,
      userId: user.id,
      redirectUrl: redirectUrl || "https://admin.zelpi.com.br/dashboard/channels/facebook-instagram",
      timestamp: Date.now(),
    }));

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/meta-oauth-callback`;
    const metaAppId = Deno.env.get("META_APP_ID");

    if (!metaAppId) {
      return new Response(JSON.stringify({ error: "META_APP_ID não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use explicit scopes to show all asset selection screens
    const scopes = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_ads",
      "business_management",
      "ads_management",
      "ads_read",
      "catalog_management",
      "instagram_basic",
      "instagram_manage_insights",
    ].join(",");

    const authUrl = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
    authUrl.searchParams.set("client_id", metaAppId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("response_type", "code");

    console.log(`Meta OAuth started (Login for Business) for store ${storeId}, user ${user.id}`);

    return new Response(
      JSON.stringify({ authUrl: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error starting Meta OAuth:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
