// Customer saved payment methods CRUD with store-isolated JWT auth.
// Actions: list | create | update | delete | set_default
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, verifyCustomerToken } from "../_shared/customerAuth.ts";

interface Body {
  action: "list" | "create" | "update" | "delete" | "set_default";
  id?: string;
  card_brand?: string;
  card_last4?: string;
  holder_name?: string;
  expiry_month?: string;
  expiry_year?: string;
  is_default?: boolean;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateCard(b: Body): string | null {
  if (!b.card_brand || b.card_brand.length < 1) return "Bandeira é obrigatória";
  if (!b.card_last4 || !/^\d{4}$/.test(b.card_last4)) return "Últimos 4 dígitos inválidos";
  if (!b.holder_name || b.holder_name.trim().length < 1 || b.holder_name.length > 100) return "Nome do titular inválido";
  if (!b.expiry_month || !/^\d{2}$/.test(b.expiry_month)) return "Mês inválido";
  if (!b.expiry_year || !/^\d{2}$/.test(b.expiry_year)) return "Ano inválido";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const claims = await verifyCustomerToken(token);
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
        .from("payment_methods")
        .select("id, card_brand, card_last4, holder_name, expiry_month, expiry_year, is_default, created_at")
        .eq("customer_id", customer_id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ items: data || [] });
    }

    if (body.action === "create") {
      const err = validateCard(body);
      if (err) return json({ error: err }, 400);

      if (body.is_default) {
        await supabase.from("payment_methods").update({ is_default: false }).eq("customer_id", customer_id);
      }
      const { data, error } = await supabase
        .from("payment_methods")
        .insert({
          customer_id,
          card_brand: body.card_brand!,
          card_last4: body.card_last4!,
          holder_name: body.holder_name!,
          expiry_month: body.expiry_month!,
          expiry_year: body.expiry_year!,
          is_default: !!body.is_default,
        })
        .select()
        .single();
      if (error) throw error;
      return json({ item: data });
    }

    if (body.action === "update") {
      if (!body.id) return json({ error: "id é obrigatório" }, 400);
      const err = validateCard(body);
      if (err) return json({ error: err }, 400);

      // Ensure ownership
      const { data: existing } = await supabase
        .from("payment_methods")
        .select("id")
        .eq("id", body.id)
        .eq("customer_id", customer_id)
        .maybeSingle();
      if (!existing) return json({ error: "Cartão não encontrado" }, 404);

      if (body.is_default) {
        await supabase
          .from("payment_methods")
          .update({ is_default: false })
          .eq("customer_id", customer_id)
          .neq("id", body.id);
      }
      const { data, error } = await supabase
        .from("payment_methods")
        .update({
          card_brand: body.card_brand!,
          card_last4: body.card_last4!,
          holder_name: body.holder_name!,
          expiry_month: body.expiry_month!,
          expiry_year: body.expiry_year!,
          is_default: !!body.is_default,
        })
        .eq("id", body.id)
        .select()
        .single();
      if (error) throw error;
      return json({ item: data });
    }

    if (body.action === "delete") {
      if (!body.id) return json({ error: "id é obrigatório" }, 400);
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", body.id)
        .eq("customer_id", customer_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "set_default") {
      if (!body.id) return json({ error: "id é obrigatório" }, 400);
      await supabase
        .from("payment_methods")
        .update({ is_default: false })
        .eq("customer_id", customer_id);
      const { error } = await supabase
        .from("payment_methods")
        .update({ is_default: true })
        .eq("id", body.id)
        .eq("customer_id", customer_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[customer-payment-methods] error:", e);
    return json({ error: (e as Error).message || "Erro interno" }, 500);
  }
});
