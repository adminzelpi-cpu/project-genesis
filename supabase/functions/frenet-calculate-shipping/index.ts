import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ShippingItem {
  weight: number; // kg
  length: number; // cm
  height: number; // cm
  width: number; // cm
  quantity: number;
  price: number; // valor do item
}

interface ShippingRequest {
  storeId: string;
  destinationCep: string;
  items: ShippingItem[];
}

interface FrenetQuote {
  ServiceCode: string;
  ServiceDescription: string;
  Carrier: string;
  ShippingPrice: string;
  DeliveryTime: string;
  Error: boolean;
  Msg: string;
  OriginalDeliveryTime: string;
  OriginalShippingPrice: string;
}

interface FrenetResponse {
  ShippingSevicesArray: FrenetQuote[];
}

interface ShippingConfig {
  frenet_token?: string;
  origin_cep?: string;
  enabled?: boolean;
  simplified_display?: boolean;
  shipping_subsidy?: number;
  shipping_subsidy_type?: 'fixed' | 'percentage';
  shipping_subsidy_apply_to?: 'cheapest' | 'all';
  max_free_shipping_cost?: number;
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
    const { storeId, destinationCep, items }: ShippingRequest = await req.json();

    console.log("Calculating shipping for store:", storeId);
    console.log("Destination CEP:", destinationCep);
    console.log("Items:", JSON.stringify(items));

