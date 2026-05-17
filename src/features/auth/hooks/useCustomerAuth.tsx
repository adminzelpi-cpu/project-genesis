/**
 * useCustomerAuth — Store-isolated customer authentication
 *
 * Replaces supabase.auth for storefront customers. Each store has totally
 * independent customer accounts (same email can exist in different stores
 * with no link between them).
 *
 * Token storage is namespaced via storeKey() so different stores on the
 * same browser don't share sessions.
 *
 * IMPORTANT: During the migration period (etapa 3b), this coexists with
 * supabase.auth. The portal pages still read supabase.auth temporarily.
 * Etapa 3c migrates the portal hooks to read this token instead.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { storeKey } from "@/lib/storeStorageKeys";
import { purgeLegacyCustomerAuthOnce } from "../lib/purgeLegacyCustomerAuth";

const TOKEN_KEY = "customer_auth_token";
const CUSTOMER_KEY = "customer_auth_data";

export type CustomerSessionScope = "full" | "guest_post_checkout";

export interface CustomerSession {
  customer_id: string;
  store_id: string;
  email: string;
  nome: string;
  platform_user_id?: string;
  /** Defaults to "full" for legacy sessions saved before scope existed. */
  scope?: CustomerSessionScope;
  /** Only meaningful when scope === "guest_post_checkout". */
  order_ids?: string[];
}

interface CustomerAuthContextValue {
  customer: CustomerSession | null;
  token: string | null;
  loading: boolean;
  /** True when a customer JWT is present (does not check supabase.auth). */
  isAuthenticated: boolean;
  /** True only when the session has full scope (password / magic link). */
  isFullyAuthenticated: boolean;
  /** True for the temporary 24h session issued right after checkout. */
  isGuestSession: boolean;
  signup: (params: { storeId: string; email: string; password: string; nome: string; telefone?: string; cpf?: string }) => Promise<{ error?: string }>;
  login: (params: { storeId: string; email: string; password: string }) => Promise<{ error?: string; needsPasswordSetup?: boolean }>;
  logout: () => Promise<void>;
  requestPasswordReset: (params: { storeId: string; email: string; resetUrlBase: string }) => Promise<{ error?: string }>;
  confirmPasswordReset: (params: { storeId: string; token: string; newPassword: string }) => Promise<{ error?: string }>;
  /** Sends a passwordless login link to the email. Always succeeds (no enumeration). */
  requestMagicLink: (params: { storeId: string; email: string; verifyUrlBase: string }) => Promise<{ error?: string }>;
  /** Validates a magic link token and logs the user in with full scope. */
  verifyMagicLink: (params: { storeId: string; token: string }) => Promise<{ error?: string }>;
  /** Persist a token + session minted by another flow (e.g. post-checkout guest session). */
  setSession: (token: string, session: CustomerSession) => void;
  refresh: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);

/**
 * Storage strategy:
 *  - "full" sessions (password / magic link) → localStorage (persists across tabs and restarts).
 *  - "guest_post_checkout" sessions → sessionStorage (dies with the tab; if the customer
 *    comes back tomorrow they must log in with a password).
 * We always READ from both and WRITE to the one matching the current scope.
 */
function storageFor(scope: CustomerSessionScope | undefined): Storage {
  return scope === "guest_post_checkout" ? sessionStorage : localStorage;
}

function readStoredSession(): { token: string | null; customer: CustomerSession | null } {
  if (typeof window === "undefined") return { token: null, customer: null };
  try {
    // Prefer sessionStorage (guest, more transient) so a stale localStorage entry
    // never overrides a fresh in-tab session. Fall back to localStorage for full sessions.
    const sessionToken = sessionStorage.getItem(storeKey(TOKEN_KEY));
    const sessionRaw = sessionStorage.getItem(storeKey(CUSTOMER_KEY));
    if (sessionToken && sessionRaw) {
      return { token: sessionToken, customer: JSON.parse(sessionRaw) as CustomerSession };
    }
    const token = localStorage.getItem(storeKey(TOKEN_KEY));
    const raw = localStorage.getItem(storeKey(CUSTOMER_KEY));
    const customer = raw ? (JSON.parse(raw) as CustomerSession) : null;
    return { token, customer };
  } catch {
    return { token: null, customer: null };
  }
}

