import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckAuthStatusRequest {
  email: string;
  store_id: string;
}

// Minimal response - no IDs leaked
interface AuthStatusResponse {
  exists: boolean;
  has_password: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, store_id }: CheckAuthStatusRequest = await req.json();

    if (!email || !store_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Only check customer table for this specific store - no listUsers()
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, password_hash, needs_password_setup")
      .eq("store_id", store_id)
      .eq("email", email)
      .maybeSingle();

    if (!customer) {
      // Don't reveal whether email exists in auth system
      return new Response(
        JSON.stringify({ exists: false, has_password: false } as AuthStatusResponse),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Customer has a password set if password_hash exists and they don't need setup
    const hasPassword = !!customer.password_hash && !customer.needs_password_setup;

    return new Response(
      JSON.stringify({ exists: true, has_password: hasPassword } as AuthStatusResponse),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in check-customer-auth-status:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
