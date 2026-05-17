// Shared helpers for custom customer auth (per-store isolation)
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { create, verify, getNumericDate, Header, Payload } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JWT_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "fallback-dev-secret-do-not-use";

let cachedKey: CryptoKey | null = null;
async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const encoder = new TextEncoder();
  cachedKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return cachedKey;
}

/**
 * Scope of a customer session JWT.
 * - "full": logged in via password / magic link. Full access to account.
 * - "guest_post_checkout": auto-issued after checkout. Limited to viewing
 *   the orders listed in `order_ids`. Cannot edit profile / addresses /
 *   see other orders.
 *
 * If `scope` is absent on a token, treat as "full" for backward compat
 * with sessions issued before this field existed.
 */
export type CustomerJWTScope = "full" | "guest_post_checkout";

export interface CustomerJWTPayload extends Payload {
  customer_id: string;
  store_id: string;
  email: string;
  platform_user_id: string;
  scope?: CustomerJWTScope;
  order_ids?: string[];
}

interface SignTokenOptions {
  /** Token lifetime in seconds. Defaults to 30 days for "full", 24h for guest. */
  ttlSeconds?: number;
}

export interface SignCustomerTokenInput {
  customer_id: string;
  store_id: string;
  email: string;
  platform_user_id: string;
  scope?: CustomerJWTScope;
  order_ids?: string[];
}

export async function signCustomerToken(
  payload: SignCustomerTokenInput,
  options: SignTokenOptions = {}
): Promise<string> {
  const key = await getKey();
  const header: Header = { alg: "HS256", typ: "JWT" };
  const isGuest = payload.scope === "guest_post_checkout";
  const ttl = options.ttlSeconds ?? (isGuest ? 60 * 60 * 24 : 60 * 60 * 24 * 30);
  const fullPayload: CustomerJWTPayload = {
    customer_id: payload.customer_id,
    store_id: payload.store_id,
    email: payload.email,
    platform_user_id: payload.platform_user_id,
    scope: payload.scope,
    order_ids: payload.order_ids,
    iat: getNumericDate(0),
    exp: getNumericDate(ttl),
  };
  return await create(header, fullPayload, key);
}

/** Returns the effective scope of a payload (defaults to "full" if absent). */
export function getTokenScope(payload: CustomerJWTPayload): CustomerJWTScope {
  return payload.scope ?? "full";
}

export async function verifyCustomerToken(token: string): Promise<CustomerJWTPayload | null> {
  try {
    const key = await getKey();
    const payload = await verify(token, key) as CustomerJWTPayload;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  // Use sync API — async variant relies on Web Workers which aren't available in Supabase Edge Runtime
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export function generateSecureToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}

export function validateEmail(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "A senha deve ter pelo menos 8 caracteres" };
  }
  if (password.length > 128) {
    return { valid: false, error: "A senha é muito longa" };
  }
  return { valid: true };
}
