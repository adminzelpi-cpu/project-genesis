/**
 * SaveAccountCard — CTA pós-checkout convidando o cliente guest a "salvar a conta"
 * via magic link (zero fricção, sem senha).
 *
 * Aparece apenas quando:
 *  - cliente está em sessão guest (scope: guest_post_checkout), e
 *  - temos um e-mail conhecido (do checkout ou da própria sessão).
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Mail, Sparkles } from "lucide-react";
import { useCustomerAuth } from "@/features/auth/hooks/useCustomerAuth";
import { toast } from "sonner";

interface SaveAccountCardProps {
  storeId?: string;
  storeName?: string;
  defaultEmail?: string;
}

export function SaveAccountCard({ storeId, storeName, defaultEmail }: SaveAccountCardProps) {
  const { customer, isFullyAuthenticated, isGuestSession, requestMagicLink } = useCustomerAuth();

  const initialEmail = useMemo(
    () => defaultEmail || customer?.email || "",
    [defaultEmail, customer?.email]
  );
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Não exibir se já está totalmente autenticado ou se não há sessão guest
  if (isFullyAuthenticated) return null;
  if (!isGuestSession) return null;
  if (!storeId) return null;

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast.error("Informe um e-mail válido");
      return;
    }
    setLoading(true);
    try {
      const verifyUrlBase = `${window.location.origin}/acessar-link`;
      await requestMagicLink({ storeId, email: trimmed, verifyUrlBase });
      setSent(true);
      toast.success("Pronto! Enviamos um link mágico para você");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-sm">E-mail enviado</p>
            <p className="text-sm text-muted-foreground">
              Enviamos um link para <strong>{email}</strong>. Clique nele para acessar
              sua conta a qualquer momento — sem precisar de senha.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-sm">Salve sua conta {storeName ? `na ${storeName}` : ""}</p>
            <p className="text-sm text-muted-foreground">
              Acompanhe pedidos e compre mais rápido nas próximas vezes. Sem senha — só um link no seu e-mail.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="save-account-email" className="text-xs">Seu e-mail</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="save-account-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={loading} className="gap-2">
              <Mail className="h-4 w-4" />
              {loading ? "Enviando..." : "Receber link"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
