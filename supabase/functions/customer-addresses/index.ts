// Customer addresses CRUD with store-isolated JWT auth.
// Operates on customer_addresses table.
// Actions: list | create | update | delete | set_default
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, verifyCustomerToken } from "../_shared/customerAuth.ts";

interface AddressInput {
  rua?: string;
  numero?: string;
  complemento?: string | null;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  tipo?: string;
  is_default?: boolean;
}

interface Body extends AddressInput {
  action: "list" | "create" | "update" | "delete" | "set_default";
  address_id?: string;
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

    // Defense-in-depth: ensure the customer in the JWT actually belongs to
    // the store claimed in the JWT. This blocks token reuse across stores
    // even if the signing secret were ever leaked or rotated incorrectly.
    const { data: ownerCheck } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customer_id)
      .eq("store_id", store_id)
      .maybeSingle();
    if (!ownerCheck) return json({ error: "Forbidden" }, 403);

    if (body.action === "list") {
      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", customer_id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ addresses: data || [] });
    }

    if (body.action === "create") {
      const required = ["rua", "numero", "bairro", "cidade", "estado", "cep"] as const;
      for (const k of required) {
        if (!body[k]) return json({ error: `Campo obrigatório: ${k}` }, 400);
      }
      const payload: any = {
        customer_id,
        rua: body.rua,
        numero: body.numero,
        complemento: body.complemento ?? null,
        bairro: body.bairro,
        cidade: body.cidade,
        estado: body.estado,
        cep: body.cep,
        tipo: body.tipo ?? "entrega",
        is_default: body.is_default ?? false,
      };
      const { data, error } = await supabase
        .from("customer_addresses")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return json({ address: data });
    }

    if (body.action === "update") {
      if (!body.address_id) return json({ error: "address_id required" }, 400);
      const updates: Record<string, unknown> = {};
      (["rua", "numero", "complemento", "bairro", "cidade", "estado", "cep", "tipo", "is_default"] as const).forEach((k) => {
        if (body[k] !== undefined) updates[k] = body[k];
      });
      const { error } = await supabase
        .from("customer_addresses")
        .update(updates)
        .eq("id", body.address_id)
        .eq("customer_id", customer_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "delete") {
      if (!body.address_id) return json({ error: "address_id required" }, 400);
      const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", body.address_id)
        .eq("customer_id", customer_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "set_default") {
      if (!body.address_id) return json({ error: "address_id required" }, 400);
      // Trigger enforce_single_default_address handles the rest
      const { error } = await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", body.address_id)
        .eq("customer_id", customer_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[customer-addresses]", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
