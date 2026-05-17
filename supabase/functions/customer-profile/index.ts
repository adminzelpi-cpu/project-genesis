// Customer profile read/update with store-isolated JWT auth.
// Actions: get | update | change_password
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, verifyCustomerToken, hashPassword, verifyPassword, validatePassword } from "../_shared/customerAuth.ts";

interface Body {
  action: "get" | "update" | "change_password";
  nome?: string;
  telefone?: string;
  cpf?: string;
  data_nascimento?: string;
  current_password?: string;
  new_password?: string;
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
    const { customer_id } = claims;

    if (body.action === "get") {
      const { data, error } = await supabase
        .from("customers")
        .select("id, nome, email, telefone, cpf, data_nascimento, store_id, created_at")
        .eq("id", customer_id)
        .single();
      if (error) throw error;
      return json({ profile: data });
    }

    if (body.action === "update") {
      const updates: Record<string, unknown> = {};
      if (body.nome !== undefined) updates.nome = body.nome;
      if (body.telefone !== undefined) updates.telefone = body.telefone;
      if (body.cpf !== undefined) updates.cpf = body.cpf;
      if (body.data_nascimento !== undefined) updates.data_nascimento = body.data_nascimento;
      if (Object.keys(updates).length === 0) return json({ success: true });
      const { error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", customer_id);
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === "change_password") {
      if (!body.current_password || !body.new_password) {
        return json({ error: "Senha atual e nova senha são obrigatórias" }, 400);
      }
      const v = validatePassword(body.new_password);
      if (!v.valid) return json({ error: v.error }, 400);

      const { data: customer } = await supabase
        .from("customers")
        .select("password_hash")
        .eq("id", customer_id)
        .single();
      if (!customer?.password_hash) return json({ error: "Senha não definida" }, 400);

      const ok = await verifyPassword(body.current_password, customer.password_hash);
      if (!ok) return json({ error: "Senha atual incorreta" }, 401);

      const newHash = await hashPassword(body.new_password);
      const { error } = await supabase
        .from("customers")
        .update({ password_hash: newHash, needs_password_setup: false })
        .eq("id", customer_id);
      if (error) throw error;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[customer-profile]", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
