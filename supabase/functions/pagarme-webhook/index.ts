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
    const payload = await req.json();
    console.log("Webhook Pagar.me recebido:", JSON.stringify(payload, null, 2));

    const { type, data } = payload;

    // Handle different webhook events
    if (type === "order.paid") {
      await handleOrderPaid(supabase, data);
    } else if (type === "order.canceled") {
      await handleOrderCanceled(supabase, data);
    } else if (type === "charge.paid") {
      await handleChargePaid(supabase, data);
    } else if (type === "charge.refunded") {
      await handleChargeRefunded(supabase, data);
    } else if (type === "charge.payment_failed") {
      await handlePaymentFailed(supabase, data);
    } else if (type === "charge.expired" || type === "order.payment_failed") {
      // PIX ou Boleto expirado
      await handlePaymentExpired(supabase, data);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao processar webhook" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleOrderPaid(supabase: any, data: any) {
  const orderId = data.id;
  
  console.log("Processando order.paid:", orderId);

  // Update transaction status
  const { error: transactionError } = await supabase
    .from("payment_transactions")
    .update({ 
      status: "aprovado",
      gateway_response: data,
      updated_at: new Date().toISOString(),
    })
    .eq("external_id", orderId)
    .eq("gateway_type", "pagarme");

  if (transactionError) {
    console.error("Erro ao atualizar transação:", transactionError);
  }

  // Find and update the order
  const { data: transaction } = await supabase
    .from("payment_transactions")
    .select("order_id")
    .eq("external_id", orderId)
    .eq("gateway_type", "pagarme")
    .single();

  if (transaction?.order_id) {
    // Atomic confirmation with idempotency lock + status check + update in one operation
    const { data: confirmResult, error: confirmError } = await supabase.rpc(
      "confirm_order_payment_atomic",
      { p_order_id: transaction.order_id, p_new_status: "aprovado" }
    );

    if (confirmError) {
      console.error("[pagarme-webhook] Error confirming payment atomically:", confirmError);
      return;
    }

    const status = confirmResult?.status;
    if (status === "locked") {
      console.log("[pagarme-webhook] Order already being processed by another webhook, skipping:", transaction.order_id);
      return;
    }
    if (status === "already_paid") {
      console.log("[pagarme-webhook] Order already paid, skipping reprocessing:", transaction.order_id);
      return;
    }
    if (status === "not_found") {
      console.error("[pagarme-webhook] Order not found:", transaction.order_id);
      return;
    }

    // status === "confirmed" — proceed with side effects
    const storeId = confirmResult?.store_id;

    // Send payment confirmed email
    await sendTransactionalEmail(supabase, transaction.order_id, "payment_confirmed");

    // NOTE: Auto-envio para Frenet desabilitado — endpoint Orders da Frenet
    // requer parceria + x-partner-token. Lojista cola o tracking manualmente.

    // Fire Purchase event server-side (Meta/Google/TikTok/Pinterest CAPI).
    // Idempotent — won't fire twice even with duplicate webhooks.
    try {
      await sendPurchaseEventForOrder({ supabase, orderId: transaction.order_id });
    } catch (err) {
      console.error("[pagarme-webhook] sendPurchaseEvent error:", err);
    }
  }
}

