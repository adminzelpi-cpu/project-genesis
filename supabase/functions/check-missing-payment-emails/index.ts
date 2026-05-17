// Fallback job: detects orders paid in the last 2h that never received a 
// payment_confirmed email (e.g. due to webhook outage or transient failure)
// and dispatches the missing email. Idempotent — uses email_logs as source of truth.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Look for orders paid in the last 2 hours but older than 5 minutes
    // (5 min grace gives the webhook time to fire normally)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: paidOrders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, store_id, order_number, updated_at, endereco_entrega")
      .in("status_pagamento", ["aprovado", "pago"])
      .gte("updated_at", twoHoursAgo)
      .lte("updated_at", fiveMinAgo)
      .limit(100);

    if (ordersErr) throw ordersErr;
    if (!paidOrders || paidOrders.length === 0) {
      return new Response(JSON.stringify({ checked: 0, dispatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderIds = paidOrders.map((o) => o.id);

    // Find which of these already have a payment_confirmed email logged (sent or pending)
    const { data: existingLogs } = await supabase
      .from("email_logs")
      .select("order_id")
      .in("order_id", orderIds)
      .eq("email_type", "payment_confirmed")
      .in("status", ["sent", "pending"]);

    const alreadySent = new Set((existingLogs || []).map((l) => l.order_id));
    const missing = paidOrders.filter((o) => !alreadySent.has(o.id));

    let dispatched = 0;
    let failed = 0;

    for (const order of missing) {
      try {
        const { error: invokeErr } = await supabase.functions.invoke(
          "send-transactional-email",
          {
            body: {
              order_id: order.id,
              store_id: order.store_id,
              email_type: "payment_confirmed",
            },
          },
        );
        if (invokeErr) {
          console.error(`[check-missing-payment-emails] Failed for order ${order.id}:`, invokeErr);
          failed++;
        } else {
          dispatched++;
          console.log(`[check-missing-payment-emails] Dispatched fallback email for order ${order.order_number}`);
        }
      } catch (e) {
        console.error(`[check-missing-payment-emails] Error for order ${order.id}:`, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        checked: paidOrders.length,
        missing: missing.length,
        dispatched,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[check-missing-payment-emails] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
