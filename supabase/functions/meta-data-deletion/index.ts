import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const signedRequest = params.get("signed_request");

    if (!signedRequest) {
      return new Response(JSON.stringify({ error: "Missing signed_request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [, payload] = signedRequest.split(".");
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const metaUserId = decoded.user_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data } = await supabase
      .from("meta_connections")
      .delete()
      .eq("meta_user_id", metaUserId)
      .select("id");

    const confirmationCode = data?.[0]?.id || crypto.randomUUID();

    return new Response(
      JSON.stringify({
        url: `https://zelpi.com.br/data-deletion?code=${confirmationCode}`,
        confirmation_code: confirmationCode,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Data deletion error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
