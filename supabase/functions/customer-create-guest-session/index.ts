// Issues a short-lived "guest_post_checkout" JWT after a successful order.
// The customer leaves the checkout already logged in (24h scope) and can
// view the order they just placed, navigate the store, and see "Meus pedidos"
// limited to that order. Cannot access sensitive areas (addresses, profile,
// older orders) — those require a full-scope login (password / magic link).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders, signCustomerToken } from "../_shared/customerAuth.ts";

interface Body {
  store_id: string;
  customer_id: string;
  order_id: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { store_id, customer_id, order_id }: Body = await req.json();
    if (!store_id || !customer_id || !order_id) {
      return json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the order actually belongs to this customer + store.
    // This is the only authorization gate — no JWT required, but we won't
    // mint a token unless the (store_id, customer_id, order_id) tuple matches.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, store_id, customer_id")
      .eq("id", order_id)
      .eq("store_id", store_id)
      .eq("customer_id", customer_id)
      .maybeSingle();

    if (orderError || !order) {
      console.warn("[customer-create-guest-session] order/customer mismatch", {
        store_id, customer_id, order_id, error: orderError?.message,
      });
      return json({ error: "Order not found for this customer" }, 404);
    }

    const { data: customer } = await supabase
      .from("customers")
      .select("id, email, nome, platform_user_id")
      .eq("id", customer_id)
      .eq("store_id", store_id)
      .maybeSingle();

    if (!customer) return json({ error: "Customer not found" }, 404);

    const token = await signCustomerToken({
      customer_id: customer.id,
      store_id,
      email: customer.email ?? "",
      platform_user_id: customer.platform_user_id ?? "",
      scope: "guest_post_checkout",
      order_ids: [order_id],
    });

    return json({
      success: true,
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        nome: customer.nome,
      },
      scope: "guest_post_checkout",
      order_ids: [order_id],
    });
  } catch (e) {
    console.error("[customer-create-guest-session] error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
