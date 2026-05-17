// Server-side dispatcher for the "Purchase" conversion event.
// Called from payment webhooks (Mercado Pago, Pagar.me) once an order
// transitions to paid. Idempotent: marks the order with
// `purchase_event_sent_at` so duplicate webhooks never fire twice.
//
// The same `purchase_event_id` is also persisted on the order so that if
// the customer's browser opens the thank-you page, the pixel can fire
// with the same event ID and the ad platforms will deduplicate.

interface SendPurchaseEventParams {
  supabase: any;
  orderId: string;
}

function ensureUuid(value: any): string {
  if (typeof value === "string" && value.length === 36) return value;
  return crypto.randomUUID();
}

export async function sendPurchaseEventForOrder({
  supabase,
  orderId,
}: SendPurchaseEventParams): Promise<{ sent: boolean; reason?: string; eventId?: string }> {
  try {
    // 1. Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error("[sendPurchaseEvent] Order not found:", orderId, orderErr);
      return { sent: false, reason: "order_not_found" };
    }

    // 2. Idempotency check — if already sent, skip
    if (order.purchase_event_sent_at) {
      console.log("[sendPurchaseEvent] Already sent for order:", orderId);
      return { sent: false, reason: "already_sent", eventId: order.purchase_event_id };
    }

    // 3. Generate or reuse event ID, persist BEFORE sending
    //    (so the thank-you page polling can pick it up and dedupe)
    const eventId = ensureUuid(order.purchase_event_id);

    if (!order.purchase_event_id) {
      const { error: idErr } = await supabase
        .from("orders")
        .update({ purchase_event_id: eventId })
        .eq("id", orderId)
        .is("purchase_event_id", null);
      if (idErr) {
        console.warn("[sendPurchaseEvent] Could not persist event_id:", idErr);
      }
    }

    // 4. Fetch customer for User Auth Matching (UAM) — improves EMQ score
    let customerEmail = "";
    let customerPhone = "";
    let customerCpf = "";
    let customerFirstName = "";
    let customerLastName = "";

    if (order.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("email, telefone, cpf, nome")
        .eq("id", order.customer_id)
        .maybeSingle();

      if (customer) {
        customerEmail = customer.email || "";
        customerPhone = customer.telefone || "";
        customerCpf = customer.cpf || "";
        const fullName = (customer.nome || "").trim();
        const parts = fullName.split(/\s+/);
        customerFirstName = parts[0] || "";
        customerLastName = parts.slice(1).join(" ");
      }
    }

    // 5. Address from order snapshot
    const endereco = (order.endereco_entrega || {}) as Record<string, any>;
    const customerCity = endereco.cidade || endereco.city || "";
    const customerState = endereco.estado || endereco.state || "";
    const customerZipCode = endereco.cep || endereco.zipCode || "";

    // 5b. Reconstruct a plausible event_source_url for Meta CAPI quality.
    // Meta requires event_source_url for action_source="website" and uses it
    // for matching/quality scoring. We use the store's primary custom domain
    // when available, falling back to the platform subdomain.
    let eventSourceUrl = "";
    let storeCurrency = "BRL";
    try {
      const { data: store } = await supabase
        .from("stores")
        .select("slug, currency")
        .eq("id", order.store_id)
        .maybeSingle();
      if ((store as any)?.currency) storeCurrency = (store as any).currency;

      const { data: customDomain } = await supabase
        .from("custom_domains")
        .select("domain")
        .eq("store_id", order.store_id)
        .eq("is_verified", true)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

      const host = customDomain?.domain
        ? `https://${customDomain.domain}`
        : store?.slug
          ? `https://${store.slug}.zelpi.com.br`
          : "";
      if (host) {
        eventSourceUrl = `${host}/obrigado/${order.id}`;
      }
    } catch (err) {
      console.warn("[sendPurchaseEvent] Could not resolve event_source_url:", err);
    }

    // 6. Tracking config (exclude shipping?)
    const { data: trackingCfg } = await supabase
      .from("store_tracking_config")
      .select("exclude_shipping_from_value")
      .eq("store_id", order.store_id)
      .maybeSingle();

    const excludeShipping = trackingCfg?.exclude_shipping_from_value === true;
    const value = excludeShipping
      ? Number(order.total) - Number(order.frete || 0)
      : Number(order.total);

    // 7. Map products
    // Prefer retailer_id (matches catalog feed) so the Purchase event matches
    // Meta/Google catalog (Advantage+ Catalog Sales). Fallback to UUID for
    // legacy orders created before retailer_id persistence was introduced.
    const rawProducts = Array.isArray(order.products) ? order.products : [];
    const products = rawProducts.map((p: any) => ({
      id: p.retailer_id || p.variation_id || p.product_id || p.id,
      name: p.name || p.product_name || "Produto",
      quantity: Number(p.quantity) || 1,
      price: Number(p.price || p.unit_price) || 0,
      // Hybrid Meta grouping (matches feed item_group_id) — persisted at order
      // creation. Absent on legacy orders → CAPI falls back to id-as-group.
      contentGroupId: p.content_group_id || undefined,
    }));

    // 8. Send to multi-channel CAPI dispatcher
    const { error: invokeErr } = await supabase.functions.invoke("track-conversion", {
      body: {
        eventName: "Purchase",
        eventId,
        storeId: order.store_id,
        orderId: order.id,
        value: Math.round(value * 100) / 100,
        currency: storeCurrency,
        products,
        customerEmail,
        customerPhone,
        customerFirstName,
        customerLastName,
        customerCity,
        customerState,
        customerZipCode,
        customerCountry: "BR",
        customerCpf,
        // No fbp/fbc/ttclid/etc available server-side — that's fine,
        // CAPI works with hashed PII alone (it's how server-only events work)
        fbp: "",
        fbc: "",
        ttclid: "",
        ttp: "",
        epik: "",
        sourceUrl: eventSourceUrl,
        actionSource: "website",
      },
    });

    if (invokeErr) {
      console.error("[sendPurchaseEvent] track-conversion invoke failed:", invokeErr);
      return { sent: false, reason: "invoke_failed", eventId };
    }

    // 9. Mark as sent — idempotency lock
    const { error: markErr } = await supabase
      .from("orders")
      .update({ purchase_event_sent_at: new Date().toISOString() })
      .eq("id", orderId)
      .is("purchase_event_sent_at", null);

    if (markErr) {
      console.warn("[sendPurchaseEvent] Could not mark as sent:", markErr);
    }

    console.log("[sendPurchaseEvent] Purchase event sent successfully for order:", orderId, "eventId:", eventId);
    return { sent: true, eventId };
  } catch (err) {
    console.error("[sendPurchaseEvent] Unexpected error:", err);
    return { sent: false, reason: "exception" };
  }
}
