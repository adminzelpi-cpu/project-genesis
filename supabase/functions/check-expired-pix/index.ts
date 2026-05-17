import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for expired PIX payments...");

    // Find PIX payments that are pending and have expired
    const { data: expiredPayments, error: queryError } = await supabase
      .from("payment_transactions")
      .select(`
        id,
        order_id,
        store_id,
        external_id,
        expiration_date,
        payer_email
      `)
      .in("status", ["pending", "pendente"])
      .in("payment_type", ["pix", "bank_transfer"])
      .not("expiration_date", "is", null)
      .lt("expiration_date", new Date().toISOString());

    if (queryError) {
      console.error("Error querying expired payments:", queryError);
      throw queryError;
    }

    console.log(`Found ${expiredPayments?.length || 0} expired PIX payments`);

    const results = [];

    for (const payment of expiredPayments || []) {
      try {
        console.log(`Processing expired PIX payment: ${payment.id}`);

        // Update payment status to expired
        const { error: updatePaymentError } = await supabase
          .from("payment_transactions")
          .update({
            status: "expired",
            status_detail: "pix_expired_by_cron",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (updatePaymentError) {
          console.error(`Error updating payment ${payment.id}:`, updatePaymentError);
          results.push({ payment_id: payment.id, success: false, error: updatePaymentError.message });
          continue;
        }

        // Update order status
        const { error: updateOrderError } = await supabase
          .from("orders")
          .update({
            status_pagamento: "expirado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.order_id);

        if (updateOrderError) {
          console.error(`Error updating order ${payment.order_id}:`, updateOrderError);
        }

        // Get order details for email
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select(`
            id,
            store_id,
            customer_id,
            products,
            product_snapshots,
            subtotal,
            frete,
            desconto,
            total,
            endereco_entrega
          `)
          .eq("id", payment.order_id)
          .single();

        if (orderError || !order) {
          console.error(`Error fetching order ${payment.order_id}:`, orderError);
          results.push({ payment_id: payment.id, success: true, email_sent: false, error: "Order not found" });
          continue;
        }

        // Get store details
        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("id, name, slug, order_prefix, email")
          .eq("id", order.store_id)
          .single();

        if (storeError || !store) {
          console.error(`Error fetching store ${order.store_id}:`, storeError);
          results.push({ payment_id: payment.id, success: true, email_sent: false, error: "Store not found" });
          continue;
        }

        // Get customer details
        let customerEmail = payment.payer_email;
        let customerName = "Cliente";

        if (order.customer_id) {
          const { data: customer } = await supabase
            .from("customers")
            .select("nome, email")
            .eq("id", order.customer_id)
            .single();

          if (customer) {
            customerName = customer.nome || customerName;
            customerEmail = customer.email || customerEmail;
          }
        }

        if (!customerEmail) {
          console.log(`No email found for payment ${payment.id}`);
          results.push({ payment_id: payment.id, success: true, email_sent: false, error: "No customer email" });
          continue;
        }

        // Check email settings
        const { data: emailSettings } = await supabase
          .from("store_email_settings")
          .select("pix_expired_enabled")
          .eq("store_id", store.id)
          .single();

        if (emailSettings && !emailSettings.pix_expired_enabled) {
          console.log(`PIX expired email disabled for store ${store.id}`);
          results.push({ payment_id: payment.id, success: true, email_sent: false, error: "Email disabled" });
          continue;
        }

        // Build order data for email
        const productSnapshots = order.product_snapshots as any[] || [];
        const products = order.products as any[] || [];
        
        const emailProducts = productSnapshots.length > 0 
          ? productSnapshots.map((p: any) => ({
              name: p.name || p.nome || "Produto",
              quantity: p.quantity || p.quantidade || 1,
              price: p.price || p.unit_price || p.preco || 0,
              image_url: p.image_url || p.image || (p.images && p.images[0]) || null,
              variation: p.variant_name || p.variation || p.variacao || null,
            }))
          : products.map((p: any) => ({
              name: p.name || p.nome || "Produto",
              quantity: p.quantity || p.quantidade || 1,
              price: p.price || p.unit_price || p.preco || 0,
              image_url: p.image_url || (p.images && p.images[0]) || p.image || null,
              variation: p.variant_name || p.variation || p.variacao || null,
            }));

        const endereco = order.endereco_entrega as any;
        const deliveryAddress = endereco ? {
          street: endereco.rua || endereco.street || "",
          number: endereco.numero || endereco.number || "",
          complement: endereco.complemento || endereco.complement || "",
          neighborhood: endereco.bairro || endereco.neighborhood || "",
          city: endereco.cidade || endereco.city || "",
          state: endereco.estado || endereco.state || "",
          zip_code: endereco.cep || endereco.zip_code || "",
        } : undefined;

        const orderNumber = order.order_number
          ? `#${order.order_number}`
          : `#${order.id.slice(0, 8).toUpperCase()}`;

        // Build retry payment URL (custom domain → fallback)
        const { getStorePublicUrl } = await import("../_shared/storeUrl.ts");
        const baseUrl = await getStorePublicUrl(supabase, { id: store.id, slug: store.slug });
        const retryPaymentUrl = `${baseUrl}/order/${order.id}/retry-payment`;

        // Send email
        const emailPayload = {
          store_id: store.id,
          email_type: "pix_expired",
          recipient_email: customerEmail,
          recipient_name: customerName,
          order_id: order.id,
          order_data: {
            order_number: orderNumber,
            products: emailProducts,
            subtotal: order.subtotal,
            shipping: order.frete,
            discount: order.desconto,
            total: order.total,
            delivery_address: deliveryAddress,
          },
          retry_payment_url: retryPaymentUrl,
        };

        console.log(`Sending pix_expired email to ${customerEmail}`);

        const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
          body: emailPayload,
        });

        if (emailError) {
          console.error(`Error sending email for payment ${payment.id}:`, emailError);
          results.push({ payment_id: payment.id, success: true, email_sent: false, error: emailError.message });
        } else {
          console.log(`Successfully sent pix_expired email for payment ${payment.id}`);
          results.push({ payment_id: payment.id, success: true, email_sent: true });
        }

      } catch (err) {
        console.error(`Error processing payment ${payment.id}:`, err);
        results.push({ payment_id: payment.id, success: false, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in check-expired-pix:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
