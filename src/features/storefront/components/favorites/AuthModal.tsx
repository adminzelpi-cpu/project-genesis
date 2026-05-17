import { useState } from "react";
import { PasswordStrength } from "@/components/PasswordStrength";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Heart, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth, FullNameInput, isFullNameValid } from "@/features/auth";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productName?: string;
  storeId?: string;
}

type Step = "email" | "login" | "signup";

export function AuthModal({ open, onClose, onSuccess, productName, storeId }: AuthModalProps) {
  const { login, signup } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Hybrid model: only ask for password if the email is a customer
      // OF THIS STORE. The customer perceives each store as independent.
      if (storeId) {
        const { data: custData } = await supabase.functions.invoke("check-customer-auth-status", {
          body: { email: email.trim(), store_id: storeId },
        });

        if (custData?.exists && custData?.has_password) {
          setStep("login");
          return;
        }
      }
      setStep("signup");
    } catch {
      setStep("signup");
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
      toast.info(error || "Defina sua senha por email para acessar.");
      return;
    }
    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Login realizado com sucesso!");
    onSuccess();
    onClose();
    resetForm();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      toast.error("Loja não identificada");
      return;
    }
    if (!isFullNameValid(fullName)) {
      toast.error("Digite seu nome e sobrenome");
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
      // If account already exists in this store, switch to login step
      if (/já existe|already exists|cadastrad/i.test(error)) {
        setStep("login");
      }
      return;
    }

    toast.success("Conta criada com sucesso!");
    onSuccess();
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setStep("email");
    setShowPassword(false);
  };

  const handleBack = () => {
    setPassword("");
    setFullName("");
    setShowPassword(false);
    setStep("email");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { onClose(); resetForm(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
            <Heart className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Salve seus favoritos</DialogTitle>
          <DialogDescription>
            {productName
              ? `Insira seu email para adicionar "${productName}" aos seus favoritos.`
              : "Insira seu email para salvar seus produtos favoritos."
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Email */}
        {step === "email" && (
          <form onSubmit={handleCheckEmail} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
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
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
              ) : "Continuar"}
            </Button>
          </form>
        )}

        {/* Step 2a: Login */}
        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">{email}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
              ) : "Entrar"}
            </Button>
          </form>
        )}

        {/* Step 2b: Signup */}
        {step === "signup" && (
          <form onSubmit={handleSignup} className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">{email}</span>
            </div>

            <p className="text-sm text-muted-foreground">
              Crie sua conta para salvar seus favoritos.
            </p>

            <FullNameInput
              id="signup-name"
              value={fullName}
              onChange={setFullName}
              disabled={isLoading}
              autoFocus
            />

            <div className="space-y-2">
              <Label htmlFor="signup-password">Criar senha</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</>
              ) : "Criar conta"}
            </Button>
          </form>
        )}

        <p className="text-xs text-center text-muted-foreground mt-4">
          Ao continuar, você concorda com nossos termos de uso e política de privacidade.
        </p>
      </DialogContent>
    </Dialog>
  );
}
