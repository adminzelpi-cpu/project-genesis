import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { metaFetchWithRetry } from "../_shared/whatsappFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_GRAPH_VERSION = "v25.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError(401, "Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonError(401, "Invalid user");

    const { store_id, to, template_name } = await req.json();
    if (!store_id || !to) return jsonError(400, "store_id and to are required");

    const cleanTo = String(to).replace(/\D/g, "");
    if (cleanTo.length < 10) return jsonError(400, "Número inválido");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: store } = await admin
      .from("stores").select("id, merchant_id").eq("id", store_id).single();
    if (!store || store.merchant_id !== userData.user.id) {
      return jsonError(403, "Access denied");
    }

    const { data: connection } = await admin
      .from("whatsapp_connections")
      .select("id, waba_id, access_token, status")
      .eq("store_id", store_id).single();
    if (!connection || connection.status !== "active") {
      return jsonError(400, "Conta WhatsApp não conectada");
    }

    const { data: phone } = await admin
      .from("whatsapp_phone_numbers")
      .select("id, phone_number_id")
      .eq("connection_id", connection.id)
      .eq("is_primary", true)
      .maybeSingle();

    const primaryPhone = phone ?? (await admin
      .from("whatsapp_phone_numbers")
      .select("id, phone_number_id")
      .eq("connection_id", connection.id)
      .limit(1).maybeSingle()).data;

    if (!primaryPhone) return jsonError(400, "Nenhum número associado à conta");

    const webhookSubscription = await subscribeWabaToWebhooks(connection.waba_id, connection.access_token);
    if (!webhookSubscription.ok) return jsonError(400, webhookSubscription.message);

    const template = await pickTestTemplate(connection.waba_id, connection.access_token, template_name);
    if (!template) {
      return jsonError(400, "Nenhum template aprovado encontrado ainda. Aguarde a aprovação do template na Meta e tente novamente.");
    }

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${primaryPhone.phone_number_id}/messages`;
    const sendBody = JSON.stringify({
      messaging_product: "whatsapp",
      to: cleanTo,
      type: "template",
      template: template.payload,
    });

    const doSend = async () => {
      const { res, json } = await metaFetchWithRetry(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: sendBody,
      }, { retries: 1 });
      return { res, json: json ?? {} };
    };

    let { res, json } = await doSend();

    // Auto-register on 133010 ("Account not registered") and retry once.
    // This happens when Embedded Signup didn't auto-register the number,
    // common when the number was previously used in another Meta App.
    if (!res.ok && json?.error?.code === 133010) {
      console.log("Number not registered, attempting auto-register...");
      const registerUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${primaryPhone.phone_number_id}/register`;
      const regRes = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", pin: "123456" }),
      });
      const regJson = await regRes.json();
      if (!regRes.ok) {
        console.error("Auto-register failed", regJson);
        const msg = regJson?.error?.message || "Falha ao registrar o número na Cloud API";
        // If 2FA PIN already set on the number, instruct merchant
        if (regJson?.error?.code === 133005 || /pin/i.test(msg)) {
          return jsonError(400, "Este número possui PIN de verificação em duas etapas (2FA) configurado em outro app. Acesse o WhatsApp Manager da Meta, remova o PIN do número e tente novamente.");
        }
        return jsonError(400, `Não foi possível registrar o número: ${msg}`);
      }
      console.log("Auto-register success, retrying send...");
      const retry = await doSend();
      res = retry.res;
      json = retry.json;
    }

    if (!res.ok) {
      console.error("Send test message failed", json);
      return jsonError(400, json?.error?.message || "Falha ao enviar");
    }

    const waMessageId = json.messages?.[0]?.id ?? null;
    if (!waMessageId) {
      console.error("Send test message returned without message id", json);
      return jsonError(502, "A Meta aceitou a chamada, mas não retornou o ID real da mensagem. Nada foi salvo no Inbox para evitar falso positivo.");
    }

    // Record into inbox so the message appears in the conversation history
    // (important for Meta App Review — reviewer can see the proof of send).
    try {
      const { data: existingConv } = await admin
        .from("whatsapp_conversations")
        .select("id")
        .eq("store_id", store_id)
        .eq("contact_phone", cleanTo)
        .maybeSingle();

      let conversationId = existingConv?.id;
      if (!conversationId) {
        const { data: newConv } = await admin
          .from("whatsapp_conversations")
          .insert({
            store_id,
            connection_id: connection.id,
            phone_number_id: primaryPhone.id,
            contact_phone: cleanTo,
            last_message_at: new Date().toISOString(),
            last_message_preview: `Template: ${template.name}`,
          })
          .select("id")
          .single();
        conversationId = newConv?.id;
      } else {
        await admin.from("whatsapp_conversations").update({
          last_message_at: new Date().toISOString(),
          last_message_preview: `Template: ${template.name}`,
        }).eq("id", conversationId);
      }

      if (conversationId) {
        await admin.from("whatsapp_messages").insert({
          store_id,
          conversation_id: conversationId,
          wa_message_id: waMessageId,
          direction: "outbound",
          type: "template",
          template_name: template.name,
          body: template.body,
          status: "sent",
          sent_by: userData.user.id,
          sent_at: new Date().toISOString(),
        });
      }
    } catch (logErr) {
      console.warn("Could not record test message in inbox", logErr);
    }

    return new Response(JSON.stringify({ success: true, message_id: waMessageId, template_name: template.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-send-test-message error", e);
    return jsonError(500, (e as Error).message);
  }
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pickTestTemplate(wabaId: string, accessToken: string, preferredName?: string): Promise<{
  name: string;
  body: string;
  payload: Record<string, unknown>;
} | null> {
  try {
    const tplRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${wabaId}/message_templates?fields=name,language,status,components&limit=100&access_token=${accessToken}`,
    );
    const tplJson = await tplRes.json();
    if (!tplRes.ok) {
      console.warn("Template lookup failed", tplJson?.error?.message);
      return null;
    }

    const approved = (tplJson.data ?? []).filter((tpl: any) =>
      tpl.status === "APPROVED" && tpl.name !== "hello_world"
    );
    const preferred = preferredName
      ? approved.find((tpl: any) => tpl.name === preferredName)
      : (approved.find((tpl: any) => tpl.name === "boas_vindas") ?? approved[0]);
    if (!preferred?.name || !preferred?.language) return null;

    const bodyComponent = (preferred.components ?? []).find((component: any) => component.type === "BODY");
    const exampleParams = Array.isArray(bodyComponent?.example?.body_text?.[0])
      ? bodyComponent.example.body_text[0]
      : [];
    const placeholderCount = Math.max(
      exampleParams.length,
      [...String(bodyComponent?.text ?? "").matchAll(/\{\{\d+\}\}/g)].length,
    );

    return {
      name: preferred.name,
      body: bodyComponent?.text ?? `Template: ${preferred.name}`,
      payload: {
        name: preferred.name,
        language: { code: preferred.language },
        ...(placeholderCount > 0
          ? { components: [{ type: "body", parameters: Array.from({ length: placeholderCount }, () => ({ type: "text", text: "Cliente" })) }] }
          : {}),
      },
    };
  } catch (e) {
    console.warn("Template lookup crashed", e);
    return null;
  }
}

async function subscribeWabaToWebhooks(wabaId: string, accessToken: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (res.ok && json?.success !== false) return { ok: true };
    console.error("WABA webhook subscription failed before test send", json);
    return { ok: false, message: json?.error?.message || "Não foi possível assinar os webhooks da WABA antes do envio." };
  } catch (e) {
    console.error("WABA webhook subscription crashed before test send", e);
    return { ok: false, message: "Falha ao preparar os webhooks da WABA antes do envio." };
  }
}
