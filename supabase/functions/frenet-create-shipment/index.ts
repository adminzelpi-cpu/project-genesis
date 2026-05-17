import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateShipmentRequest {
  storeId: string;
  orderId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { storeId, orderId }: CreateShipmentRequest = await req.json();

    if (!storeId || !orderId) {
      return new Response(
        JSON.stringify({ success: false, error: "storeId e orderId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get store with shipping config
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("shipping_config, address_zip, name, address_street, address_number, address_complement, address_neighborhood, address_city, address_state")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ success: false, error: "Loja não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shippingConfig = store.shipping_config || {};
    if (!shippingConfig.frenet_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Frenet não configurada para esta loja" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order details with customer
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, customers(nome, email, cpf, telefone)")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: "Pedido não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endereco = order.endereco_entrega as any;
    if (!endereco?.cep) {
      return new Response(
        JSON.stringify({ success: false, error: "Pedido sem endereço de entrega" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customer = order.customers as any;
    const products = (order.products || []) as any[];
    const originCep = (shippingConfig.origin_cep || store.address_zip || "").replace(/\D/g, "");

    // Build volumes/items array
    const volumes = products.map((p: any, index: number) => ({
      Height: p.height || 2,
      Length: p.length || 16,
      Width: p.width || 11,
      Weight: p.weight || 0.3,
      Quantity: p.quantity || 1,
      SKU: p.sku || p.product_id || p.id || `ITEM-${index}`,
      Category: p.category || "Geral",
      Description: p.name || p.product_name || "Produto",
      UnitPrice: p.price || p.unit_price || 0,
    }));

    // Build the order number
    const orderNumber = order.order_number ? `${order.order_number}` : order.id.slice(0, 8);

    // Get the shipping service code from the selected shipping method
    const shippingServiceCode = endereco.shippingServiceCode || endereco.ServiceCode || "";
    const shippingCarrier = endereco.shippingCarrier || endereco.Carrier || "";

    // Build Frenet createorderasync payload
    // Docs: https://docs.frenet.com.br/reference/createorderasync
    const frenetPayload = {
      Orders: [
        {
          OrderNumber: orderNumber,
          ShippingServiceCode: shippingServiceCode,
          // Sender (store) info
          SenderCEP: originCep,
          SenderName: store.name || "Loja",
          SenderStreet: store.address_street || "",
          SenderNumber: store.address_number || "S/N",
          SenderComplement: store.address_complement || "",
          SenderDistrict: store.address_neighborhood || "",
          SenderCity: store.address_city || "",
          SenderStateAbbreviation: store.address_state || "",
          SenderCountry: "BR",
          // Recipient info
          RecipientCEP: endereco.cep.replace(/\D/g, ""),
          RecipientName: endereco.destinatario || customer?.nome || "Cliente",
          RecipientDocument: customer?.cpf?.replace(/\D/g, "") || "",
          RecipientEmail: customer?.email || "",
          RecipientPhone: customer?.telefone?.replace(/\D/g, "") || "",
          RecipientStreet: endereco.rua || "",
          RecipientNumber: endereco.numero || "S/N",
          RecipientComplement: endereco.complemento || "",
          RecipientDistrict: endereco.bairro || "",
          RecipientCity: endereco.cidade || "",
          RecipientStateAbbreviation: endereco.estado || "",
          RecipientCountry: "BR",
          // Values
          ShipmentInvoiceValue: order.total || 0,
          ShipmentOrderValue: order.subtotal || order.total || 0,
          // Volumes/Items
          Volumes: volumes,
        }
      ]
    };

    console.log("Creating Frenet order via createorderasync:", JSON.stringify(frenetPayload));

    // Call Frenet API - createorderasync endpoint
    const frenetResponse = await fetch("https://api.frenet.com.br/orders/createorderasync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "token": shippingConfig.frenet_token,
      },
      body: JSON.stringify(frenetPayload),
    });

    const responseText = await frenetResponse.text();
    console.log("Frenet createorderasync response:", frenetResponse.status, responseText);

    let frenetData;
    try {
      frenetData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Resposta inválida da Frenet", details: responseText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!frenetResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: frenetData?.Message || frenetData?.message || "Erro ao criar pedido na Frenet",
          details: frenetData
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for errors in the response
    const orderResult = frenetData?.Orders?.[0] || frenetData;
    const hasError = orderResult?.Error || orderResult?.Errors?.length > 0;
    
    if (hasError) {
      const errorMsg = orderResult?.Error?.Message || orderResult?.Errors?.[0]?.Message || "Erro ao criar pedido na Frenet";
      console.error("Frenet order error:", errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg,
          details: frenetData
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the order to mark it was sent to Frenet
    const trackingNumber = orderResult?.TrackingNumber || "";
    const shipmentId = orderResult?.ShipmentId || orderResult?.Id || "";
    
    const updateData: any = {
      tracking_carrier: shippingCarrier || orderResult?.Carrier || "",
    };
    
    if (trackingNumber) {
      updateData.tracking_code = trackingNumber;
      // Auto-update order status to "enviado" when tracking code is issued
      updateData.status_pedido = 'enviado';
      updateData.tracking_code_sent_at = new Date().toISOString();
    }

    // Store Frenet metadata in the order's endereco_entrega
    const updatedEndereco = {
      ...endereco,
      frenet_sent: true,
      frenet_sent_at: new Date().toISOString(),
      frenet_shipment_id: shipmentId,
    };
    updateData.endereco_entrega = updatedEndereco;

    await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    console.log("Order successfully sent to Frenet:", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        data: frenetData,
        message: "Pedido enviado para a Frenet! Acesse o painel para pagar e imprimir a etiqueta.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Frenet order:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno ao criar pedido na Frenet" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
