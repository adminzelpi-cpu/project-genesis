// Webhook receptor da Meta — recebe mensagens e atualizações de status.
// Configurado como público (verify_jwt=false na config) — autenticação por VERIFY_TOKEN + assinatura HMAC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

async function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length).toLowerCase();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computed = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  // Constant-time compare
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function logWebhookError(
  supabase: any,
  message: string,
  context: Record<string, unknown>,
) {
  try {
    await supabase.from("error_logs").insert({
      category: "backend",
      severity: "high",
      message: `[whatsapp-webhook] ${message}`,
      context,
      user_agent: "edge-function",
    });
  } catch (e) {
    console.error("Could not persist webhook error log:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const verifyToken = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");
  const appSecret = Deno.env.get("META_APP_SECRET");
  const url = new URL(req.url);

  // ===== Verification handshake =====
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Read raw body (needed for signature verification)
  const rawBody = await req.text();

  // ===== Signature verification (HMAC SHA-256 with META_APP_SECRET) =====
  if (appSecret) {
    const signatureHeader = req.headers.get("x-hub-signature-256");
    const valid = await verifySignature(rawBody, signatureHeader, appSecret);
    if (!valid) {
      await logWebhookError(supabase, "Invalid x-hub-signature-256", {
        has_header: !!signatureHeader,
        body_preview: rawBody.slice(0, 500),
      });
      // Return 200 to avoid Meta retrying invalid payloads forever, but log it.
      return new Response("ok", { status: 200 });
    }
  } else {
    console.warn("META_APP_SECRET not configured — skipping signature verification (INSECURE)");
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch (e) {
    await logWebhookError(supabase, "Invalid JSON body", { raw: rawBody.slice(0, 1000) });
    return new Response("ok", { status: 200 });
  }

  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneNumberMetaId = value?.metadata?.phone_number_id;
        if (!phoneNumberMetaId) continue;

        // Identifica conexão pela WABA + phone_number_id
        const { data: phoneRow } = await supabase
          .from("whatsapp_phone_numbers")
          .select("id, connection_id, whatsapp_connections!inner(id, store_id)")
          .eq("phone_number_id", phoneNumberMetaId)
          .maybeSingle();
        if (!phoneRow) {
          await logWebhookError(supabase, "Unknown phone_number_id", { phoneNumberMetaId });
          continue;
        }

        const conn: any = phoneRow.whatsapp_connections;
        const storeId = conn.store_id;
        const connectionId = conn.id;

        // ----- Mensagens recebidas -----
        for (const msg of value.messages ?? []) {
          const fromPhone = msg.from;
          const profileName = value.contacts?.[0]?.profile?.name ?? null;
          const realTimestamp = msg.timestamp
            ? new Date(parseInt(msg.timestamp, 10) * 1000).toISOString()
            : new Date().toISOString();

          // Get-or-create conversation
          let conversationId: string;
          const { data: existingConv } = await supabase
            .from("whatsapp_conversations")
            .select("id, unread_count")
            .eq("store_id", storeId)
            .eq("contact_phone", fromPhone)
            .maybeSingle();

          if (existingConv) {
            conversationId = existingConv.id;
            await supabase.from("whatsapp_conversations").update({
              last_message_at: realTimestamp,
              last_message_preview: extractPreview(msg),
              unread_count: (existingConv.unread_count ?? 0) + 1,
              contact_name: profileName ?? undefined,
            }).eq("id", conversationId);
          } else {
            const { data: newConv } = await supabase
              .from("whatsapp_conversations")
              .insert({
                store_id: storeId,
                connection_id: connectionId,
                phone_number_id: phoneRow.id,
                contact_phone: fromPhone,
                contact_name: profileName,
                last_message_at: realTimestamp,
                last_message_preview: extractPreview(msg),
                unread_count: 1,
              })
              .select("id").single();
            conversationId = newConv!.id;
          }

          await supabase.from("whatsapp_messages").insert({
            store_id: storeId,
            conversation_id: conversationId,
            wa_message_id: msg.id,
            direction: "inbound",
            type: msg.type ?? "text",
            body: msg.text?.body ?? null,
            media_url: msg.image?.id ? `meta:${msg.image.id}` : (msg.document?.id ? `meta:${msg.document.id}` : null),
            media_mime_type: msg.image?.mime_type ?? msg.document?.mime_type ?? null,
            status: "received",
            sent_at: realTimestamp,
          });
        }

        // ----- Status updates -----
        for (const st of value.statuses ?? []) {
          const update: Record<string, unknown> = { status: st.status };
          const tsIso = st.timestamp
            ? new Date(parseInt(st.timestamp, 10) * 1000).toISOString()
            : new Date().toISOString();
          if (st.status === "delivered") update.delivered_at = tsIso;
          if (st.status === "read") update.read_at = tsIso;
          if (st.status === "failed") {
            update.error_code = st.errors?.[0]?.code?.toString() ?? null;
            update.error_message = st.errors?.[0]?.title ?? st.errors?.[0]?.message ?? null;
          }
          await supabase.from("whatsapp_messages")
            .update(update)
            .eq("wa_message_id", st.id);

          // Atualiza recipient da campanha, se houver
          await supabase.from("whatsapp_campaign_recipients")
            .update({ status: st.status })
            .eq("wa_message_id", st.id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-webhook error", e);
    await logWebhookError(supabase, (e as Error).message, {
      stack: (e as Error).stack,
      body_preview: rawBody.slice(0, 1000),
    });
    // Return 200 to prevent Meta from disabling the webhook subscription.
    return new Response(JSON.stringify({ ok: true, logged_error: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractPreview(msg: any): string {
  if (msg.text?.body) return msg.text.body.slice(0, 200);
  if (msg.type === "image") return "📷 Imagem";
  if (msg.type === "document") return "📎 Documento";
  if (msg.type === "audio") return "🎵 Áudio";
  if (msg.type === "video") return "🎥 Vídeo";
  if (msg.type === "location") return "📍 Localização";
  return `(${msg.type})`;
}
