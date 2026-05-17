// Sincroniza templates aprovados da WABA para a tabela local.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const META = "v25.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j(401, "Missing authorization");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return j(401, "Invalid user");

    const { store_id } = await req.json();
    if (!store_id) return j(400, "store_id required");

    const admin = createClient(url, serviceKey);
    const { data: store } = await admin.from("stores").select("merchant_id").eq("id", store_id).single();
    if (!store || store.merchant_id !== userData.user.id) return j(403, "Access denied");

    const { data: conn } = await admin
      .from("whatsapp_connections")
      .select("id, waba_id, access_token, status")
      .eq("store_id", store_id).single();
    if (!conn || conn.status !== "active") return j(400, "Conexão inativa");

    const res = await fetch(
      `https://graph.facebook.com/${META}/${conn.waba_id}/message_templates?limit=200&fields=id,name,language,status,category,components,rejected_reason`,
      { headers: { Authorization: `Bearer ${conn.access_token}` } }
    );
    const json = await res.json();
    if (!res.ok) return j(400, json.error?.message || "Falha ao listar templates");

    let upserted = 0;
    for (const t of json.data ?? []) {
      await admin.from("whatsapp_templates").upsert({
        store_id,
        connection_id: conn.id,
        meta_template_id: t.id,
        name: t.name,
        language: t.language,
        category: t.category,
        status: t.status,
        components: t.components ?? [],
        rejected_reason: t.rejected_reason ?? null,
        synced_at: new Date().toISOString(),
      }, { onConflict: "store_id,name,language" });
      upserted++;
    }

    return new Response(JSON.stringify({ success: true, synced: upserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return j(500, (e as Error).message);
  }
});
function j(s: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
