import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InstallmentsRequest {
  storeId: string;
  amount: number;
  paymentMethodId?: string; // e.g. "visa", "master" - optional, fetches all if not provided
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
    const { storeId, amount, paymentMethodId }: InstallmentsRequest = await req.json();

    if (!storeId || !amount) {
      return new Response(
        JSON.stringify({ error: "storeId e amount são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get gateway configuration
    const { data: gateway, error: gatewayError } = await supabase
      .from("store_payment_gateways")
      .select("*")
      .eq("store_id", storeId)
      .eq("gateway_type", "mercado_pago")
      .eq("is_active", true)
      .single();

    if (gatewayError || !gateway) {
      return new Response(
        JSON.stringify({ error: "Gateway Mercado Pago não encontrado", dynamic: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = gateway.oauth_access_token;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Access token não configurado", dynamic: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get merchant's installment config for max/free limits
    const credentials = (gateway.credentials || {}) as {
      installment_config?: {
        maxInstallments?: number;
        freeInstallments?: number;
        minInstallmentValue?: number;
      };
    };
    const maxInstallments = credentials.installment_config?.maxInstallments || 12;
    const freeInstallments = credentials.installment_config?.freeInstallments || 1;
    const minInstallmentValue = credentials.installment_config?.minInstallmentValue || 5;

    // Fetch installments from Mercado Pago API
    // The API returns the actual rates negotiated by the merchant
    const url = new URL("https://api.mercadopago.com/v1/payment_methods/installments");
    url.searchParams.set("amount", amount.toString());
    if (paymentMethodId) {
      url.searchParams.set("payment_method_id", paymentMethodId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("MP installments API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar parcelas do Mercado Pago", dynamic: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpData = await response.json();

    // Process and consolidate installment options
    // MP returns installments per payment method (visa, master, etc.)
    // We'll consolidate into a single list using the best rate for each installment count
    const installmentMap = new Map<number, {
      quantity: number;
      value: number;
      totalWithInterest: number;
      interest: boolean;
      rate: number;
    }>();

    for (const method of mpData) {
      if (!method.payer_costs) continue;
      
      for (const cost of method.payer_costs) {
        const qty = cost.installments;
        if (qty > maxInstallments) continue;

        const installmentValue = cost.installment_amount;
        const totalAmount = cost.total_amount;
        const rate = cost.installment_rate;

        // For installments within freeInstallments range, force interest-free
        const isInterestFree = qty <= freeInstallments;
        
        let finalValue = installmentValue;
        let finalTotal = totalAmount;
        
        if (isInterestFree) {
          finalValue = amount / qty;
          finalTotal = amount;
        }

        // Keep the best (lowest) rate for each installment count
        const existing = installmentMap.get(qty);
        if (!existing || finalValue < existing.value) {
          installmentMap.set(qty, {
            quantity: qty,
            value: finalValue,
            totalWithInterest: finalTotal,
            interest: !isInterestFree && rate > 0,
            rate: isInterestFree ? 0 : rate,
          });
        }
      }
    }

    // Convert to sorted array, filter by min value
    const installments = Array.from(installmentMap.values())
      .filter(opt => opt.value >= minInstallmentValue)
      .sort((a, b) => a.quantity - b.quantity);

    return new Response(
      JSON.stringify({ 
        installments, 
        dynamic: true,
        maxInstallments,
        freeInstallments,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching MP installments:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", dynamic: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
