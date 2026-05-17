// Customer favorites CRUD with store-isolated JWT auth.
// Actions: list | add | remove
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, verifyCustomerToken } from "../_shared/customerAuth.ts";

interface Body {
  action: "list" | "add" | "remove";
  product_id?: string;
  color_value_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const claims = await verifyCustomerToken(token);
    if (!claims) return json({ error: "Invalid token" }, 401);

    const body = (await req.json()) as Body;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { customer_id, store_id, platform_user_id } = claims;

    if (body.action === "list") {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          id, product_id, color_value_id, created_at,
          products:product_id (
            id, name, slug, price, sale_price, images, stock_quantity, is_active, store_id,
            stores:store_id ( slug )
          )
        `)
        .eq("customer_id", customer_id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Filter to current store only (defense in depth)
      const filtered = (data || []).filter((f: any) => f.products?.store_id === store_id);

      // Enrich with variation images/prices when color_value_id is set
      const productIds = [...new Set(filtered.map((f: any) => f.product_id))];
      const byProduct: Record<string, any[]> = {};
      if (productIds.length > 0) {
        const { data: variations } = await supabase
          .from("product_variations_v2")
          .select("id, product_id, images, attributes, price, sale_price, stock_quantity")
          .in("product_id", productIds)
          .eq("is_active", true);
        (variations || []).forEach((v: any) => {
          (byProduct[v.product_id] ||= []).push(v);
        });
      }

      const items = filtered.map((item: any) => {
        const product = { ...item.products, store: item.products?.stores };
        const variations = byProduct[item.product_id] || [];
        if (item.color_value_id && variations.length > 0) {
          const matched = variations.find((v: any) => Object.values(v.attributes || {}).includes(item.color_value_id));
          if (matched) {
            if (matched.images?.length) product.images = matched.images;
            if (matched.price) product.price = matched.price;
            if (matched.sale_price !== undefined) product.sale_price = matched.sale_price;
            if (matched.stock_quantity !== undefined) product.stock_quantity = matched.stock_quantity;
          }
        } else if (!item.color_value_id && variations.length > 0) {
          const hasNoImages = !product.images || !Array.isArray(product.images) || product.images.length === 0;
          if (hasNoImages) {
            const first = variations.find((v: any) => v.images?.length > 0);
            if (first) product.images = first.images;
          }
          if (!product.price || product.price === 0) {
            const prices = variations.map((v: any) => v.price).filter((p: number) => p > 0);
            if (prices.length > 0) {
              product.price = Math.min(...prices);
              const min = variations.find((v: any) => v.price === product.price);
              if (min) product.sale_price = min.sale_price;
            }
          }
        }
        return {
          id: item.id,
          product_id: item.product_id,
          color_value_id: item.color_value_id,
          created_at: item.created_at,
          product,
        };
      });

      return json({ favorites: items });
    }

    if (body.action === "add") {
      if (!body.product_id) return json({ error: "product_id required" }, 400);
      // Verify product belongs to this store
      const { data: product } = await supabase
        .from("products")
        .select("store_id")
        .eq("id", body.product_id)
        .maybeSingle();
      if (!product || product.store_id !== store_id) {
        return json({ error: "Product not found in this store" }, 404);
      }
      const insertPayload: any = {
        customer_id,
        product_id: body.product_id,
      };
      if (body.color_value_id) insertPayload.color_value_id = body.color_value_id;
      const { error } = await supabase.from("favorites").insert(insertPayload);
      // Ignore duplicates (unique violation)
      if (error && (error as any).code !== "23505") throw error;
      return json({ success: true });
    }

    if (body.action === "remove") {
      if (!body.product_id) return json({ error: "product_id required" }, 400);
      let q = supabase
        .from("favorites")
        .delete()
        .eq("customer_id", customer_id)
        .eq("product_id", body.product_id);
      if (body.color_value_id) q = q.eq("color_value_id", body.color_value_id);
      else q = q.is("color_value_id", null);
      const { error } = await q;
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[customer-favorites]", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