function persistSession(token: string, customer: CustomerSession) {
  // Always clear from both stores first to avoid two parallel sessions.
  sessionStorage.removeItem(storeKey(TOKEN_KEY));
  sessionStorage.removeItem(storeKey(CUSTOMER_KEY));
  localStorage.removeItem(storeKey(TOKEN_KEY));
  localStorage.removeItem(storeKey(CUSTOMER_KEY));
  const target = storageFor(customer.scope);
  target.setItem(storeKey(TOKEN_KEY), token);
  target.setItem(storeKey(CUSTOMER_KEY), JSON.stringify(customer));
}

function clearSession() {
  localStorage.removeItem(storeKey(TOKEN_KEY));
  localStorage.removeItem(storeKey(CUSTOMER_KEY));
  sessionStorage.removeItem(storeKey(TOKEN_KEY));
  sessionStorage.removeItem(storeKey(CUSTOMER_KEY));
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from storage on mount and verify the token is still valid.
  // Also purge any stale legacy supabase.auth session (one-time, safe).
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      // One-time legacy cleanup. Runs in parallel with hydrate; never blocks.
      void purgeLegacyCustomerAuthOnce();
      const { token: storedToken, customer: storedCustomer } = readStoredSession();
      if (!storedToken || !storedCustomer) {
        if (!cancelled) setLoading(false);
        return;
      }
      // Optimistically set so the UI doesn't flash logged-out
      if (!cancelled) {
        setToken(storedToken);
        setCustomer(storedCustomer);
      }
      // Verify against backend (cheap call, validates JWT signature + store match)
      try {
        const { data, error } = await supabase.functions.invoke("customer-verify-token", {
          body: { token: storedToken, store_id: storedCustomer.store_id },
        });
        if (cancelled) return;
        if (error || !data?.valid) {
          clearSession();
          setToken(null);
          setCustomer(null);
        }
      } catch {
        // Network failure: keep optimistic session, retry on next interaction
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    hydrate();
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    const { token: storedToken, customer: storedCustomer } = readStoredSession();
    setToken(storedToken);
    setCustomer(storedCustomer);
  }, []);

  const signup = useCallback<CustomerAuthContextValue["signup"]>(async ({ storeId, email, password, nome, telefone, cpf }) => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-signup", {
        body: { store_id: storeId, email, password, nome, telefone, cpf },
      });
      if (error) {
        const msg = (error as { context?: { error?: string } })?.context?.error || error.message || "Erro ao criar conta";
        return { error: msg };
      }
      if (!data?.success || !data?.token) {
        return { error: data?.error || "Erro ao criar conta" };
      }
      const session: CustomerSession = {
        customer_id: data.customer.id,
        store_id: storeId,
        email: data.customer.email,
        nome: data.customer.nome,
      };
      persistSession(data.token, session);
      setToken(data.token);
      setCustomer(session);
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Erro ao criar conta" };
    }
  }, []);

  const login = useCallback<CustomerAuthContextValue["login"]>(async ({ storeId, email, password }) => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-login", {
        body: { store_id: storeId, email, password },
      });
      if (error) {
        // Edge function returns 403 with needs_password_setup for legacy migration
        const errCtx = (error as { context?: { needs_password_setup?: boolean; error?: string; message?: string } })?.context;
        if (errCtx?.needs_password_setup) {
          return { needsPasswordSetup: true, error: errCtx.message || "Defina sua senha" };
        }
        return { error: errCtx?.error || error.message || "Email ou senha incorretos" };
      }
      if (!data?.success || !data?.token) {
        if (data?.needs_password_setup) {
          return { needsPasswordSetup: true, error: data?.message };
        }
        return { error: data?.error || "Email ou senha incorretos" };
      }
      const session: CustomerSession = {
        customer_id: data.customer.id,
        store_id: storeId,
        email: data.customer.email,
        nome: data.customer.nome,
      };
      persistSession(data.token, session);
      setToken(data.token);
      setCustomer(session);
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Erro ao entrar" };
    }
  }, []);

  const logout = useCallback(async () => {
    clearSession();
    setToken(null);
    setCustomer(null);
  }, []);

  const requestPasswordReset = useCallback<CustomerAuthContextValue["requestPasswordReset"]>(async ({ storeId, email, resetUrlBase }) => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-password-reset-request", {
        body: { store_id: storeId, email, reset_url_base: resetUrlBase },
      });
      if (error) {
        const msg = (error as { context?: { error?: string } })?.context?.error || error.message;
        return { error: msg };
      }
      if (data?.error) return { error: data.error };
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Erro ao enviar email" };
    }
  }, []);

  const confirmPasswordReset = useCallback<CustomerAuthContextValue["confirmPasswordReset"]>(async ({ storeId, token: resetToken, newPassword }) => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-password-reset-confirm", {
        body: { store_id: storeId, token: resetToken, new_password: newPassword },
      });
      if (error) {
        const msg = (error as { context?: { error?: string } })?.context?.error || error.message;
        return { error: msg };
      }
      if (!data?.success) return { error: data?.error || "Erro ao redefinir senha" };
      // The endpoint returns a fresh session token — log the user in immediately
      if (data.token && data.customer) {
        const session: CustomerSession = {
          customer_id: data.customer.id,
          store_id: data.customer.store_id,
          email: data.customer.email,
          nome: data.customer.nome,
        };
        persistSession(data.token, session);
        setToken(data.token);
        setCustomer(session);
      }
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Erro ao redefinir senha" };
    }
  }, []);

  const setSession = useCallback((newToken: string, session: CustomerSession) => {
    persistSession(newToken, session);
    setToken(newToken);
    setCustomer(session);
  }, []);

  const requestMagicLink = useCallback<CustomerAuthContextValue["requestMagicLink"]>(async ({ storeId, email, verifyUrlBase }) => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-magic-link-request", {
        body: { store_id: storeId, email, verify_url_base: verifyUrlBase },
      });
      if (error) {
        const msg = (error as { context?: { error?: string } })?.context?.error || error.message;
        return { error: msg };
      }
      if (data?.error) return { error: data.error };
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Erro ao enviar link" };
    }
  }, []);

  const verifyMagicLink = useCallback<CustomerAuthContextValue["verifyMagicLink"]>(async ({ storeId, token: magicToken }) => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-magic-link-verify", {
        body: { store_id: storeId, token: magicToken },
      });
      if (error) {
        const msg = (error as { context?: { error?: string } })?.context?.error || error.message;
        return { error: msg };
      }
      if (!data?.success) return { error: data?.error || "Link inválido ou expirado" };
      if (data.token && data.customer) {
        const session: CustomerSession = {
          customer_id: data.customer.id,
          store_id: data.customer.store_id,
          email: data.customer.email,
          nome: data.customer.nome,
          scope: "full",
        };
        persistSession(data.token, session);
        setToken(data.token);
        setCustomer(session);
      }
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Erro ao validar link" };
    }
  }, []);

  const value = useMemo<CustomerAuthContextValue>(() => {
    const scope = customer?.scope ?? "full";
    return {
      customer,
      token,
      loading,
      isAuthenticated: !!token && !!customer,
      isFullyAuthenticated: !!token && !!customer && scope === "full",
      isGuestSession: !!token && !!customer && scope === "guest_post_checkout",
      signup,
      login,
      logout,
      requestPasswordReset,
      confirmPasswordReset,
      requestMagicLink,
      verifyMagicLink,
      setSession,
      refresh,
    };
  }, [customer, token, loading, signup, login, logout, requestPasswordReset, confirmPasswordReset, requestMagicLink, verifyMagicLink, setSession, refresh]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used inside <CustomerAuthProvider>");
  }
  return ctx;
}

