import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scheduleDelayedEmail } from "../_shared/scheduleEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PaymentRequest {
  storeId: string;
  orderId: string;
  paymentMethod: "pix" | "boleto" | "credit_card";
  amount: number;
  description: string;
  payer: {
    email: string;
    firstName?: string;
    lastName?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  // For credit card
  cardToken?: string;
  installments?: number;
  issuerId?: string;
}

async function refreshAccessToken(supabase: any, gateway: any): Promise<string | null> {
  const clientId = Deno.env.get("MP_CLIENT_ID");
  const clientSecret = Deno.env.get("MP_CLIENT_SECRET");

  if (!gateway.oauth_refresh_token || !clientId || !clientSecret) {
    return null;
  }

  try {
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: gateway.oauth_refresh_token,
      }),
    });

    if (!response.ok) {
      console.error("Falha ao renovar token");
      return null;
    }

    const tokenData = await response.json();

    // Update tokens in database
    await supabase
      .from("store_payment_gateways")
      .update({
        oauth_access_token: tokenData.access_token,
        oauth_refresh_token: tokenData.refresh_token,
        oauth_expires_at: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
      })
      .eq("id", gateway.id);

    console.log("Token renovado com sucesso");
    return tokenData.access_token;
  } catch (error) {
    console.error("Erro ao renovar token:", error);
    return null;
  }
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
    const body = await req.json();
    const { storeId, orderId, paymentMethod, amount: rawAmount, description, installments, issuerId, billingAddress } = body;

    // --- Security: Validate orderId belongs to storeId and is in a payable state ---
    if (!storeId || !orderId) {
      return new Response(
        JSON.stringify({ error: "storeId e orderId são obrigatórios", code: "MISSING_PARAMS" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: orderCheck, error: orderCheckError } = await supabase
      .from("orders")
      .select("id, store_id, status_pagamento, total")
      .eq("id", orderId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (orderCheckError || !orderCheck) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado", code: "ORDER_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Prevent duplicate payment on already-approved orders
    if (orderCheck.status_pagamento === "aprovado" || orderCheck.status_pagamento === "pago") {
      return new Response(
        JSON.stringify({ error: "Pedido já está pago", code: "ALREADY_PAID" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --- End security check ---

    // Sanitize amount: ensure it's a valid number with max 2 decimal places
    const amount = Number(Number(rawAmount).toFixed(2));
    if (!amount || isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor do pagamento inválido", code: "INVALID_AMOUNT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Anti-fraud: amount must match order total (allow 1 cent tolerance for float rounding) ---
    const orderTotal = Number(Number(orderCheck.total).toFixed(2));
    if (Math.abs(amount - orderTotal) > 0.01) {
      console.error(`[mercadopago-create-payment] Amount mismatch: client=${amount}, order=${orderTotal}, orderId=${orderId}`);
      return new Response(
        JSON.stringify({
          error: "Valor do pagamento não confere com o pedido",
          code: "AMOUNT_MISMATCH",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // Support cardToken (tokenized) or card object (raw) from frontend
    const cardToken = body.cardToken || body.token;
    
    // Support both "payer" (original) and "customer" (frontend) formats
    const rawPayer = body.payer || body.customer;
    const payer = {
      email: rawPayer?.email || "",
      firstName: rawPayer?.firstName || rawPayer?.name?.split(" ")[0] || "",
      lastName: rawPayer?.lastName || rawPayer?.name?.split(" ").slice(1).join(" ") || "",
      identification: rawPayer?.identification || (rawPayer?.document ? {
        type: "CPF",
        number: rawPayer.document.replace(/\D/g, ""),
      } : undefined),
    };

    console.log("Criando pagamento:", { storeId, orderId, paymentMethod, amount });

    // Get gateway configuration
    const { data: gateway, error: gatewayError } = await supabase
      .from("store_payment_gateways")
      .select("*")
      .eq("store_id", storeId)
      .eq("gateway_type", "mercado_pago")
      .eq("is_active", true)
      .single();

    if (gatewayError || !gateway) {
      console.error("Gateway não encontrado:", gatewayError);
      return new Response(
        JSON.stringify({ 
          error: "Mercado Pago não configurado para esta loja",
          code: "GATEWAY_NOT_CONFIGURED"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Support both OAuth and manual credentials
    const manualToken = (gateway.credentials as any)?.access_token;
    let accessToken = gateway.oauth_access_token || manualToken;

    // Check if token is expired
    if (gateway.oauth_expires_at && new Date(gateway.oauth_expires_at) < new Date()) {
      console.log("Token expirado, renovando...");
      accessToken = await refreshAccessToken(supabase, gateway);
      if (!accessToken) {
        return new Response(
          JSON.stringify({ 
            error: "Token expirado. Reconecte sua conta do Mercado Pago.",
            code: "TOKEN_EXPIRED"
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build payment payload based on method
    const paymentPayload: any = {
      transaction_amount: amount,
      description: description,
      external_reference: orderId,
      payer: {
        email: payer.email,
        first_name: payer.firstName,
        last_name: payer.lastName,
      },
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
    };

    if (payer.identification) {
      paymentPayload.payer.identification = payer.identification;
    }

    // Set payment method specific options
    const credentials = gateway.credentials as { pix_expiration_minutes?: number } | null;
    const pixExpirationMinutes = credentials?.pix_expiration_minutes;

    if (paymentMethod === "pix") {
      paymentPayload.payment_method_id = "pix";
      // Set PIX expiration - use configured value or default to 30 minutes
      const effectiveExpirationMinutes = (pixExpirationMinutes && pixExpirationMinutes > 0) ? pixExpirationMinutes : 30;
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + effectiveExpirationMinutes);
      paymentPayload.date_of_expiration = expirationDate.toISOString();
    } else if (paymentMethod === "boleto") {
      paymentPayload.payment_method_id = "bolbradesco";
      // Set expiration date to 3 days from now
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 3);
      paymentPayload.date_of_expiration = expirationDate.toISOString();
      
      // Boleto requires payer address on Mercado Pago
      if (billingAddress) {
        paymentPayload.payer.address = {
          zip_code: billingAddress.zip_code?.replace(/\D/g, ""),
          street_name: billingAddress.line_1?.split(",")[0]?.trim() || "",
          street_number: billingAddress.line_1?.split(",")[1]?.trim() || "S/N",
          neighborhood: billingAddress.neighborhood || "N/A",
          city: billingAddress.city || "",
          federal_unit: billingAddress.state || "",
        };
      }
    } else if (paymentMethod === "credit_card") {
      if (!cardToken) {
        throw new Error("Token do cartão é obrigatório");
      }
      paymentPayload.token = cardToken;
      paymentPayload.installments = installments || 1;
      if (issuerId) {
        paymentPayload.issuer_id = issuerId;
      }
    }

    console.log("Enviando pagamento para MP:", JSON.stringify(paymentPayload, null, 2));

    // Create payment in Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${orderId}-${paymentMethod}-${Date.now()}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    // Defensive response parsing - MP may return HTML on auth errors
    const contentType = mpResponse.headers.get("content-type");
    let mpData: any;
    if (!contentType?.includes("application/json")) {
      const textResponse = await mpResponse.text();
      console.error("MP retornou resposta não-JSON:", textResponse.substring(0, 500));
      throw new Error("Mercado Pago retornou uma resposta inesperada. Verifique a conexão do gateway.");
    }
    try {
      mpData = await mpResponse.json();
    } catch (parseError) {
      console.error("Falha ao parsear resposta MP:", parseError);
      throw new Error("Resposta inválida do Mercado Pago. Tente novamente.");
    }
    console.log("Resposta MP:", mpResponse.status, JSON.stringify(mpData, null, 2));

    if (!mpResponse.ok) {
      console.error("Erro MP:", mpData);
      // If 401, likely token issue - provide clear message
      if (mpResponse.status === 401) {
        throw new Error("Token do Mercado Pago expirado ou inválido. Reconecte sua conta nas configurações.");
      }
      throw new Error(mpData.message || "Erro ao criar pagamento no Mercado Pago");
    }

    // Extract relevant data based on payment method
    const transactionData: any = {
      order_id: orderId,
      store_id: storeId,
      gateway_type: "mercado_pago",
      external_id: mpData.id?.toString(),
      external_reference: orderId,
      amount: amount,
      currency: "BRL",
      status: mpData.status,
      status_detail: mpData.status_detail,
      payment_method: mpData.payment_method_id,
      payment_type: mpData.payment_type_id,
      payer_email: payer.email,
      payer_document: payer.identification?.number,
      gateway_response: mpData,
    };

    // Add PIX specific data
    if (paymentMethod === "pix" && mpData.point_of_interaction?.transaction_data) {
      transactionData.qr_code = mpData.point_of_interaction.transaction_data.qr_code;
      transactionData.qr_code_base64 = mpData.point_of_interaction.transaction_data.qr_code_base64;
      transactionData.expiration_date = mpData.date_of_expiration;
    }

    // Add boleto specific data
    if (paymentMethod === "boleto" && mpData.transaction_details) {
      transactionData.barcode = mpData.barcode?.content;
      transactionData.barcode_url = mpData.transaction_details.external_resource_url;
      transactionData.expiration_date = mpData.date_of_expiration;
    }

    // Add credit card specific data
    if (paymentMethod === "credit_card") {
      transactionData.installments = installments || 1;
    }

    // Save transaction to database
    const { data: transaction, error: transactionError } = await supabase
      .from("payment_transactions")
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error("Erro ao salvar transação:", transactionError);
    }

    // Update order payment status
    let orderStatus = "pendente";
    if (mpData.status === "approved") {
      orderStatus = "aprovado";
    } else if (mpData.status === "rejected") {
      orderStatus = "rejeitado";
    }

    await supabase
      .from("orders")
      .update({ 
        status_pagamento: orderStatus,
        forma_pagamento: paymentMethod === "credit_card" ? "cartao" : paymentMethod,
      })
      .eq("id", orderId);

    // Check if payment was rejected by the gateway
    const isRejected = mpData.status === "rejected";
    
    // Return response with relevant data
    const response: any = {
      success: !isRejected,
      transactionId: transaction?.id,
      externalId: mpData.id,
      status: mpData.status,
      statusDetail: mpData.status_detail,
      ...(isRejected && {
        error: `Pagamento rejeitado: ${mpData.status_detail || "motivo desconhecido"}`,
        errorCode: mpData.status_detail,
      }),
    };

    if (paymentMethod === "pix") {
      response.pix = {
        qrCode: transactionData.qr_code,
        qrCodeBase64: transactionData.qr_code_base64,
        expirationDate: transactionData.expiration_date,
      };
    } else if (paymentMethod === "boleto") {
      response.boleto = {
        barcode: transactionData.barcode,
        barcodeUrl: transactionData.barcode_url,
        expirationDate: transactionData.expiration_date,
      };
    }

    // Schedule PIX/Boleto email with delay (cancelled if payment confirmed before sending)
    if (!isRejected && (paymentMethod === "pix" || paymentMethod === "boleto")) {
      try {
        const emailType = paymentMethod === "pix" ? "pix_generated" : "boleto_generated";
        await schedulePaymentEmail(supabase, {
          storeId,
          orderId,
          emailType,
          customerEmail: payer.email,
          customerName: `${payer.firstName} ${payer.lastName}`.trim(),
          amount,
          qrCode: transactionData.qr_code,
          qrCodeBase64: transactionData.qr_code_base64,
          barcode: transactionData.barcode,
          barcodeUrl: transactionData.barcode_url,
          expirationDate: transactionData.expiration_date,
        });
        console.log(`E-mail ${emailType} agendado com sucesso`);
      } catch (emailError) {
        console.error("Erro ao agendar e-mail de pagamento:", emailError);
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// --- Schedule PIX/Boleto email helper ---

interface SchedulePaymentEmailParams {
  storeId: string;
  orderId: string;
  emailType: "pix_generated" | "boleto_generated";
  customerEmail: string;
  customerName: string;
  amount: number;
  qrCode?: string;
  qrCodeBase64?: string;
  barcode?: string;
  barcodeUrl?: string;
  expirationDate?: string;
}

async function schedulePaymentEmail(supabase: any, params: SchedulePaymentEmailParams) {
  const { storeId, orderId, emailType, customerEmail, customerName, amount, qrCode, qrCodeBase64, barcode, barcodeUrl, expirationDate } = params;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  const orderNumber = order?.order_number
    ? `#${order.order_number}`
    : `#${orderId.substring(0, 8).toUpperCase()}`;

  const products = (order?.products || []).map((p: any) => ({
    name: p.name || p.product_name || "Produto",
    quantity: p.quantity || 1,
    price: p.price || p.unit_price || 0,
    image_url: p.image || p.image_url,
    variation: p.variant || p.variation,
  }));

  const deliveryAddress = order?.endereco_entrega ? {
    street: order.endereco_entrega.rua || "",
    number: order.endereco_entrega.numero || "",
    complement: order.endereco_entrega.complemento,
    neighborhood: order.endereco_entrega.bairro || "",
    city: order.endereco_entrega.cidade || "",
    state: order.endereco_entrega.estado || "",
    zip_code: order.endereco_entrega.cep || "",
  } : undefined;

  const paymentData: any = {
    method: emailType === "pix_generated" ? "pix" : "boleto",
    amount,
    expiration_date: expirationDate,
  };

  if (emailType === "pix_generated") {
    paymentData.qr_code = qrCode;
    paymentData.qr_code_base64 = qrCodeBase64;
  } else {
    paymentData.barcode = barcode;
    paymentData.barcode_url = barcodeUrl;
  }

  await scheduleDelayedEmail({
    supabase,
    storeId,
    orderId,
    emailType,
    recipientEmail: customerEmail,
    recipientName: customerName,
    cancelIfPaymentConfirmed: true,
    emailPayload: {
      order_data: {
        order_number: orderNumber,
        products,
        subtotal: order?.subtotal || 0,
        shipping: order?.frete || 0,
        discount: order?.desconto || 0,
        total: order?.total || 0,
        delivery_address: deliveryAddress,
      },
      payment_data: paymentData,
    },
  });
}
