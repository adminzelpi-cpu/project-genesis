/**
 * Helper to invoke customer-portal edge functions with the store-isolated
 * customer JWT. Use this in hooks that previously read supabase.auth.getUser().
 *
 * If no customer JWT exists in localStorage (because the user is in the legacy
 * supabase.auth flow), it returns null — callers should handle that gracefully
 * (typically by falling back to the old direct-table query).
 */
import { supabase } from "@/integrations/supabase/client";
import { getStoredCustomerToken } from "@/features/auth";

export interface CustomerApiOptions<TBody = unknown> {
  body?: TBody;
}

export async function invokeCustomerFn<TResponse = unknown, TBody = unknown>(
  fnName: string,
  options: CustomerApiOptions<TBody> = {}
): Promise<TResponse> {
  const token = getStoredCustomerToken();
  if (!token) {
    throw new Error("CUSTOMER_TOKEN_MISSING");
  }
  const { data, error } = await supabase.functions.invoke<TResponse>(fnName, {
    body: options.body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    const ctxErr = (error as { context?: { error?: string } })?.context?.error;
    throw new Error(ctxErr || error.message || "Erro ao invocar função");
  }
  return data as TResponse;
}

/** True when the user is logged in via the new custom auth (vs legacy). */
export function hasCustomerToken(): boolean {
  return !!getStoredCustomerToken();
}
