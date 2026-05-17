import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
]);

serve(async (req) => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("t");
  const action = url.searchParams.get("a"); // 'o' for open, 'c' for click
  const redirectUrl = url.searchParams.get("r"); // redirect URL for clicks

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!trackingId) {
    console.log("[email-tracking] No tracking ID provided");
    if (action === "o") {
      return new Response(TRACKING_PIXEL, {
        headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
      });
    }
    return new Response("Missing tracking ID", { status: 400 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    if (action === "o") {
      // Track email open
      console.log(`[email-tracking] Recording open for tracking_id: ${trackingId}`);
      
      const { error } = await supabase
        .from("email_logs")
        .update({ opened_at: now })
        .eq("tracking_id", trackingId)
        .is("opened_at", null); // Only update if not already opened

      if (error) {
        console.error("[email-tracking] Error updating opened_at:", error);
      } else {
        console.log(`[email-tracking] Successfully recorded open for ${trackingId}`);
      }

      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        headers: { 
          "Content-Type": "image/gif", 
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
      });
    } else if (action === "c" && redirectUrl) {
      // Track email click
      console.log(`[email-tracking] Recording click for tracking_id: ${trackingId}`);
      
      const { error } = await supabase
        .from("email_logs")
        .update({ clicked_at: now })
        .eq("tracking_id", trackingId)
        .is("clicked_at", null); // Only update if not already clicked

      if (error) {
        console.error("[email-tracking] Error updating clicked_at:", error);
      } else {
        console.log(`[email-tracking] Successfully recorded click for ${trackingId}`);
      }

      // Redirect to the actual URL
      const decodedUrl = decodeURIComponent(redirectUrl);
      return new Response(null, {
        status: 302,
        headers: { 
          "Location": decodedUrl,
          ...corsHeaders
        },
      });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("[email-tracking] Error:", error);
    
    // Always return something valid for opens/clicks
    if (action === "o") {
      return new Response(TRACKING_PIXEL, {
        headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
      });
    }
    
    return new Response("Internal error", { status: 500 });
  }
});
