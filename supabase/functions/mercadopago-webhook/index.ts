import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPurchaseEventForOrder } from "../_shared/sendPurchaseEvent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Mercado Pago sends notifications as query params or body
    const url = new URL(req.url);
    let notificationType = url.searchParams.get("type") || url.searchParams.get("topic");
    let dataId = url.searchParams.get("data.id") || url.searchParams.get("id");

    // Also check body for notification data
    let body: any = {};
    try {
      body = await req.json();
      notificationType = notificationType || body.type || body.topic;
      dataId = dataId || body.data?.id || body.id;
    } catch {
      // Body might not be JSON
    }

    console.log("Webhook recebido:", { notificationType, dataId, body });

    if (!notificationType || !dataId) {
      console.log("Notificação sem dados suficientes, ignorando");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // We only care about payment notifications
    if (notificationType !== "payment") {
      console.log(`Tipo de notificação ${notificationType} ignorado`);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Find the transaction by external_id
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .select("*, orders(id, status_pedido, store_id)")
      .eq("external_id", dataId.toString())
      .single();

    if (transactionError || !transaction) {
      console.log("Transação não encontrada para external_id:", dataId);
      // Return 200 to acknowledge - might be a duplicate or old notification
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Get the gateway to fetch payment details (include fields needed for token refresh)
    const { data: gateway } = await supabase
      .from("store_payment_gateways")
      .select("id, oauth_access_token, oauth_refresh_token, oauth_expires_at")
      .eq("store_id", transaction.store_id)
      .eq("gateway_type", "mercado_pago")
      .eq("is_active", true)
      .single();

    if (!gateway?.oauth_access_token) {
      console.error("Gateway não encontrado para transação");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    let accessToken = gateway.oauth_access_token;

    // Check if token is expired and try to refresh
    if (gateway.oauth_expires_at && new Date(gateway.oauth_expires_at) < new Date()) {
      console.log("Webhook: token expirado, tentando renovar...");
      const clientId = Deno.env.get("MP_CLIENT_ID");
      const clientSecret = Deno.env.get("MP_CLIENT_SECRET");

      if (gateway.oauth_refresh_token && clientId && clientSecret) {
        try {
          const refreshResponse = await fetch("https://api.mercadopago.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: "refresh_token",
              refresh_token: gateway.oauth_refresh_token,
            }),
          });

          if (refreshResponse.ok) {
            const tokenData = await refreshResponse.json();
            accessToken = tokenData.access_token;
            await supabase.from("store_payment_gateways").update({
              oauth_access_token: tokenData.access_token,
              oauth_refresh_token: tokenData.refresh_token,
              oauth_expires_at: tokenData.expires_in
                ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
                : null,
            }).eq("id", gateway.id);
            console.log("Webhook: token renovado com sucesso");
          } else {
            console.error("Webhook: falha ao renovar token");
          }
        } catch (refreshError) {
          console.error("Webhook: erro ao renovar token:", refreshError);
        }
      }
    }

    // Fetch payment details from Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!mpResponse.ok) {
      console.error("Erro ao buscar detalhes do pagamento:", await mpResponse.text());
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Defensive JSON parsing
    const contentType = mpResponse.headers.get("content-type");
    let paymentData: any;
    if (!contentType?.includes("application/json")) {
      console.error("Webhook: MP retornou resposta não-JSON");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
    try {
      paymentData = await mpResponse.json();
    } catch {
      console.error("Webhook: falha ao parsear resposta do MP");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
    console.log("Dados do pagamento:", paymentData.status, paymentData.status_detail);

    // Capture previous status to detect changes
    const previousStatus = transaction.status;

    // Update transaction status
    await supabase
      .from("payment_transactions")
      .update({
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        gateway_response: paymentData,
      })
      .eq("id", transaction.id);

    // Update order status based on payment status
    let orderPaymentStatus = "pendente";
    let orderStatus = transaction.orders?.status_pedido || "pendente";
    let emailType: string | null = null;

    switch (paymentData.status) {
      case "approved":
        orderPaymentStatus = "aprovado";
        // Keep order status as-is (don't set to non-existent "processando")
        // Send payment confirmed email if status changed
        if (previousStatus !== "approved") {
          emailType = "payment_confirmed";
        }
        break;
      case "rejected":
        orderPaymentStatus = "rejeitado";
        // Send payment failed email if status changed
        if (previousStatus !== "rejected") {
          emailType = "payment_failed";
        }
        break;
      case "cancelled":
        // Determine if it was a PIX expiration
        if (paymentData.payment_method_id === "pix" && 
            (paymentData.status_detail === "expired" || paymentData.status_detail?.includes("expir"))) {
          orderPaymentStatus = "expirado";
          emailType = "pix_expired";
        } else {
          orderPaymentStatus = "cancelado";
        }
        break;
      case "refunded":
        orderPaymentStatus = "reembolsado";
        if (previousStatus !== "refunded") {
          emailType = "refund_processed";
        }
        break;
      case "in_process":
      case "pending":
      case "authorized":
        orderPaymentStatus = "pendente";
        break;
      default:
        orderPaymentStatus = paymentData.status;
    }

    // For "approved" status, use atomic confirmation to prevent duplicate processing
    // (concurrent webhooks could otherwise double-decrement stock or send duplicate emails)
    if (orderPaymentStatus === "aprovado") {
      const { data: confirmResult, error: confirmError } = await supabase.rpc(
        "confirm_order_payment_atomic",
        { p_order_id: transaction.order_id, p_new_status: "aprovado" }
      );

      if (confirmError) {
        console.error(`[mercadopago-webhook] Atomic confirm error for ${transaction.order_id}:`, confirmError);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      const status = confirmResult?.status;
      if (status === "locked") {
        console.log(`[mercadopago-webhook] Order ${transaction.order_id} already being processed, skipping`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
      if (status === "already_paid") {
        console.log(`[mercadopago-webhook] Order ${transaction.order_id} already paid, skipping side effects`);
        return new Response("OK", { status: 200, headers: corsHeaders });
      }
      // status === "confirmed": proceed with email + Frenet below
    } else {
      // Non-approved status updates (rejected/cancelled/refunded/pending) — safe to update directly
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({ 
          status_pagamento: orderPaymentStatus,
          status_pedido: orderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.order_id);

      if (orderUpdateError) {
        console.error(`Erro ao atualizar pedido ${transaction.order_id}:`, orderUpdateError);
      } else {
        console.log(`Pedido ${transaction.order_id} atualizado: pagamento=${orderPaymentStatus}, pedido=${orderStatus}`);
      }
    }

    // Send transactional email if needed
    if (emailType) {
      await sendTransactionalEmail(supabase, transaction.order_id, emailType, transaction.payment_method);
    }

    // NOTE: Auto-envio para Frenet desabilitado — endpoint Orders da Frenet
    // requer parceria + x-partner-token, que não temos hoje. Lojista usa o
    // painel da Frenet e cola o tracking manualmente no pedido.

    // Fire Purchase event server-side (Meta/Google/TikTok/Pinterest CAPI).
    // Idempotent — safe even if webhook is delivered multiple times.
    if (orderPaymentStatus === "aprovado") {
      try {
        await sendPurchaseEventForOrder({ supabase, orderId: transaction.order_id });
      } catch (err) {
        console.error("[mercadopago-webhook] sendPurchaseEvent error:", err);
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Erro no webhook:", error);
    // Return 200 to acknowledge receipt even on error
    // This prevents Mercado Pago from retrying indefinitely
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});

// Helper function to auto-send order to Frenet when payment is confirmed
async function autoSendToFrenet(supabase: any, storeId: string, orderId: string) {
  try {
    // Check if store has Frenet configured with auto-send enabled
    const { data: store } = await supabase
      .from("stores")
      .select("shipping_config")
      .eq("id", storeId)
      .single();

    const shippingConfig = store?.shipping_config || {};
    if (!shippingConfig.frenet_token || shippingConfig.frenet_auto_send === false) {
      console.log("Frenet auto-send disabled or not configured for store:", storeId);
      return;
    }

    // Check if order was already sent to Frenet
    const { data: order } = await supabase
      .from("orders")
      .select("endereco_entrega")
      .eq("id", orderId)
      .single();

    const endereco = order?.endereco_entrega as any;
    if (endereco?.frenet_sent) {
      console.log("Order already sent to Frenet:", orderId);
      return;
    }

    console.log("Auto-sending order to Frenet:", orderId);
    const { error } = await supabase.functions.invoke("frenet-create-shipment", {
      body: { storeId, orderId },
    });

    if (error) {
      console.error("Error auto-sending to Frenet:", error);
    } else {
      console.log("Order auto-sent to Frenet successfully:", orderId);
    }
  } catch (error) {
    console.error("Error in autoSendToFrenet:", error);
    // Don't throw - this should not block the webhook
  }
}

// Helper function to send transactional email
async function sendTransactionalEmail(supabase: any, orderId: string, emailType: string, paymentMethod?: string) {
  try {
    // Get order (no FK join with customers since there's no FK)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        stores (
          id, slug, name, logo_url
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Erro ao buscar pedido:", orderError);
      return;
    }

    // Fetch customer separately since there's no FK between orders and customers
    let customerEmail: string | null = null;
    let customerName: string | null = null;

    if (order.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("nome, email")
        .eq("id", order.customer_id)
        .maybeSingle();

      customerEmail = customer?.email;
      customerName = customer?.nome;
    }

    if (!customerEmail) {
      console.log("Cliente sem email, não enviando notificação");
      return;
    }

    // Build retry payment URL for failed/expired payments (custom domain → fallback)
    const { getStorePublicUrl } = await import("../_shared/storeUrl.ts");
    const storeBaseUrl = order.stores?.slug
      ? await getStorePublicUrl(supabase, { id: order.store_id, slug: order.stores.slug })
      : '';
    const retryPaymentUrl = (emailType === "payment_failed" || emailType === "pix_expired") && storeBaseUrl
      ? `${storeBaseUrl}/order/${orderId}/retry-payment`
      : undefined;

    // Prepare order data
    const orderNumber = order.order_number
      ? `#${order.order_number}`
      : `#${order.id.split("-")[0].toUpperCase()}`;
    const products = (order.products || []).map((p: any) => ({
      name: p.name || p.product_name || "Produto",
      quantity: p.quantity || 1,
      price: p.price || p.unit_price || p.total_price || 0,
      image_url: p.image_url || p.image || null,
      variation: p.variation || p.variant_name || p.variant || null,
    }));

    // Build delivery address if exists
    const deliveryAddress = order.endereco_entrega ? {
      street: order.endereco_entrega.rua || order.endereco_entrega.street || "",
      number: order.endereco_entrega.numero || order.endereco_entrega.number || "",
      complement: order.endereco_entrega.complemento || order.endereco_entrega.complement,
      neighborhood: order.endereco_entrega.bairro || order.endereco_entrega.neighborhood || "",
      city: order.endereco_entrega.cidade || order.endereco_entrega.city || "",
      state: order.endereco_entrega.estado || order.endereco_entrega.state || "",
      zip_code: order.endereco_entrega.cep || order.endereco_entrega.zip_code || "",
    } : undefined;

    // Call the send email function
    const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        store_id: order.store_id,
        order_id: orderId,
        email_type: emailType,
        recipient_email: customerEmail,
        recipient_name: customerName,
        retry_payment_url: retryPaymentUrl,
        store_slug: order.stores?.slug,
        order_data: {
          order_number: orderNumber,
          products,
          subtotal: order.subtotal || 0,
          shipping: order.frete || 0,
          discount: order.desconto || 0,
          total: order.total || 0,
          delivery_address: deliveryAddress,
          shipping_method: (order.endereco_entrega as any)?.metodo_envio || undefined,
          shipping_carrier: (order.endereco_entrega as any)?.transportadora || undefined,
          shipping_delivery_days: (order.endereco_entrega as any)?.prazo_entrega_dias || undefined,
          tracking_code: order.tracking_code,
          tracking_url: order.tracking_url,
        },
      },
    });

    if (emailError) {
      console.error("Erro ao enviar email:", emailError);
    } else {
      console.log(`Email ${emailType} enviado com sucesso para ${customerEmail}`);
    }
  } catch (error) {
    console.error("Erro ao enviar email transacional:", error);
  }
}
