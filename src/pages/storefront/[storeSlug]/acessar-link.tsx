/**
 * Magic link verification page.
 *
 * Lands here after the customer clicks the link in their inbox:
 *   /acessar-link?token=...
 *
 * Validates the token against the store, mints a full-scope JWT, and
 * redirects to the customer area. If the user already had a guest session,
 * it gets upgraded to full automatically.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useCustomerAuth } from "@/features/auth";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "success" | "invalid" | "no-store" | "no-token";

export default function AcessarLinkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const { verifyMagicLink } = useCustomerAuth();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ranOnce = useRef(false);

  useEffect(() => {
    document.title = "Entrando…";
  }, []);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    if (!token) {
      setStatus("no-token");
      return;
    }
    if (!storeSlug) {
      setStatus("no-store");
      return;
    }

    (async () => {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", storeSlug)
        .eq("is_active", true)
        .single();

      if (!store?.id) {
        setStatus("no-store");
        return;
      }

      const { error } = await verifyMagicLink({ storeId: store.id, token });
      if (error) {
        setErrorMsg(error);
        setStatus("invalid");
        return;
      }
      setStatus("success");
      setTimeout(() => navigate(buildPath("/customer")), 1200);
    })();
  }, [token, storeSlug, verifyMagicLink, navigate, buildPath]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Validando seu link…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-3">
        <CheckCircle2 className="w-12 h-12 text-primary" />
        <h1 className="text-2xl font-semibold">Você entrou!</h1>
        <p className="text-sm text-muted-foreground">Redirecionando para sua área…</p>
      </div>
    );
  }

  // no-token | no-store | invalid
  const title =
    status === "no-token" ? "Link inválido"
    : status === "no-store" ? "Loja não encontrada"
    : "Não foi possível entrar";
  const message =
    status === "no-token" ? "O link está faltando o código de segurança."
    : status === "no-store" ? "Não conseguimos identificar esta loja."
    : (errorMsg || "O link expirou ou já foi utilizado. Solicite um novo na tela de login.");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button onClick={() => navigate(buildPath("/customer/login"))}>
            Ir para o login
          </Button>
          <Button onClick={() => navigate(buildPath("/"))} variant="outline">
            Voltar para a loja
          </Button>
        </div>
      </div>
    </div>
  );
}
