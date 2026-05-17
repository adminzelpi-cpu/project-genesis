// Envia mensagem de texto livre (resposta no inbox, dentro da janela 24h).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { metaFetchWithRetry } from "../_shared/whatsappFetch.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return j(401, "Invalid user");

    const { conversation_id, body } = await req.json();
    if (!conversation_id || !body || typeof body !== "string") {
      return j(400, "conversation_id and body required");
    }
    if (body.length > 4096) return j(400, "Mensagem muito longa");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: conv } = await admin
      .from("whatsapp_conversations")
      .select("id, store_id, contact_phone, connection_id, phone_number_id, stores!inner(merchant_id), whatsapp_phone_numbers(phone_number_id)")
      .eq("id", conversation_id).single();
    if (!conv) return j(404, "Conversa não encontrada");
    if ((conv as any).stores.merchant_id !== userData.user.id) return j(403, "Access denied");

    const { data: connection } = await admin
      .from("whatsapp_connections")
      .select("access_token, status")
      .eq("id", conv.connection_id).single();
    if (!connection || connection.status !== "active") return j(400, "Conexão inativa");

    const phoneMetaId = (conv as any).whatsapp_phone_numbers?.phone_number_id;
    if (!phoneMetaId) return j(400, "Número não configurado");

    // Ensure WABA is subscribed to our app's webhooks (idempotent).
    // Without this, status updates (delivered/read/failed) never arrive.
    try {
      const { data: connFull } = await admin
        .from("whatsapp_connections")
        .select("waba_id")
        .eq("id", conv.connection_id).single();
      if (connFull?.waba_id) {
        await fetch(`https://graph.facebook.com/${META}/${connFull.waba_id}/subscribed_apps`, {
          method: "POST",
          headers: { Authorization: `Bearer ${connection.access_token}`, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.warn("subscribed_apps ensure failed (non-blocking)", e);
    }

    const { res, json, attempts } = await metaFetchWithRetry(
      `https://graph.facebook.com/${META}/${phoneMetaId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: conv.contact_phone,
          type: "text",
          text: { body },
        }),
      },
      { retries: 1 },
    );
    if (attempts > 1) console.log(`send-message succeeded after ${attempts} attempts`);
    if (!res.ok) {
      console.error("send-message failed", json);
      return j(400, json?.error?.message || "Falha ao enviar");
    }

    const waMessageId = json?.messages?.[0]?.id ?? null;
    if (!waMessageId) {
      console.error("send-message returned without message id", json);
      return j(502, "A Meta aceitou a chamada, mas não retornou o ID real da mensagem. Nada foi salvo no Inbox para evitar falso positivo.");
    }

    await admin.from("whatsapp_messages").insert({
      store_id: conv.store_id,
      conversation_id,
      wa_message_id: waMessageId,
      direction: "outbound",
      type: "text",
      body,
      status: "sent",
      sent_by: userData.user.id,
      sent_at: new Date().toISOString(),
    });
    await admin.from("whatsapp_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: body.slice(0, 200),
    }).eq("id", conversation_id);

    return new Response(JSON.stringify({ success: true, wa_message_id: waMessageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return j(500, (e as Error).message);
  }
});
function j(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
