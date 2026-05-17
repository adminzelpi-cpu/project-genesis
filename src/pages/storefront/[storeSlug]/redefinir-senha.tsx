/**
 * Customer password setup / reset page (single unified flow).
 *
 * Used in two contexts via ?mode=:
 *  - mode=welcome  → first-time password setup (link sent in welcome email after first purchase)
 *  - default       → "I forgot my password" reset
 *
 * The token arrives in the URL: /redefinir-senha?token=...&mode=welcome
 *
 * Both modes hit the same backend (`customer-password-reset-confirm`) which:
 *  - Validates the token against `customers.password_reset_token`
 *  - Hashes the password and stores it in `customers.password_hash` (per-store, isolated)
 *  - Returns a store-scoped JWT for auto-login
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet";
import { useCustomerAuth } from "@/features/auth";
import { useStoreSlug, useStorePath } from "@/contexts/StoreSlugContext";
import { useStorefront } from "@/features/storefront/hooks/useStorefront";
import { StorefrontHeader } from "@/features/storefront/components/layout/StorefrontHeader";
import { StorefrontFooter } from "@/features/storefront/components/layout/StorefrontFooter";
import { StoreThemeProvider } from "@/features/storefront/components/layout/StoreThemeProvider";

export default function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const storeSlug = useStoreSlug();
  const { buildPath } = useStorePath();
  const { confirmPasswordReset } = useCustomerAuth();
  const { store, isLoading: storeLoading } = useStorefront(storeSlug);

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const isWelcome = useMemo(() => searchParams.get("mode") === "welcome", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Link inválido ou expirado");
      return;
    }
    if (!store?.id) {
      toast.error("Loja não encontrada");
      return;
    }
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setIsLoading(true);
    const { error } = await confirmPasswordReset({ storeId: store.id, token, newPassword: password });
    setIsLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSuccess(true);
    toast.success(isWelcome ? "Conta criada! Bem-vindo(a)." : "Senha redefinida com sucesso!");
    setTimeout(() => {
      navigate(buildPath("/customer/orders"));
    }, 1500);
  };

  // Loading store
  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loja não encontrada</p>
      </div>
    );
  }

  const pageTitle = isWelcome ? "Criar senha" : "Redefinir senha";
  const heading = isWelcome ? "Crie sua senha" : "Redefinir senha";
  const subheading = isWelcome
    ? `Bem-vindo(a) à ${store.name}! Crie uma senha para acessar seus pedidos, salvar endereços e acompanhar entregas.`
    : "Crie uma nova senha para acessar sua conta.";
  const ctaLabel = isWelcome ? "Criar senha e acessar" : "Redefinir senha";
  const successTitle = isWelcome ? "Conta criada!" : "Senha redefinida!";
  const successMessage = isWelcome
    ? "Tudo pronto. Estamos te levando para sua área do cliente…"
    : "Você já está logado. Redirecionando…";

  return (
    <StoreThemeProvider
      primaryColor={store.theme_primary_color}
      secondaryColor={store.theme_secondary_color}
      buttonTextColor={(store as any)?.button_text_color ?? null}
      primaryTextColor={(store as any)?.primary_text_color ?? null}
      secondaryTextColor={(store as any)?.secondary_text_color ?? null}
      faviconUrl={store.favicon_url}
      fontFamily={(store as any).font_family}
    >
      <Helmet>
        <title>{pageTitle} - {store.name}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-background">
        <StorefrontHeader
          storeName={store.name}
          storeSlug={store.slug}
          storeId={store.id}
          logoUrl={store.logo_url}
          headerBgColor={store.header_bg_color}
          headerTextColor={store.header_text_color}
          headerLayout={store.header_layout}
          headerShowFavorites={store.header_show_favorites}
          headerShowSearch={store.header_show_search}
          headerMobileLogoPosition={store.header_mobile_logo_position}
        />

        <main className="flex-1 flex items-start justify-center py-12 px-4">
          <div className="w-full max-w-md">
            {/* Invalid token state */}
            {!token && (
              <div className="text-center space-y-4 py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                <h1 className="text-2xl font-semibold">Link inválido</h1>
                <p className="text-muted-foreground">
                  O link está faltando o código de segurança. Verifique se copiou o link completo do email.
                </p>
                <Button onClick={() => navigate(buildPath("/"))} variant="outline">
                  Voltar para a loja
                </Button>
              </div>
            )}

            {/* Success state */}
            {token && success && (
              <div className="text-center space-y-4 py-12">
                <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
                <h1 className="text-2xl font-semibold">{successTitle}</h1>
                <p className="text-muted-foreground">{successMessage}</p>
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
              </div>
            )}

            {/* Form state */}
            {token && !success && (
              <>
                <div className="text-center mb-8">
                  {isWelcome && (
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <h1 className="text-2xl font-semibold mb-2">{heading}</h1>
                  <p className="text-sm text-muted-foreground">{subheading}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        maxLength={128}
                        disabled={isLoading}
                        className="pr-10"
                        autoFocus
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Digite a senha novamente"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        maxLength={128}
                        disabled={isLoading}
                        className="pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p className="text-xs text-destructive">As senhas não coincidem</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</>
                    ) : (
                      ctaLabel
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Link válido por 24 horas.
                  </p>
                </form>
              </>
            )}
          </div>
        </main>

        <StorefrontFooter store={store} />
      </div>
    </StoreThemeProvider>
  );
}