/**
 * Reads the customer JWT without React context.
 * Checks sessionStorage first (guest sessions, more transient) then localStorage (full).
 */
export function getStoredCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(storeKey(TOKEN_KEY)) ||
    localStorage.getItem(storeKey(TOKEN_KEY))
  );
}

export function getStoredCustomerSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(storeKey(CUSTOMER_KEY)) ||
      localStorage.getItem(storeKey(CUSTOMER_KEY));
    return raw ? (JSON.parse(raw) as CustomerSession) : null;
  } catch {
    return null;
  }
}

/**
 * Persists a session token + data without going through React context.
 * Guest sessions go to sessionStorage; full sessions go to localStorage.
 */
export function persistCustomerSessionToStorage(token: string, session: CustomerSession): void {
  if (typeof window === "undefined") return;
  // Clear both first to avoid duplicate sessions across storages.
  sessionStorage.removeItem(storeKey(TOKEN_KEY));
  sessionStorage.removeItem(storeKey(CUSTOMER_KEY));
  localStorage.removeItem(storeKey(TOKEN_KEY));
  localStorage.removeItem(storeKey(CUSTOMER_KEY));
  const target = session.scope === "guest_post_checkout" ? sessionStorage : localStorage;
  target.setItem(storeKey(TOKEN_KEY), token);
  target.setItem(storeKey(CUSTOMER_KEY), JSON.stringify(session));
}
