import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, "Missing authorization");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appId = Deno.env.get("META_APP_ID")!;
    const appSecret = Deno.env.get("META_APP_SECRET")!;

    if (!appId || !appSecret) {
      return jsonError(500, "Meta app credentials not configured");
    }

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonError(401, "Invalid user");
    }

    const body = await req.json();
    const { code, store_id, waba_id, phone_number_id, business_id } = body;

    if (!code || !store_id) {
      return jsonError(400, "code and store_id are required");
    }

    // Service-role client for ownership check + writes
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: store, error: storeErr } = await admin
      .from("stores")
      .select("id, merchant_id")
      .eq("id", store_id)
      .single();

    if (storeErr || !store || store.merchant_id !== userData.user.id) {
      return jsonError(403, "Store not found or access denied");
    }

    // Step 1: Exchange code for access token
    // IMPORTANT: WhatsApp Embedded Signup uses response_type=code WITHOUT redirect_uri.
    // Sending redirect_uri (even empty) causes: "Error validating verification code...redirect_uri"
    const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error("Token exchange failed", tokenJson);
      const metaMessage = tokenJson.error?.message || "Token exchange failed";
      if (metaMessage.toLowerCase().includes("redirect_uri")) {
        return jsonError(400, "Falha na validação do Meta: confira se o App ID, App Secret e Config ID pertencem ao mesmo app Meta usado no popup.");
      }
      return jsonError(400, metaMessage);
    }

    const accessToken: string = tokenJson.access_token;
    const expiresIn: number | undefined = tokenJson.expires_in;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Step 2: Discover WABA(s) if not provided
    let resolvedWabaId = waba_id as string | undefined;
    if (!resolvedWabaId) {
      const dbgUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`;
      const dbgRes = await fetch(dbgUrl);
      const dbgJson = await dbgRes.json();
      const granularScopes = dbgJson?.data?.granular_scopes ?? [];
      const wabaScope = granularScopes.find((s: any) => s.scope === "whatsapp_business_management");
      resolvedWabaId = wabaScope?.target_ids?.[0];
    }

    if (!resolvedWabaId) {
      return jsonError(400, "Não foi possível identificar a WABA. Tente reconectar.");
    }

    // Step 3: Fetch phone numbers for the WABA
    const phonesUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${resolvedWabaId}/phone_numbers?access_token=${accessToken}`;
    const phonesRes = await fetch(phonesUrl);
    const phonesJson = await phonesRes.json();
    if (!phonesRes.ok) {
      console.error("Phones fetch failed", phonesJson);
      return jsonError(400, phonesJson.error?.message || "Falha ao buscar números");
    }
    const phones: any[] = phonesJson.data ?? [];

    // Step 4: Register the selected phone number in WhatsApp Cloud API.
    // The SMS/voice code inside Meta proves ownership, but the number can still
    // remain "pending" until this Graph API registration step succeeds.
    const selectedPhoneNumberId = (phone_number_id as string | undefined) ?? phones[0]?.id;
    if (selectedPhoneNumberId) {
      const registration = await registerPhoneNumber(selectedPhoneNumberId, accessToken);
      if (!registration.ok) {
        return jsonError(400, registration.message);
      }
    }

    // Step 4.5: Subscribe this app to the customer's WABA webhooks.
    // Meta's Embedded Signup docs require this after the code exchange so
    // inbound replies and delivery/failed statuses are routed to our webhook.
    const webhookSubscription = await subscribeWabaToWebhooks(resolvedWabaId, accessToken);
    if (!webhookSubscription.ok) {
      return jsonError(400, webhookSubscription.message);
    }

    // Step 5: Upsert connection
    const { data: connection, error: connErr } = await admin
      .from("whatsapp_connections")
      .upsert({
        store_id,
        waba_id: resolvedWabaId,
        business_id: business_id ?? null,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        status: "active",
        meta_user_id: userData.user.id,
        connected_by: userData.user.id,
      }, { onConflict: "store_id" })
      .select()
      .single();

    if (connErr) {
      console.error("Upsert connection failed", connErr);
      return jsonError(500, connErr.message);
    }

    // Step 6: Replace phone numbers
    await admin.from("whatsapp_phone_numbers").delete().eq("connection_id", connection.id);

    if (phones.length > 0) {
      const rows = phones.map((p, idx) => ({
        connection_id: connection.id,
        store_id,
        phone_number_id: p.id,
        display_phone_number: p.display_phone_number,
        verified_name: p.verified_name ?? null,
        quality_rating: p.quality_rating ?? null,
        is_primary: phone_number_id ? p.id === phone_number_id : idx === 0,
      }));
      await admin.from("whatsapp_phone_numbers").insert(rows);
    }

    // Step 7: Auto-create a default "boas_vindas" template (UTILITY → auto-approved by Meta).
    // This guarantees that every newly connected store has at least one approved template,
    // which makes Meta App Review easier (reviewer always has something to send).
    try {
      const defaultTemplate = {
        name: "boas_vindas",
        language: "pt_BR",
        category: "UTILITY",
        components: [
          {
            type: "BODY",
            text: "Olá {{1}}! 👋\n\nObrigado por entrar em contato. Recebemos sua mensagem e em breve um de nossos atendentes irá te responder.\n\nFique à vontade para nos enviar suas dúvidas por aqui.",
            example: { body_text: [["Maria"]] },
          },
        ],
      };

      const tplRes = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/${resolvedWabaId}/message_templates`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(defaultTemplate),
        }
      );
      const tplJson = await tplRes.json();
      if (tplRes.ok) {
        await admin.from("whatsapp_templates").upsert({
          store_id,
          connection_id: connection.id,
          meta_template_id: tplJson.id,
          name: defaultTemplate.name,
          language: defaultTemplate.language,
          category: defaultTemplate.category,
          status: tplJson.status || "PENDING",
          components: defaultTemplate.components,
          synced_at: new Date().toISOString(),
        }, { onConflict: "store_id,name,language" });
      } else {
        console.warn("Default template creation skipped", tplJson?.error?.message);
      }
    } catch (tplErr) {
      console.warn("Default template creation failed", tplErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        connection_id: connection.id,
        waba_id: resolvedWabaId,
        phone_numbers: phones.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("whatsapp-exchange-token error", e);
    return jsonError(500, (e as Error).message);
  }
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function registerPhoneNumber(phoneNumberId: string, accessToken: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const registerRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", pin: "123456" }),
    });
    const registerJson = await registerRes.json();

    if (registerRes.ok) return { ok: true };

    const code = registerJson?.error?.code;
    const message = registerJson?.error?.message || "Falha ao registrar o número na Cloud API";
    console.error("Phone registration failed", registerJson);

    if (code === 133005 || /pin|two.step|2fa|verification/i.test(message)) {
      return {
        ok: false,
        message: "O número foi verificado no modal, mas a Meta recusou o registro automático por causa do PIN/2FA do WhatsApp. No WhatsApp Manager, remova ou confirme o PIN de verificação em duas etapas desse número e reconecte.",
      };
    }

    return { ok: false, message: `A Meta verificou o número, mas ainda não liberou o registro automático: ${message}` };
  } catch (e) {
    console.error("Phone registration crashed", e);
    return { ok: false, message: "Falha ao finalizar o registro do número na Meta. Tente reconectar em alguns minutos." };
  }
}

async function subscribeWabaToWebhooks(wabaId: string, accessToken: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const subscribeRes = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const subscribeJson = await subscribeRes.json();

    if (subscribeRes.ok && subscribeJson?.success !== false) return { ok: true };

    console.error("WABA webhook subscription failed", subscribeJson);
    return {
      ok: false,
      message: subscribeJson?.error?.message || "A Meta conectou a conta, mas não permitiu assinar os webhooks da WABA. Sem isso, respostas e status não chegam no Inbox.",
    };
  } catch (e) {
    console.error("WABA webhook subscription crashed", e);
    return { ok: false, message: "Falha ao assinar webhooks da WABA na Meta. Tente reconectar em alguns minutos." };
  }
}
