// Customer notifications with store-isolated JWT auth.
// Actions: list | mark_read | mark_all_read
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, verifyCustomerToken } from "../_shared/customerAuth.ts";

interface Body {
  action: "list" | "mark_read" | "mark_all_read";
  notification_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const claims = await verifyCustomerToken(authHeader.replace("Bearer ", ""));
    if (!claims) return json({ error: "Invalid token" }, 401);

    const body = (await req.json()) as Body;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { customer_id, store_id } = claims;

    // Defense-in-depth: confirm customer belongs to the store in the JWT.
    const { data: ownerCheck } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customer_id)
      .eq("store_id", store_id)
      .maybeSingle();
    if (!ownerCheck) return json({ error: "Forbidden" }, 403);

    if (body.action === "list") {
      const { data, error } = await supabase
        .from("customer_notifications")
        .select("*")
        .eq("customer_id", customer_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ notifications: data || [] });
    }

    if (body.action === "mark_read") {
      if (!body.notification_id) return json({ error: "notification_id required" }, 400);
      const { error } = await supabase
        .from("customer_notifications")
        .update({ is_read: true })
        .eq("id", body.notification_id)
        .eq("customer_id", customer_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "mark_all_read") {
      const { error } = await supabase
        .from("customer_notifications")
        .update({ is_read: true })
        .eq("customer_id", customer_id)
        .eq("is_read", false);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[customer-notifications]", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
