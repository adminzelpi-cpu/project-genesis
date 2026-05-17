/**
 * RequireFullAuth — Gate for sensitive customer areas.
 *
 * Behavior:
 *  - Fully authenticated (password) → renders children.
 *  - Guest session (post-checkout, sessionStorage, dies with the tab) →
 *      • If the customer ALREADY has a password defined for this store, asks
 *        for it inline and upgrades the session to "full" on success.
 *      • If the customer does NOT have a password yet, offers to send the
 *        "create password" email (uses the regular password-reset flow that
 *        also doubles as initial setup). Magic link is intentionally not
 *        offered here — the goal is to drive customers to set a real password.
 *  - Not logged in at all → CTA to login.
 *
 * Use this around routes / sections that expose persistent personal data
 * (saved addresses, payment methods, profile editing, etc.) — never around
 * the order list, which the guest session is allowed to see.
 */
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Mail, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useCustomerAuth } from "@/features/auth";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { supabase } from "@/integrations/supabase/client";

interface RequireFullAuthProps {
  children: ReactNode;
  /** Optional override for the section name shown in the message. */
  sectionName?: string;
}

type Mode = "checking" | "ask-password" | "needs-setup" | "email-sent";

export function RequireFullAuth({ children, sectionName = "esta área" }: RequireFullAuthProps) {
  const {
    isFullyAuthenticated,
    isGuestSession,
    customer,
    login,
    requestPasswordReset,
    loading,
  } = useCustomerAuth();
  const { buildPath } = useStorePath();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("checking");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Decide upfront whether this guest already has a password set for the store.
  useEffect(() => {
    let cancelled = false;
    if (loading || !isGuestSession || !customer) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("check-customer-auth-status", {
          body: { email: customer.email, store_id: customer.store_id },
        });
        if (cancelled) return;
        setMode(data?.has_password ? "ask-password" : "needs-setup");
      } catch {
        if (!cancelled) setMode("ask-password");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, isGuestSession, customer]);

  if (loading || (isGuestSession && mode === "checking")) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isFullyAuthenticated) {
    return <>{children}</>;
  }

  // Not logged in at all → push to login
  if (!isGuestSession || !customer) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6 space-y-4 text-center">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Faça login para continuar</h2>
            <p className="text-sm text-muted-foreground">
              Para acessar {sectionName}, você precisa estar conectado à sua conta.
            </p>
            <Button onClick={() => navigate(buildPath("/customer/login"))} className="w-full">
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guest with password defined → ask for it inline
  if (mode === "ask-password") {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password) return;
      setSubmitting(true);
      const { error, needsPasswordSetup } = await login({
        storeId: customer.store_id,
        email: customer.email,
        password,
      });
      setSubmitting(false);
      if (needsPasswordSetup) {
        // Edge case: customer existed without password by the time we checked
        setMode("needs-setup");
        return;
      }
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Identidade confirmada");
    };

    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center space-y-2">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Confirme sua senha</h2>
              <p className="text-sm text-muted-foreground">
                Para acessar {sectionName}, digite sua senha.
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="confirm-email">Email</Label>
                <Input id="confirm-email" value={customer.email} disabled />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continuar
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center pt-1"
                onClick={async () => {
                  const resetUrlBase = `${window.location.origin}${buildPath("/redefinir-senha")}`;
                  await requestPasswordReset({
                    storeId: customer.store_id,
                    email: customer.email,
                    resetUrlBase,
                  });
                  setMode("email-sent");
                }}
              >
                Esqueci minha senha
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Guest without password yet → offer to send setup email
  if (mode === "needs-setup") {
    const handleSendSetup = async () => {
      setSubmitting(true);
      const resetUrlBase = `${window.location.origin}${buildPath("/redefinir-senha")}`;
      const { error } = await requestPasswordReset({
        storeId: customer.store_id,
        email: customer.email,
        resetUrlBase,
      });
      setSubmitting(false);
      if (error) {
        toast.error(error);
        return;
      }
      setMode("email-sent");
    };

    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <Card>
          <CardContent className="pt-6 space-y-4 text-center">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Crie sua senha</h2>
            <p className="text-sm text-muted-foreground">
              Para acessar {sectionName}, você precisa definir uma senha. Vamos enviar um link
              para <strong>{customer.email}</strong>.
            </p>
            <Button onClick={handleSendSetup} disabled={submitting} className="w-full">
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</>
              ) : (
                <><Mail className="mr-2 h-4 w-4" />Receber email para criar senha</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Você continua vendo seus pedidos normalmente. Esta etapa é apenas
              para abrir áreas com dados pessoais.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email sent confirmation
  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card>
        <CardContent className="pt-6 space-y-4 text-center">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Email enviado!</h2>
          <p className="text-sm text-muted-foreground">
            Enviamos um link para <strong>{customer.email}</strong>. Abra-o para
            definir sua senha e voltar aqui.
          </p>
          <Button variant="outline" onClick={() => setMode("ask-password")} className="w-full">
            Já defini, voltar a entrar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
