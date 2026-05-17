// Ensure the authenticated user has the 'merchant' role and profile exists
// Uses service role key to bypass RLS safely
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Create client with user's JWT to get the authenticated user
    const supabaseUser = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    // Get the authenticated user from the provided JWT
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("User auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Processing user:", user.id, user.email);

    // Step 1: Ensure profile exists (using admin client to bypass RLS)
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error("Profile check error:", profileCheckError);
      return new Response(JSON.stringify({ error: profileCheckError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!existingProfile) {
      console.log("Creating profile for user:", user.id);
      const { error: profileInsertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
        });

      if (profileInsertError) {
        console.error("Profile insert error:", profileInsertError);
        return new Response(JSON.stringify({ error: profileInsertError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Profile created successfully");
    } else {
      console.log("Profile already exists");
    }

    // Step 2: Check if the user already has the merchant role
    const { data: existingRole, error: selectError } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "merchant")
      .maybeSingle();

    if (selectError) {
      console.error("Role check error:", selectError);
      return new Response(JSON.stringify({ error: selectError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!existingRole) {
      console.log("Creating merchant role for user:", user.id);
      const { error: insertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: user.id, role: "merchant" });

      if (insertError) {
        console.error("Role insert error:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Merchant role created successfully");
    } else {
      console.log("Merchant role already exists");
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
