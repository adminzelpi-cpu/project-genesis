import { useState, useEffect } from "react";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  User,
  Eye,
  EyeOff,
  Package,
  MapPin,
  Heart,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth, FullNameInput, isFullNameValid } from "@/features/auth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useStorePath } from "@/contexts/StoreSlugContext";
import { getCurrentStorefrontBase } from "@/lib/storeUrl";

interface AccountDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
  storeSlug: string;
  storeId?: string;
  initialTab?: "login" | "signup";
}

type ViewMode = "email" | "login" | "signup" | "forgot-password" | "password-email-sent";

export function AccountDrawer({ open, onClose, onOpen, storeSlug, storeId, initialTab = "login" }: AccountDrawerProps) {
  const navigate = useNavigate();
  const { buildPath } = useStorePath();
  const { customer, isAuthenticated, login, signup, logout, requestPasswordReset } = useCustomerAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("email");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [setPasswordEmail, setSetPasswordEmail] = useState("");

  const userName = customer?.nome || customer?.email?.split("@")[0] || null;

  // Reset when drawer opens
  useEffect(() => {
    if (open && !isAuthenticated) {
      setViewMode("email");
    }
  }, [open, isAuthenticated]);

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Hybrid model: only ask for password if email is a customer of THIS store.
      if (storeId) {
        const { data: custData } = await supabase.functions.invoke("check-customer-auth-status", {
          body: { email: email.trim(), store_id: storeId },
        });

        if (custData?.exists && custData?.has_password) {
          setViewMode("login");
          return;
        }

        // Customer of this store but no password set (legacy / guest checkout)
        // → trigger password reset to set one
        if (custData?.exists && !custData?.has_password) {
          const redirectUrl = `${getCurrentStorefrontBase(storeSlug)}/redefinir-senha`;
          await requestPasswordReset({
            storeId,
            email: email.trim(),
            resetUrlBase: redirectUrl,
          });
          setSetPasswordEmail(email);
          setViewMode("password-email-sent");
          return;
        }
      }

      setViewMode("signup");
    } catch {
      setViewMode("signup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error("Loja não identificada");
      return;
    }
    setIsLoading(true);

    const { error, needsPasswordSetup } = await login({ storeId, email: email.trim(), password });
    setIsLoading(false);

    if (needsPasswordSetup) {
      // Trigger password setup email and show confirmation
      const redirectUrl = `${getCurrentStorefrontBase(storeSlug)}/redefinir-senha`;
      await requestPasswordReset({ storeId, email: email.trim(), resetUrlBase: redirectUrl });
      setSetPasswordEmail(email);
      setViewMode("password-email-sent");
      return;
    }
    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Login realizado com sucesso!");
    resetForm();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFullNameValid(fullName)) {
      toast.error("Digite seu nome e sobrenome");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (!storeId) {
      toast.error("Loja não identificada");
      return;
    }

    setIsLoading(true);

    const { error } = await signup({
      storeId,
      email: email.trim(),
      password,
      nome: fullName.trim(),
    });

    setIsLoading(false);

    if (error) {
      toast.error(error);
      if (/já existe|already exists|cadastrad/i.test(error)) {
        setViewMode("login");
      }
      return;
    }

    toast.success("Conta criada com sucesso!");
    resetForm();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error("Loja não identificada");
      return;
    }
    setIsLoading(true);

    const targetEmail = forgotPasswordEmail || email;
    const redirectUrl = `${getCurrentStorefrontBase(storeSlug)}/redefinir-senha`;

    try {
      await requestPasswordReset({
        storeId,
        email: targetEmail.trim(),
        resetUrlBase: redirectUrl,
      });
    } catch {
      // Don't reveal errors to prevent email enumeration
    }

    setIsLoading(false);
    setSetPasswordEmail(targetEmail);
    setViewMode("password-email-sent");
    setForgotPasswordEmail("");
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Você saiu da sua conta");
    onClose();
    navigate(buildPath("/"));
  };

  const handleBack = () => {
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setViewMode("email");
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setSetPasswordEmail("");
    setForgotPasswordEmail("");
    setViewMode("email");
  };

  const navigateTo = (path: string) => {
    onClose();
    navigate(path);
  };

  const menuItems = [
    { icon: Package, label: "Meus Pedidos", path: buildPath("/customer/orders") },
    { icon: User, label: "Meus Dados", path: buildPath("/customer/profile") },
    { icon: MapPin, label: "Endereços", path: buildPath("/customer/addresses") },
    { icon: Heart, label: "Favoritos", path: buildPath("/customer/favorites") },
  ];

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Olá,</p>
                <h2 className="text-lg font-semibold">{userName || "Cliente"}</h2>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Minha Conta</h2>
                <p className="text-sm text-muted-foreground">Entre ou crie sua conta</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isAuthenticated ? (
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className="w-full flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}

              <Separator className="my-4" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sair da conta</span>
              </button>
            </div>

          ) : viewMode === "password-email-sent" ? (
            <div className="text-center py-4">
              <button onClick={() => { setViewMode("email"); setSetPasswordEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </button>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Verifique seu email</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enviamos um link para <strong>{setPasswordEmail}</strong> para que você defina sua senha de acesso.
              </p>
              <p className="text-xs text-muted-foreground">Não recebeu? Verifique sua caixa de spam ou tente novamente.</p>
            </div>

          ) : viewMode === "forgot-password" ? (
            <div>
              <button onClick={() => setViewMode("login")}
                className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao login
              </button>

              <h3 className="text-lg font-semibold mb-2">Esqueceu sua senha?</h3>
              <p className="text-sm text-muted-foreground mb-6">Digite seu email e enviaremos um link para redefinir sua senha.</p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input id="forgot-email" type="email" placeholder="seu@email.com"
                    value={forgotPasswordEmail || email} onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required disabled={isLoading} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : "Enviar link de recuperação"}
                </Button>
              </form>
            </div>

          ) : viewMode === "email" ? (
            <form onSubmit={handleCheckEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="drawer-email">Email</Label>
                <Input
                  id="drawer-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</> : "Continuar"}
              </Button>
            </form>

          ) : viewMode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">{email}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="drawer-login-password">Senha</Label>
                <div className="relative">
                  <Input id="drawer-login-password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} autoFocus className="pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="button" onClick={() => setViewMode("forgot-password")}
                className="text-sm text-muted-foreground hover:text-foreground underline">
                Esqueci minha senha
              </button>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</> : "Entrar"}
              </Button>
            </form>

          ) : viewMode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">{email}</span>
              </div>

              <p className="text-sm text-muted-foreground">
                Não encontramos uma conta com esse email. Preencha os dados abaixo para criar sua conta.
              </p>

              <FullNameInput
                id="drawer-signup-name"
                value={fullName}
                onChange={setFullName}
                disabled={isLoading}
                autoFocus
              />
              <div className="space-y-2">
                <Label htmlFor="drawer-signup-password">Criar senha</Label>
                <div className="relative">
                  <Input id="drawer-signup-password" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres"
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} disabled={isLoading} className="pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="drawer-signup-confirm">Confirmar senha</Label>
                <div className="relative">
                  <Input id="drawer-signup-confirm" type={showConfirmPassword ? "text" : "password"} placeholder="Digite a senha novamente"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} disabled={isLoading} className="pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</> : "Criar conta"}
              </Button>
            </form>
          ) : null}
        </div>

        {/* Footer - only for non-authenticated */}
        {!isAuthenticated && (viewMode === "email" || viewMode === "login" || viewMode === "signup") && (
          <div className="border-t px-6 py-4">
            <p className="text-xs text-center text-muted-foreground">
              Ao continuar, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
