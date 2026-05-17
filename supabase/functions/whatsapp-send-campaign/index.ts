// Cria e dispara uma campanha (template) para uma audiência.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { metaFetchWithRetry, checkSendingQuality } from "../_shared/whatsappFetch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const META = "v25.0";

interface Recipient { phone: string; name?: string; customer_id?: string; variables?: Record<string, string>; }

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

    const {
      store_id, name, template_id, audience_type,
      recipients: clientRecipients,
    } = await req.json();
    if (!store_id || !name || !template_id || !audience_type) {
      return j(400, "store_id, name, template_id, audience_type required");
    }

    const admin = createClient(url, serviceKey);

    const { data: store } = await admin.from("stores").select("id, merchant_id, name").eq("id", store_id).single();
    if (!store || store.merchant_id !== userData.user.id) return j(403, "Access denied");

    const { data: tpl } = await admin
      .from("whatsapp_templates")
      .select("id, name, language, status, components, connection_id")
      .eq("id", template_id).eq("store_id", store_id).single();
    if (!tpl) return j(404, "Template não encontrado");
    if (tpl.status !== "APPROVED") return j(400, "Template não está APROVADO pela Meta");

    const { data: conn } = await admin
      .from("whatsapp_connections").select("id, access_token, status, waba_id")
      .eq("id", tpl.connection_id).single();
    if (!conn || conn.status !== "active") return j(400, "Conexão inativa");

    const { data: phone } = await admin
      .from("whatsapp_phone_numbers")
      .select("phone_number_id, id")
      .eq("connection_id", conn.id)
      .order("is_primary", { ascending: false })
      .limit(1).maybeSingle();
    if (!phone) return j(400, "Nenhum número associado");

    // Quality + language pré-checagem (revalida na Meta antes de queimar quota)
    const qualityCheck = await checkSendingQuality(
      phone.phone_number_id, conn.waba_id, tpl.name, tpl.language, conn.access_token, META,
    );
    if (!qualityCheck.ok) return j(400, qualityCheck.reason);

    // Resolve audiência
    const recipients: Recipient[] = [];
    if (audience_type === "customers") {
      const { data: customers } = await admin
        .from("customers")
        .select("id, nome, telefone")
        .eq("store_id", store_id)
        .not("telefone", "is", null);
      for (const c of customers ?? []) {
        const phoneClean = (c.telefone ?? "").replace(/\D/g, "");
        if (phoneClean.length >= 10) {
          recipients.push({
            phone: normalizeBR(phoneClean),
            name: c.nome,
            customer_id: c.id,
            variables: { "1": (c.nome ?? "").split(" ")[0] || "cliente", "2": store.name },
          });
        }
      }
    } else if (audience_type === "abandoned_carts") {
      const { data: carts } = await admin
        .from("abandoned_carts")
        .select("id, customer_name, customer_id, customer_email, customers(telefone, nome)")
        .eq("store_id", store_id)
        .is("recovered_at", null)
        .gte("abandoned_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      for (const c of carts ?? []) {
        const tel = (c as any).customers?.telefone;
        if (!tel) continue;
        const phoneClean = String(tel).replace(/\D/g, "");
        if (phoneClean.length >= 10) {
          recipients.push({
            phone: normalizeBR(phoneClean),
            name: (c as any).customers?.nome || c.customer_name,
            customer_id: c.customer_id ?? undefined,
            variables: {
              "1": ((c as any).customers?.nome || c.customer_name || "cliente").split(" ")[0],
              "2": store.name,
            },
          });
        }
      }
    } else if (audience_type === "manual") {
      for (const r of clientRecipients ?? []) {
        const phoneClean = String(r.phone).replace(/\D/g, "");
        if (phoneClean.length >= 10) {
          recipients.push({
            phone: normalizeBR(phoneClean),
            name: r.name,
            variables: { "1": r.name?.split(" ")[0] || "cliente", "2": store.name, ...(r.variables ?? {}) },
          });
        }
      }
    } else {
      return j(400, "audience_type inválido");
    }

    // Dedup
    const seen = new Set<string>();
    const dedup = recipients.filter(r => (seen.has(r.phone) ? false : (seen.add(r.phone), true)));
    if (dedup.length === 0) return j(400, "Nenhum destinatário válido encontrado");

    // Cria campanha
    const { data: campaign } = await admin.from("whatsapp_campaigns").insert({
      store_id, connection_id: conn.id,
      name, template_id,
      template_name_snapshot: tpl.name,
      template_language_snapshot: tpl.language,
      audience_type,
      total_recipients: dedup.length,
      status: "sending",
      started_at: new Date().toISOString(),
      created_by: userData.user.id,
    }).select().single();

    // Insere recipients
    await admin.from("whatsapp_campaign_recipients").insert(
      dedup.map(r => ({
        campaign_id: campaign!.id,
        store_id,
        customer_id: r.customer_id ?? null,
        phone: r.phone,
        name: r.name ?? null,
        variables: r.variables ?? {},
        status: "pending",
      }))
    );

    // Determina o número de variáveis do BODY
    const bodyComp = (tpl.components as any[]).find(c => c.type === "BODY");
    const placeholderCount = bodyComp?.text ? (bodyComp.text.match(/\{\{(\d+)\}\}/g) ?? []).length : 0;

    // Dispara em paralelo (chunks de 10)
    let sent = 0, failed = 0;
    const all = dedup;
    for (let i = 0; i < all.length; i += 10) {
      const chunk = all.slice(i, i + 10);
      await Promise.all(chunk.map(async (r) => {
        const params: any[] = [];
        for (let n = 1; n <= placeholderCount; n++) {
          params.push({ type: "text", text: String(r.variables?.[String(n)] ?? "") });
        }
        const components = params.length > 0 ? [{ type: "body", parameters: params }] : [];

        const { res, json, attempts } = await metaFetchWithRetry(
          `https://graph.facebook.com/${META}/${phone.phone_number_id}/messages`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${conn.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: r.phone,
              type: "template",
              template: { name: tpl.name, language: { code: tpl.language }, components },
            }),
          },
          { retries: 1 },
        );
        if (attempts > 1) console.log(`Recipient ${r.phone}: succeeded after ${attempts} attempts`);
        if (res.ok) {
          const waId = json?.messages?.[0]?.id ?? null;
          if (!waId) {
            console.warn("Campaign send: 200 but no message id", { phone: r.phone, raw: json });
            await admin.from("whatsapp_campaign_recipients").update({
              status: "failed",
              error_code: "missing_message_id",
              error_message: "A Meta não retornou o ID real da mensagem.",
            }).eq("campaign_id", campaign!.id).eq("phone", r.phone);
            failed++;
            return;
          }


          // Get-or-create conversation + insere mensagem
          let convId: string;
          const { data: existing } = await admin
            .from("whatsapp_conversations")
            .select("id").eq("store_id", store_id).eq("contact_phone", r.phone).maybeSingle();
          if (existing) {
            convId = existing.id;
            await admin.from("whatsapp_conversations").update({
              last_message_at: new Date().toISOString(),
              last_message_preview: `[Campanha] ${name}`,
            }).eq("id", convId);
          } else {
            const { data: nc } = await admin.from("whatsapp_conversations").insert({
              store_id, connection_id: conn.id, phone_number_id: phone.id,
              contact_phone: r.phone, contact_name: r.name ?? null,
              customer_id: r.customer_id ?? null,
              last_message_at: new Date().toISOString(),
              last_message_preview: `[Campanha] ${name}`,
            }).select("id").single();
            convId = nc!.id;
          }
          const { data: msgRow } = await admin.from("whatsapp_messages").insert({
            store_id, conversation_id: convId,
            wa_message_id: waId, direction: "outbound", type: "template",
            template_name: tpl.name, template_variables: r.variables ?? {},
            campaign_id: campaign!.id,
            status: "sent", sent_at: new Date().toISOString(),
            sent_by: userData.user.id,
          }).select("id").single();

          await admin.from("whatsapp_campaign_recipients").update({
            status: "sent", wa_message_id: waId, message_id: msgRow?.id ?? null,
            sent_at: new Date().toISOString(),
          }).eq("campaign_id", campaign!.id).eq("phone", r.phone);
          sent++;
        } else {
          await admin.from("whatsapp_campaign_recipients").update({
            status: "failed",
            error_code: json.error?.code?.toString() ?? null,
            error_message: json.error?.message ?? "Erro",
          }).eq("campaign_id", campaign!.id).eq("phone", r.phone);
          failed++;
        }
      }));
    }

    await admin.from("whatsapp_campaigns").update({
      status: "completed",
      sent_count: sent,
      failed_count: failed,
      completed_at: new Date().toISOString(),
    }).eq("id", campaign!.id);

    return new Response(JSON.stringify({ success: true, campaign_id: campaign!.id, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return j(500, (e as Error).message);
  }
});

// Adiciona '55' (BR) se faltar
function normalizeBR(p: string): string {
  if (p.length === 10 || p.length === 11) return "55" + p;
  return p;
}
function j(s: number, error: string) {
  return new Response(JSON.stringify({ error }), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
