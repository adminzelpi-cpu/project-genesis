import { useState } from 'react';
import { PasswordStrength } from '@/components/PasswordStrength';
import { useAuth } from '@/hooks/useAuth';
import { navigateToAdmin } from '@/lib/adminUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Step = 'email' | 'login' | 'signup';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('email');
  const { signIn, signUp, user } = useAuth();

  if (user) {
    navigateToAdmin('/dashboard');
    return null;
  }

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('check-email-exists', {
        body: { email: email.trim() },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          variant: "destructive",
          title: "Erro ao verificar email",
          description: "Tente novamente em alguns instantes.",
        });
        return;
      }

      setStep(data?.exists ? 'login' : 'signup');
    } catch {
      toast({
        variant: "destructive",
        title: "Erro de conexão",
        description: "Não foi possível verificar o email. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (!error) navigateToAdmin('/dashboard');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      // If user already exists, switch to login step
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        toast({
          title: "Conta já existe",
          description: "Este email já está cadastrado. Faça login com sua senha.",
        });
        setStep('login');
        setPassword('');
      }
      setIsLoading(false);
      return;
    }

    // Auto-login after successful signup
    const { error: loginError } = await signIn(email, password);
    setIsLoading(false);
    if (!loginError) navigateToAdmin('/dashboard');
  };

  const handleBack = () => {
    setPassword('');
    setFullName('');
    setShowPassword(false);
    setStep('email');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
            Zelpi
          </CardTitle>
          <CardDescription className="text-center">
            Crie sua loja online em minutos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleCheckEmail} className="space-y-4">
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
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
                ) : 'Continuar'}
              </Button>
            </form>
          )}

          {/* Step 2a: Login */}
          {step === 'login' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">{email}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-signin">Senha</Label>
                <div className="relative">
                  <Input
                    id="password-signin"
                    type={showPassword ? 'text' : 'password'}
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
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Entrando...</>
                ) : 'Entrar'}
              </Button>
            </form>
          )}

          {/* Step 2b: Signup */}
          {step === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">{email}</span>
              </div>

              <p className="text-sm text-muted-foreground">
                Não encontramos uma conta com esse email. Preencha os dados para começar.
              </p>

              <div className="space-y-2">
                <Label htmlFor="name-signup">Nome Completo</Label>
                <Input
                  id="name-signup"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Criar senha</Label>
                <div className="relative">
                  <Input
                    id="password-signup"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
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
              <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cadastrando...</>
                ) : 'Começar Grátis'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
