/**
 * customer-magic-link-request
 *
 * Sends a one-time login link to the customer's email.
 *
 * Security:
 *  - Always returns success (no email enumeration).
 *  - Tokens are stored as SHA-256 hashes — the raw token only exists in the
 *    user's email and the URL they click. A DB leak would not expose usable
 *    tokens.
 *  - Rate-limited per (store_id + email) to prevent spam / Resend cost abuse.
 *  - 30 minute TTL.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  corsHeaders,
  generateSecureToken,
  validateEmail,
} from "../_shared/customerAuth.ts";

interface RequestBody {
  store_id: string;
  email: string;
  verify_url_base: string;
}

const TOKEN_TTL_MINUTES = 30;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3; // 3 magic links per 15 min per email+store

// In-memory rate limiter (per edge instance — best-effort, sufficient to
// stop accidental loops and obvious abuse without external infra).
const rateMap = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const arr = (rateMap.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateMap.set(key, arr);
    return false;
  }
  arr.push(now);
  rateMap.set(key, arr);
  return true;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    const { store_id, email, verify_url_base }: RequestBody = await req.json();

    if (!store_id || !email || !verify_url_base) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generic success response (avoid enumeration)
    const successResp = new Response(
      JSON.stringify({
        success: true,
        message: "Se houver uma conta com este email, enviaremos o link de acesso.",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

    // Rate limit (silent — still returns success to avoid leaking existence)
    const rateKey = `${store_id}:${normalizedEmail}`;
    if (!checkRateLimit(rateKey)) {
      console.log(`[magic-link-request] rate-limited ${rateKey}`);
      return successResp;
    }

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, nome, email")
      .eq("store_id", store_id)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!customer) {
      console.log(`[magic-link-request] no customer ${normalizedEmail} in ${store_id}`);
      return successResp;
    }

    // Generate raw token (sent in email) and store its SHA-256 hash.
    const rawToken = generateSecureToken();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

    await supabaseAdmin
      .from("customers")
      .update({
        magic_link_token: tokenHash,
        magic_link_token_expires_at: expiresAt,
      })
      .eq("id", customer.id);

    const verifyLink = `${verify_url_base}?token=${encodeURIComponent(rawToken)}`;

    try {
      await supabaseAdmin.functions.invoke("send-magic-link-email", {
        body: {
          store_id,
          email: customer.email,
          recipient_name: customer.nome,
          magic_link: verifyLink,
          expires_in_minutes: TOKEN_TTL_MINUTES,
        },
      });
    } catch (emailErr) {
      console.error("[magic-link-request] email send error:", emailErr);
    }

    return successResp;
  } catch (error: unknown) {
    console.error("[customer-magic-link-request] error:", error);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
