import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  product_id: string;
  variation_id?: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  variation?: string;
}

interface SaveAbandonedCartParams {
  store_id: string;
  customer_email: string;
  customer_name?: string;
  customer_id?: string;
  customer_phone?: string;
  cart_items: CartItem[];
  cart_total: number;
}

export async function saveAbandonedCart(params: SaveAbandonedCartParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("save_abandoned_cart", {
      p_store_id: params.store_id,
      p_customer_email: params.customer_email,
      p_customer_name: params.customer_name || null,
      p_customer_id: params.customer_id || null,
      p_cart_items: params.cart_items as any,
      p_cart_total: params.cart_total,
      p_customer_phone: params.customer_phone || null,
    });

    if (error) {
      console.error("[saveAbandonedCart] RPC error:", error);
      return null;
    }

    console.log("[saveAbandonedCart] Cart saved with id:", data);
    return data as string;
  } catch (error) {
    console.error("[saveAbandonedCart] Error:", error);
    return null;
  }
}

export async function markCartAsRecovered(
  storeId: string, 
  customerEmail: string, 
  orderId: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc("mark_cart_recovered", {
      p_store_id: storeId,
      p_customer_email: customerEmail,
      p_order_id: orderId,
    });

    if (error) {
      console.error("[markCartAsRecovered] RPC error:", error);
    } else {
      console.log("[markCartAsRecovered] Cart marked as recovered for:", customerEmail);
    }
  } catch (error) {
    console.error("[markCartAsRecovered] Error:", error);
  }
}

export interface RecoveredCartData {
  cart_items: CartItem[];
  customer_email: string;
  customer_name: string | null;
  customer_id: string | null;
  abandoned_at: string;
}

export async function recoverCartByToken(token: string): Promise<RecoveredCartData | null> {
  try {
    // Add a timeout to prevent hanging on slow networks
    const timeoutMs = 12000;

    const queryPromise = supabase
      .from("abandoned_carts")
      .select("cart_items, customer_email, customer_name, customer_id, abandoned_at")
      .eq("recovery_token", token)
      .is("recovered_at", null)
      .maybeSingle();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) {
      console.error("[recoverCartByToken] Query error:", error.message);
      return null;
    }
    
    if (!data) {
      return null;
    }

    return {
      cart_items: data.cart_items as unknown as CartItem[],
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_id: data.customer_id,
      abandoned_at: data.abandoned_at,
    };
  } catch (error: any) {
    if (error?.message === "TIMEOUT") {
      console.error("[recoverCartByToken] Request timed out after 12s");
    } else {
      console.error("[recoverCartByToken] Error:", error);
    }
    return null;
  }
}
