import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TrackingRequest {
  storeId: string;
  trackingNumber: string;
  shippingServiceCode?: string;
  orderNumber?: string;
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
    const { storeId, trackingNumber, shippingServiceCode, orderNumber }: TrackingRequest = await req.json();

    if (!storeId || !trackingNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "storeId e trackingNumber são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get store shipping config
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("shipping_config")
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
        JSON.stringify({ success: false, error: "Frenet não configurada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const frenetPayload = {
      ShippingServiceCode: shippingServiceCode || "",
      TrackingNumber: trackingNumber,
      InvoiceNumber: "",
      InvoiceSerie: "",
      RecipientDocument: "",
      OrderNumber: orderNumber || "",
    };

    console.log("Querying Frenet tracking:", JSON.stringify(frenetPayload));

    const frenetResponse = await fetch("https://api.frenet.com.br/tracking/trackinginfo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "token": shippingConfig.frenet_token,
      },
      body: JSON.stringify(frenetPayload),
    });

    const responseText = await frenetResponse.text();
    console.log("Frenet tracking response:", frenetResponse.status, responseText);

    let frenetData;
    try {
      frenetData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Resposta inválida da Frenet" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!frenetResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: frenetData?.Message || "Erro ao consultar rastreio",
          details: frenetData
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tracking: frenetData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error querying tracking:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno ao consultar rastreio" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
