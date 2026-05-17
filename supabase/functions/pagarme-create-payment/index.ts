import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logErrorToDb } from "../_shared/errorLogger.ts";
import { scheduleDelayedEmail } from "../_shared/scheduleEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InstallmentConfig {
  maxInstallments: number;
  interestRate: number;
  freeInstallments: number;
  minInstallmentValue: number;
}

interface PaymentRequest {
  storeId: string;
  orderId: string;
  paymentMethod: "pix" | "boleto" | "credit_card";
  amount: number;
  description: string;
  customer: {
    name: string;
    email: string;
    document: string;
    documentType?: "CPF" | "CNPJ";
    phones?: {
      mobile_phone?: {
        country_code: string;
        area_code: string;
        number: string;
      };
    };
  };
  // For credit card
  card?: {
    number: string;
    holder_name: string;
    exp_month: number;
    exp_year: number;
    cvv: string;
  };
  installments?: number;
  billingAddress?: {
    line_1: string;
    line_2?: string;
    zip_code: string;
    city: string;
    state: string;
    country: string;
  };
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
    const body: PaymentRequest = await req.json();
    const { storeId, orderId, paymentMethod, amount: rawAmount, description, customer, card, installments, billingAddress } = body;

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

    // Sanitize amount: ensure it's a valid number
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
      console.error(`[pagarme-create-payment] Amount mismatch: client=${amount}, order=${orderTotal}, orderId=${orderId}`);
      return new Response(
        JSON.stringify({
          error: "Valor do pagamento não confere com o pedido",
          code: "AMOUNT_MISMATCH",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Criando pagamento Pagar.me:", { storeId, orderId, paymentMethod, amount });

    // Get gateway configuration
    const { data: gateway, error: gatewayError } = await supabase
      .from("store_payment_gateways")
      .select("*")
      .eq("store_id", storeId)
      .eq("gateway_type", "pagarme")
      .eq("is_active", true)
      .single();

    if (gatewayError || !gateway) {
      console.error("Gateway não encontrado:", gatewayError);
      return new Response(
        JSON.stringify({ 
          error: "Pagar.me não configurado para esta loja",
          code: "GATEWAY_NOT_CONFIGURED"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = gateway.credentials as { 
      api_key?: string;
      installment_config?: InstallmentConfig;
      pix_expiration_minutes?: number;
    } | null;
    const apiKey = credentials?.api_key;
    const pixExpirationMinutes = credentials?.pix_expiration_minutes;
    const installmentConfig = credentials?.installment_config || {
      maxInstallments: 12,
      interestRate: 2.99,
      freeInstallments: 1,
      minInstallmentValue: 5,
    };

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: "Chave de API do Pagar.me não configurada",
          code: "API_KEY_MISSING"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authToken = btoa(`${apiKey}:`);

    // Calculate total with interest for credit card
    let finalAmount = amount;
    if (paymentMethod === "credit_card" && installments && installments > installmentConfig.freeInstallments) {
      const monthlyRate = installmentConfig.interestRate / 100;
      const factor = (monthlyRate * Math.pow(1 + monthlyRate, installments)) / 
                     (Math.pow(1 + monthlyRate, installments) - 1);
      const installmentValue = amount * factor;
      finalAmount = installmentValue * installments;
      console.log(`Calculando juros: ${installments}x, taxa: ${installmentConfig.interestRate}%, total: ${finalAmount.toFixed(2)}`);
    }

    // Build order payload for Pagar.me
    const orderPayload: any = {
      items: [
        {
          amount: Math.round(finalAmount * 100), // Pagar.me uses cents
          description: description,
          quantity: 1,
          code: orderId,
        },
      ],
      customer: {
        name: customer.name,
        email: customer.email,
        document: customer.document.replace(/\D/g, ""),
        document_type: customer.documentType || (customer.document.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ"),
        type: "individual",
      },
      payments: [],
    };

    // Add phone if provided
    if (customer.phones?.mobile_phone) {
      orderPayload.customer.phones = {
        mobile_phone: customer.phones.mobile_phone,
      };
    }

    // Configure payment method
    if (paymentMethod === "pix") {
      // Use configured value or default to 60 minutes (3600 seconds)
      const effectiveExpirationMinutes = (pixExpirationMinutes && pixExpirationMinutes > 0) ? pixExpirationMinutes : 60;
      orderPayload.payments.push({
        payment_method: "pix",
        pix: {
          expires_in: effectiveExpirationMinutes * 60,
        },
      });
    } else if (paymentMethod === "boleto") {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      
      orderPayload.payments.push({
        payment_method: "boleto",
        boleto: {
          due_at: dueDate.toISOString(),
          instructions: "Não aceitar após vencimento",
        },
      });
    } else if (paymentMethod === "credit_card") {
      if (!card) {
        throw new Error("Dados do cartão são obrigatórios");
      }

      const cardPayment: any = {
        payment_method: "credit_card",
        credit_card: {
          installments: installments || 1,
          card: {
            number: card.number.replace(/\D/g, ""),
            holder_name: card.holder_name,
            exp_month: card.exp_month,
            exp_year: card.exp_year,
            cvv: card.cvv,
          },
        },
      };

      if (billingAddress) {
        cardPayment.credit_card.card.billing_address = billingAddress;
      }

      orderPayload.payments.push(cardPayment);
    }

    console.log("Enviando pedido para Pagar.me:", JSON.stringify(orderPayload, null, 2));

    // Create order in Pagar.me
    const pagarmeResponse = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${orderId}-${paymentMethod}-${Date.now()}`,
      },
      body: JSON.stringify(orderPayload),
    });

    // Defensive response parsing - Pagar.me may return HTML on auth errors
    const contentType = pagarmeResponse.headers.get("content-type");
    let pagarmeData: any;
    if (!contentType?.includes("application/json")) {
      const textResponse = await pagarmeResponse.text();
      console.error("Pagar.me retornou resposta não-JSON:", textResponse.substring(0, 500));
      throw new Error("Pagar.me retornou uma resposta inesperada. Verifique a chave de API nas configurações.");
    }
    try {
      pagarmeData = await pagarmeResponse.json();
    } catch (parseError) {
      console.error("Falha ao parsear resposta Pagar.me:", parseError);
      throw new Error("Resposta inválida do Pagar.me. Tente novamente.");
    }
    console.log("Resposta Pagar.me:", pagarmeResponse.status, JSON.stringify(pagarmeData, null, 2));

    if (!pagarmeResponse.ok) {
      console.error("Erro Pagar.me:", pagarmeData);
      if (pagarmeResponse.status === 401) {
        throw new Error("Chave de API do Pagar.me inválida. Verifique nas configurações.");
      }
      const errorMessage = pagarmeData.message || pagarmeData.errors?.[0]?.message || "Erro ao criar pagamento no Pagar.me";
      throw new Error(errorMessage);
    }

    // Extract charge data
    const charge = pagarmeData.charges?.[0];
    const lastTransaction = charge?.last_transaction;

    // Check if transaction failed (even if HTTP was 200)
    if (pagarmeData.status === "failed" || charge?.status === "failed") {
      const gatewayErrors = lastTransaction?.gateway_response?.errors || [];
      const errorMessage = gatewayErrors[0]?.message || "Pagamento rejeitado pelo gateway";
      console.error("Transação falhou:", errorMessage, gatewayErrors);
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: "PAYMENT_FAILED",
          gatewayErrors
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build transaction data
    const transactionData: any = {
      order_id: orderId,
      store_id: storeId,
      gateway_type: "pagarme",
      external_id: pagarmeData.id,
      external_reference: orderId,
      amount: finalAmount, // Store the final amount (with interest if applicable)
      currency: "BRL",
      status: mapPagarmeStatus(pagarmeData.status),
      status_detail: charge?.status,
      payment_method: paymentMethod,
      payment_type: paymentMethod,
      payer_email: customer.email,
      payer_document: customer.document,
      gateway_response: pagarmeData,
    };

    // Add PIX specific data
    if (paymentMethod === "pix" && lastTransaction?.qr_code) {
      transactionData.qr_code = lastTransaction.qr_code;
      transactionData.qr_code_base64 = lastTransaction.qr_code_url;
      transactionData.expiration_date = lastTransaction.expires_at;
    }

    // Add boleto specific data
    if (paymentMethod === "boleto" && lastTransaction) {
      transactionData.barcode = lastTransaction.line;
      transactionData.barcode_url = lastTransaction.pdf;
      transactionData.expiration_date = lastTransaction.due_at;
    }

    // Add credit card specific data
    if (paymentMethod === "credit_card") {
      transactionData.installments = installments || 1;
    }

    // Save transaction and update order IN PARALLEL
    const orderStatus = mapPagarmeStatus(pagarmeData.status);

    const [transactionResult] = await Promise.all([
      supabase
        .from("payment_transactions")
        .insert(transactionData)
        .select()
        .single(),
      supabase
        .from("orders")
        .update({ 
          status_pagamento: orderStatus,
          forma_pagamento: paymentMethod === "credit_card" ? "cartao" : paymentMethod,
        })
        .eq("id", orderId),
    ]);

    const { data: transaction, error: transactionError } = transactionResult;

    if (transactionError) {
      console.error("Erro ao salvar transação:", transactionError);
    }

    // Build response
    const response: any = {
      success: true,
      transactionId: transaction?.id,
      externalId: pagarmeData.id,
      status: pagarmeData.status,
      statusDetail: charge?.status,
    };

    if (paymentMethod === "pix" && lastTransaction) {
      response.pix = {
        qrCode: lastTransaction.qr_code,
        qrCodeBase64: lastTransaction.qr_code_url,
        expirationDate: lastTransaction.expires_at,
      };

      // Schedule PIX email with 10min delay (cancelled if payment confirmed)
      schedulePaymentEmail(supabase, {
        storeId,
        orderId,
        emailType: "pix_generated",
        customerEmail: customer.email,
        customerName: customer.name,
        amount: finalAmount,
        qrCode: lastTransaction.qr_code,
        qrCodeBase64: lastTransaction.qr_code_url,
        expirationDate: lastTransaction.expires_at,
      }).then(() => console.log("[pagarme-create-payment] PIX email scheduled"))
        .catch((e) => console.error("[pagarme-create-payment] PIX email schedule failed:", e));
    } else if (paymentMethod === "boleto" && lastTransaction) {
      response.boleto = {
        barcode: lastTransaction.line,
        barcodeUrl: lastTransaction.pdf,
        expirationDate: lastTransaction.due_at,
      };

      // Schedule Boleto email with 10min delay (cancelled if payment confirmed)
      schedulePaymentEmail(supabase, {
        storeId,
        orderId,
        emailType: "boleto_generated",
        customerEmail: customer.email,
        customerName: customer.name,
        amount: finalAmount,
        barcode: lastTransaction.line,
        barcodeUrl: lastTransaction.pdf,
        expirationDate: lastTransaction.due_at,
      }).then(() => console.log("[pagarme-create-payment] Boleto email scheduled"))
        .catch((e) => console.error("[pagarme-create-payment] Boleto email schedule failed:", e));
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const stackTrace = error instanceof Error ? error.stack : undefined;
    
    // Log critical payment error
    await logErrorToDb({
      category: "payment",
      severity: "critical",
      message: `Falha ao criar pagamento Pagar.me: ${errorMessage}`,
      stackTrace,
      context: {
        function: "pagarme-create-payment",
        error: errorMessage,
      },
    });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapPagarmeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    paid: "aprovado",
    pending: "pendente",
    canceled: "cancelado",
    processing: "processando",
    failed: "rejeitado",
  };
  return statusMap[status] || "pendente";
}

// Helper to schedule payment emails with delay
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

  // Get order data to build full email payload
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

  // Schedule with delay instead of sending immediately
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