async function handleOrderCanceled(supabase: any, data: any) {
  const orderId = data.id;
  
  console.log("Processando order.canceled:", orderId);

  const { error: transactionError } = await supabase
    .from("payment_transactions")
    .update({ 
      status: "cancelado",
      gateway_response: data,
      updated_at: new Date().toISOString(),
    })
    .eq("external_id", orderId)
    .eq("gateway_type", "pagarme");

  if (transactionError) {
    console.error("Erro ao atualizar transação:", transactionError);
  }

  const { data: transaction } = await supabase
    .from("payment_transactions")
    .select("order_id")
    .eq("external_id", orderId)
    .eq("gateway_type", "pagarme")
    .single();

  if (transaction?.order_id) {
    await supabase
      .from("orders")
      .update({ 
        status_pagamento: "cancelado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.order_id);
  }
}

async function handleChargePaid(supabase: any, data: any) {
  const chargeId = data.id;
  const orderId = data.order?.id;
  
  console.log("Processando charge.paid:", chargeId, "Order:", orderId);

  if (orderId) {
    await handleOrderPaid(supabase, { id: orderId, ...data });
  }
}

async function handleChargeRefunded(supabase: any, data: any) {
  const chargeId = data.id;
  const orderId = data.order?.id;
  
  console.log("Processando charge.refunded:", chargeId);

  if (orderId) {
    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .update({ 
        status: "reembolsado",
        gateway_response: data,
        updated_at: new Date().toISOString(),
      })
      .eq("external_id", orderId)
      .eq("gateway_type", "pagarme");

    if (transactionError) {
      console.error("Erro ao atualizar transação:", transactionError);
    }

    const { data: transaction } = await supabase
      .from("payment_transactions")
      .select("order_id")
      .eq("external_id", orderId)
      .eq("gateway_type", "pagarme")
      .single();

    if (transaction?.order_id) {
      await supabase
        .from("orders")
        .update({ 
          status_pagamento: "reembolsado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.order_id);

      // Send refund email
      await sendTransactionalEmail(supabase, transaction.order_id, "refund_processed");
    }
  }
}

async function handlePaymentFailed(supabase: any, data: any) {
  const chargeId = data.id;
  const orderId = data.order?.id;
  const paymentMethod = data.payment_method || data.last_transaction?.payment_method;
  
  console.log("Processando charge.payment_failed:", chargeId, "Method:", paymentMethod);

  if (orderId) {
    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .update({ 
        status: "rejeitado",
        status_detail: data.last_transaction?.gateway_response?.errors?.[0]?.message,
        gateway_response: data,
        updated_at: new Date().toISOString(),
      })
      .eq("external_id", orderId)
      .eq("gateway_type", "pagarme");

    if (transactionError) {
      console.error("Erro ao atualizar transação:", transactionError);
    }

    const { data: transaction } = await supabase
      .from("payment_transactions")
      .select("order_id, payment_method")
      .eq("external_id", orderId)
      .eq("gateway_type", "pagarme")
      .single();

    if (transaction?.order_id) {
      await supabase
        .from("orders")
        .update({ 
          status_pagamento: "rejeitado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.order_id);

      // Send payment failed email with retry link
      await sendTransactionalEmail(supabase, transaction.order_id, "payment_failed");
    }
  }
}

async function handlePaymentExpired(supabase: any, data: any) {
  const chargeId = data.id;
  const orderId = data.order?.id;
  const paymentMethod = data.payment_method || data.last_transaction?.payment_method;
  
  console.log("Processando payment expired:", chargeId, "Method:", paymentMethod);

  if (orderId) {
    // Update transaction status
    const { error: transactionError } = await supabase
      .from("payment_transactions")
      .update({ 
        status: "expirado",
        status_detail: "Pagamento expirado",
        gateway_response: data,
        updated_at: new Date().toISOString(),
      })
      .eq("external_id", orderId)
      .eq("gateway_type", "pagarme");

    if (transactionError) {
      console.error("Erro ao atualizar transação:", transactionError);
    }

    const { data: transaction } = await supabase
      .from("payment_transactions")
      .select("order_id, payment_method")
      .eq("external_id", orderId)
      .eq("gateway_type", "pagarme")
      .single();

    if (transaction?.order_id) {
      await supabase
        .from("orders")
        .update({ 
          status_pagamento: "expirado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.order_id);

      // Determine email type based on payment method
      const emailType = transaction.payment_method === "pix" ? "pix_expired" : "payment_failed";
      await sendTransactionalEmail(supabase, transaction.order_id, emailType);
    }
  }
}

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
async function sendTransactionalEmail(supabase: any, orderId: string, emailType: string) {
  try {
    // Get order with customer and store info
    // Get order (no FK join with customers)
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
