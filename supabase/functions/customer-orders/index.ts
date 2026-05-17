// Customer orders read-only listing with store-isolated JWT auth.
// Actions: list
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, verifyCustomerToken } from "../_shared/customerAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const claims = await verifyCustomerToken(authHeader.replace("Bearer ", ""));
    if (!claims) return json({ error: "Invalid token" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { customer_id, store_id, scope, order_ids } = claims;

    let query = supabase
      .from("orders")
      .select(`*, store:stores(slug, name, order_prefix)`)
      .eq("customer_id", customer_id)
      .eq("store_id", store_id)
      .order("created_at", { ascending: false });

    // Guest sessions can only see the orders explicitly granted by the token.
    // Tokens without a scope are legacy/full and see everything (back-compat).
    if (scope === "guest_post_checkout") {
      const allowed = Array.isArray(order_ids) ? order_ids : [];
      if (allowed.length === 0) return json({ orders: [], scope });
      query = query.in("id", allowed);
    }

    const { data, error } = await query;
    if (error) throw error;

    return json({ orders: data || [], scope: scope ?? "full" });
  } catch (e) {
    console.error("[customer-orders]", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
