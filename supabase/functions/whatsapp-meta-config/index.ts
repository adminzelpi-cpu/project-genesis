const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_GRAPH_VERSION = "v25.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const appId = Deno.env.get("META_APP_ID");
  const configId = Deno.env.get("META_CONFIG_ID");

  if (!appId || !configId) {
    return new Response(JSON.stringify({ error: "Credenciais do Meta não configuradas" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    app_id: appId,
    config_id: configId,
    sdk_version: META_GRAPH_VERSION,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});