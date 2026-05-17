import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RefundRequest {
  orderId: string;
  amount?: number; // optional partial refund amount
  reason?: string;
}

async function refreshMpToken(supabase: any, gateway: any): Promise<string | null> {
  const clientId = Deno.env.get("MP_CLIENT_ID");
  const clientSecret = Deno.env.get("MP_CLIENT_SECRET");
  if (!gateway.oauth_refresh_token || !clientId || !clientSecret) return null;
  try {
    const r = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: gateway.oauth_refresh_token,
      }),
    });
    if (!r.ok) return null;
    const td = await r.json();
    await supabase
      .from("store_payment_gateways")
      .update({
        oauth_access_token: td.access_token,
        oauth_refresh_token: td.refresh_token,
        oauth_expires_at: td.expires_in ? new Date(Date.now() + td.expires_in * 1000).toISOString() : null,
      })
      .eq("id", gateway.id);
    return td.access_token;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Authenticate the merchant
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as RefundRequest;
    const { orderId, amount, reason } = body;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load order + verify merchant ownership
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, store_id, status_pagamento, total")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, merchant_id")
      .eq("id", order.store_id)
      .maybeSingle();

    if (!store || store.merchant_id !== userId) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status_pagamento !== "aprovado" && order.status_pagamento !== "pago") {
      return new Response(
        JSON.stringify({ error: "Apenas pedidos pagos podem ser reembolsados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find latest successful transaction
    const { data: txn } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!txn || !txn.external_id) {
      return new Response(
        JSON.stringify({ error: "Transação de pagamento não encontrada para este pedido" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (txn.refund_status === "processed") {
      return new Response(JSON.stringify({ error: "Pedido já foi reembolsado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refundAmount = amount && amount > 0 ? Number(Number(amount).toFixed(2)) : Number(Number(order.total).toFixed(2));

    // Get gateway credentials
    const { data: gateway } = await supabase
      .from("store_payment_gateways")
      .select("*")
      .eq("store_id", order.store_id)
      .eq("gateway_type", txn.gateway_type)
      .maybeSingle();

    if (!gateway) {
      return new Response(JSON.stringify({ error: "Gateway não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let refundResp: any = null;
    let refundExternalId: string | null = null;

    // ============ MERCADO PAGO ============
    if (txn.gateway_type === "mercado_pago" || txn.gateway_type === "mercadopago") {
      const manualToken = (gateway.credentials as any)?.access_token;
      let accessToken = gateway.oauth_access_token || manualToken;
      if (gateway.oauth_expires_at && new Date(gateway.oauth_expires_at) < new Date()) {
        accessToken = (await refreshMpToken(supabase, gateway)) || accessToken;
      }
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: "Credenciais do Mercado Pago indisponíveis" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const mpUrl = `https://api.mercadopago.com/v1/payments/${txn.external_id}/refunds`;
      const mpBody = amount && amount < Number(order.total) ? { amount: refundAmount } : {};
      const r = await fetch(mpUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `refund-${orderId}-${Date.now()}`,
        },
        body: JSON.stringify(mpBody),
      });
      const ct = r.headers.get("content-type") || "";
      refundResp = ct.includes("application/json") ? await r.json() : { raw: await r.text() };
      if (!r.ok) {
        return new Response(
          JSON.stringify({
            error: refundResp?.message || "Falha ao processar reembolso no Mercado Pago",
            details: refundResp,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      refundExternalId = refundResp?.id?.toString() || null;
    }
    // ============ PAGAR.ME ============
    else if (txn.gateway_type === "pagarme") {
      const apiKey = (gateway.credentials as any)?.api_key;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Credenciais do Pagar.me indisponíveis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Pagar.me v5: cancel order (refunds the charge automatically when paid)
      const auth = btoa(`${apiKey}:`);
      const pmUrl = `https://api.pagar.me/core/v5/orders/${txn.external_id}/closed`;
      // Use cancel endpoint instead — refunds paid charges
      const cancelUrl = `https://api.pagar.me/core/v5/orders/${txn.external_id}`;
      const r = await fetch(cancelUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      });
      const ct = r.headers.get("content-type") || "";
      refundResp = ct.includes("application/json") ? await r.json() : { raw: await r.text() };
      if (!r.ok) {
        return new Response(
          JSON.stringify({
            error: refundResp?.message || "Falha ao processar reembolso no Pagar.me",
            details: refundResp,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      refundExternalId = refundResp?.id?.toString() || null;
    } else {
      return new Response(
        JSON.stringify({ error: `Reembolso não suportado para gateway: ${txn.gateway_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction
    await supabase
      .from("payment_transactions")
      .update({
        refund_status: "processed",
        refund_amount: refundAmount,
        refunded_at: new Date().toISOString(),
        refund_external_id: refundExternalId,
        refund_response: refundResp,
      })
      .eq("id", txn.id);

    // Update order status
    await supabase
      .from("orders")
      .update({
        status_pagamento: "reembolsado",
        status_pedido: "cancelado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    console.log(`[refund-payment] Refunded order ${orderId} via ${txn.gateway_type}, amount=${refundAmount}`);

    return new Response(
      JSON.stringify({
        success: true,
        refundAmount,
        refundExternalId,
        gateway: txn.gateway_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[refund-payment] Error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
