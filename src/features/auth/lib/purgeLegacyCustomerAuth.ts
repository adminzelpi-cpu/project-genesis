/**
 * One-time forced logout of legacy storefront customers that were authenticated
 * via supabase.auth before the migration to the store-isolated custom JWT.
 *
 * Why this exists:
 *   The storefront customer auth was migrated from the global supabase.auth
 *   (which leaks across stores on the same browser) to a store-scoped custom
 *   JWT. After the migration, any user that still had a stale supabase.auth
 *   session would be considered "logged in by accident" — but with no actual
 *   tie to a customer in the current store. We sign them out exactly once so
 *   they re-authenticate via the new flow.
 *
 * Behavior:
 *   - Runs only in the browser.
 *   - Uses a localStorage flag so it only fires once per browser ever.
 *   - Best-effort: any failure is swallowed (we never want this to break the
 *     storefront load for any reason).
 *   - Intentionally does NOT touch the merchant dashboard auth — merchants
 *     keep using supabase.auth normally. Call this only from storefront roots.
 */
import { supabase } from "@/integrations/supabase/client";

const PURGE_FLAG = "lovable_legacy_customer_auth_purged_v1";

export async function purgeLegacyCustomerAuthOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(PURGE_FLAG) === "true") return;

    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore — we still mark as purged to avoid a loop */
      }
    }
    localStorage.setItem(PURGE_FLAG, "true");
  } catch {
    /* never block the app on this */
  }
}
