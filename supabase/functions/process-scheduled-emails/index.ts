import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch pending emails that are due
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("scheduled_emails")
      .select("*")
      .eq("status", "pending")
      .lte("send_after", new Date().toISOString())
      .order("send_after", { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error("[process-scheduled-emails] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-scheduled-emails] Processing ${pendingEmails.length} scheduled emails`);

    let processed = 0;
    let cancelled = 0;
    let sent = 0;

    for (const scheduled of pendingEmails) {
      try {
        // Check if we should cancel due to payment being confirmed
        if (scheduled.cancel_if_payment_confirmed && scheduled.order_id) {
          const { data: order } = await supabase
            .from("orders")
            .select("status_pagamento")
            .eq("id", scheduled.order_id)
            .single();

          if (order && ["aprovado", "pago"].includes(order.status_pagamento)) {
            // Payment confirmed - cancel this email
            await supabase
              .from("scheduled_emails")
              .update({
                status: "cancelled",
                processed_at: new Date().toISOString(),
                cancelled_reason: "payment_confirmed_before_send",
              })
              .eq("id", scheduled.id);

            console.log(`[process-scheduled-emails] Cancelled ${scheduled.email_type} for order ${scheduled.order_id} - payment already confirmed`);
            cancelled++;
            processed++;
            continue;
          }
        }

        // Send the email
        const payload = scheduled.email_payload;
        const { error: sendError } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            store_id: scheduled.store_id,
            order_id: scheduled.order_id,
            email_type: scheduled.email_type,
            recipient_email: scheduled.recipient_email,
            recipient_name: scheduled.recipient_name,
            order_data: payload.order_data,
            payment_data: payload.payment_data,
          },
        });

        if (sendError) {
          console.error(`[process-scheduled-emails] Send error for ${scheduled.id}:`, sendError);
          // Don't mark as failed yet, let it retry next cycle
          continue;
        }

        // Mark as sent
        await supabase
          .from("scheduled_emails")
          .update({
            status: "sent",
            processed_at: new Date().toISOString(),
          })
          .eq("id", scheduled.id);

        console.log(`[process-scheduled-emails] Sent ${scheduled.email_type} to ${scheduled.recipient_email}`);
        sent++;
        processed++;
      } catch (err) {
        console.error(`[process-scheduled-emails] Error processing ${scheduled.id}:`, err);
      }
    }

    console.log(`[process-scheduled-emails] Done: ${sent} sent, ${cancelled} cancelled, ${processed} total`);

    return new Response(
      JSON.stringify({ processed, sent, cancelled }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[process-scheduled-emails] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