    if (!storeId || !destinationCep || !items?.length) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Store ID, CEP de destino e itens são obrigatórios" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get store shipping configuration
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("shipping_config, address_zip, default_shipping_cost, free_shipping_threshold")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      console.error("Store not found:", storeError);
      return new Response(
        JSON.stringify({ success: false, error: "Loja não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shippingConfig: ShippingConfig = store.shipping_config || {};

    // Check if Frenet is configured
    if (!shippingConfig.frenet_token) {
      console.log("Frenet not configured, returning default shipping");
      
      // Return default shipping if configured
      if (store.default_shipping_cost !== null) {
        const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const isFreeShipping = store.free_shipping_threshold && totalValue >= store.free_shipping_threshold;
        
        return new Response(
          JSON.stringify({
            success: true,
            quotes: [{
              service_code: "default",
              service_name: "Entrega Padrão",
              carrier: "Loja",
              price: isFreeShipping ? 0 : store.default_shipping_cost,
              delivery_time: 7,
              is_free: isFreeShipping,
            }],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Frete não configurado para esta loja" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get origin CEP (from config or store address)
    const originCep = shippingConfig.origin_cep || store.address_zip;
    if (!originCep) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "CEP de origem não configurado" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate total weight and dimensions
    let totalWeight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;
    let totalValue = 0;

    for (const item of items) {
      const qty = item.quantity || 1;
      totalWeight += (item.weight || 0.3) * qty; // Default 300g if not specified
      maxLength = Math.max(maxLength, item.length || 16);
      maxWidth = Math.max(maxWidth, item.width || 11);
      totalHeight += (item.height || 2) * qty;
      totalValue += (item.price || 0) * qty;
    }

    // Ensure minimum dimensions (Frenet requirements)
    totalWeight = Math.max(totalWeight, 0.1);
    maxLength = Math.max(maxLength, 16);
    maxWidth = Math.max(maxWidth, 11);
    totalHeight = Math.max(totalHeight, 2);

    // Clean CEPs (remove non-numeric characters)
    const cleanOriginCep = originCep.replace(/\D/g, "");
    const cleanDestCep = destinationCep.replace(/\D/g, "");

    console.log("Calling Frenet API with:", {
      originCep: cleanOriginCep,
      destCep: cleanDestCep,
      weight: totalWeight,
      dimensions: { length: maxLength, width: maxWidth, height: totalHeight },
      value: totalValue,
    });

    // Call Frenet API
    const frenetPayload = {
      SellerCEP: cleanOriginCep,
      RecipientCEP: cleanDestCep,
      ShipmentInvoiceValue: totalValue,
      ShippingItemArray: [{
        Height: totalHeight,
        Length: maxLength,
        Width: maxWidth,
        Weight: totalWeight,
        Quantity: 1,
      }],
    };

    const frenetResponse = await fetch("https://api.frenet.com.br/shipping/quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "token": shippingConfig.frenet_token,
      },
      body: JSON.stringify(frenetPayload),
    });

    if (!frenetResponse.ok) {
      const errorText = await frenetResponse.text();
      console.error("Frenet API error:", frenetResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Erro ao consultar frete. Tente novamente." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const frenetData: FrenetResponse = await frenetResponse.json();
    console.log("Frenet response:", JSON.stringify(frenetData));

    // Configuration options
    const subsidy = shippingConfig.shipping_subsidy || 0;
    const subsidyType = shippingConfig.shipping_subsidy_type || 'fixed';
    const subsidyApplyTo = shippingConfig.shipping_subsidy_apply_to || 'cheapest';
    const simplifiedDisplay = shippingConfig.simplified_display ?? true;
    const maxFreeShippingCost = shippingConfig.max_free_shipping_cost || 0;
    const isFreeShipping = store.free_shipping_threshold && totalValue >= store.free_shipping_threshold;

    // Parse and filter valid quotes - first get all raw quotes (no subsidy yet)
    let allQuotes = (frenetData.ShippingSevicesArray || [])
      .filter((quote) => !quote.Error && parseFloat(quote.ShippingPrice) > 0)
      .map((quote) => {
        const originalPrice = parseFloat(quote.ShippingPrice);
        return {
          service_code: quote.ServiceCode,
          service_name: quote.ServiceDescription,
          carrier: quote.Carrier,
          price: originalPrice,
          original_price: originalPrice,
          delivery_time: parseInt(quote.DeliveryTime) || 7,
          is_free: false,
          subsidy_applied: undefined as number | undefined,
        };
      })
      .sort((a, b) => a.price - b.price);

    if (allQuotes.length === 0) {
      // Check for error messages
      const errorQuote = frenetData.ShippingSevicesArray?.find(q => q.Error);
      const errorMsg = errorQuote?.Msg || "Nenhuma opção de frete disponível para este CEP";
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg,
          quotes: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Identify cheapest quote (based on original price, before any discount)
    const cheapestServiceCode = allQuotes[0].service_code;

    // Apply subsidy according to scope (cheapest only OR all options)
    if (subsidy > 0) {
      allQuotes = allQuotes.map((quote) => {
        const isCheapestOption = quote.service_code === cheapestServiceCode;
        const shouldApplySubsidy = subsidyApplyTo === 'all' || isCheapestOption;

        if (!shouldApplySubsidy) return quote;

        let subsidyAmount = 0;
        if (subsidyType === 'percentage') {
          subsidyAmount = quote.original_price * (subsidy / 100);
        } else {
          subsidyAmount = subsidy;
        }
        const finalPrice = Math.max(0, quote.original_price - subsidyAmount);

        return {
          ...quote,
          price: finalPrice,
          subsidy_applied: subsidyAmount > 0 ? subsidyAmount : undefined,
        };
      });
    }

    // Apply free shipping ONLY to the cheapest option
    let quotes = allQuotes.map((quote) => {
      const isCheapestOption = quote.service_code === cheapestServiceCode;
      
      if (isFreeShipping && isCheapestOption) {
        // Apply free shipping with cost ceiling logic - ONLY for cheapest
        let customerPays = quote.price;
        let freeShippingDiscount = 0;
        
        if (maxFreeShippingCost > 0 && quote.price > maxFreeShippingCost) {
          // Customer pays the difference above the ceiling
          customerPays = quote.price - maxFreeShippingCost;
          freeShippingDiscount = maxFreeShippingCost;
        } else {
          // Full free shipping
          customerPays = 0;
          freeShippingDiscount = quote.price;
        }
        
        return {
          ...quote,
          price: customerPays,
          is_free: customerPays === 0,
          free_shipping_discount: freeShippingDiscount > 0 ? freeShippingDiscount : undefined,
        };
      }
      
      // Other options keep their normal price (no free shipping)
      return quote;
    });

    // Apply simplified display filter (Económica + Rápida)
    if (simplifiedDisplay && quotes.length > 1) {
      // Cheapest option (Entrega Econômica)
      const cheapest = quotes.reduce((min, q) => q.price < min.price ? q : min, quotes[0]);
      
      // Fastest option (Entrega Rápida) - must be different from cheapest
      const fastest = quotes
        .filter(q => q.service_code !== cheapest.service_code)
        .reduce((min, q) => q.delivery_time < min.delivery_time ? q : min, quotes.find(q => q.service_code !== cheapest.service_code) || quotes[0]);

      // Only add fastest if it's actually faster
      if (fastest && fastest.delivery_time < cheapest.delivery_time) {
        quotes = [
          {
            ...cheapest,
            service_name: "Entrega Econômica",
          },
          {
            ...fastest,
            service_name: "Entrega Rápida",
            // Ensure fastest doesn't have free shipping properties (since it's not cheapest)
            is_free: false,
            free_shipping_discount: undefined,
          },
        ];
      } else {
        // If cheapest is also the fastest, show only one option
        quotes = [{
          ...cheapest,
          service_name: "Entrega Econômica",
        }];
      }
    }

    // Note: We no longer rename to "Frete Grátis" - keep original name
    // The UI will show "Grátis" in the price area instead

    return new Response(
      JSON.stringify({
        success: true,
        quotes,
        origin_cep: cleanOriginCep,
        destination_cep: cleanDestCep,
        simplified_display: simplifiedDisplay,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error calculating shipping:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Erro interno ao calcular frete" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
