import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Check, AlertCircle, ExternalLink, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PaymentGateway } from "../hooks/usePaymentGateways";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MercadoPagoGatewayProps {
  storeId: string;
  gateway: PaymentGateway | undefined;
  onToggle: (gatewayId: string, isActive: boolean) => void;
  onDisconnect: (gatewayId: string) => void;
}

export function MercadoPagoGateway({ storeId, gateway, onToggle, onDisconnect }: MercadoPagoGatewayProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "mp-oauth-success") {
        setIsConnecting(false);
        toast({
          title: "Conectado!",
          description: "Sua conta do Mercado Pago foi conectada com sucesso.",
        });
        // Trigger a refetch
        window.location.reload();
      } else if (event.data?.type === "mp-oauth-error") {
        setIsConnecting(false);
        toast({
          variant: "destructive",
          title: "Erro na conexão",
          description: event.data.error || "Não foi possível conectar ao Mercado Pago.",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("mercadopago-oauth", {
        body: {
          storeId,
          redirectUri: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-callback`,
        },
      });

      if (error) throw error;

      if (data?.code === "CREDENTIALS_NOT_CONFIGURED") {
        toast({
          variant: "destructive",
          title: "Credenciais não configuradas",
          description: "As credenciais do Mercado Pago ainda não foram configuradas pelo administrador.",
        });
        setIsConnecting(false);
        return;
      }

      if (data?.authUrl) {
        // Open OAuth popup
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          data.authUrl,
          "mercadopago-oauth",
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    } catch (error) {
      console.error("Erro ao iniciar conexão:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível iniciar a conexão com o Mercado Pago.",
      });
      setIsConnecting(false);
    }
  };

  const isConnected = !!gateway?.oauth_user_id;
  const isExpired = gateway?.oauth_expires_at && new Date(gateway.oauth_expires_at) < new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#009ee3] flex items-center justify-center">
              <span className="text-white font-bold text-lg">MP</span>
            </div>
            Mercado Pago
          </CardTitle>
          <CardDescription>
            Receba pagamentos via PIX, boleto e cartão de crédito
          </CardDescription>
        </div>
        {isConnected && (
          <div className="flex items-center gap-2">
            <Label htmlFor="mp-active" className="text-sm">Ativo</Label>
            <Switch
              id="mp-active"
              checked={gateway?.is_active}
              onCheckedChange={(checked) => gateway && onToggle(gateway.id, checked)}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant={isExpired ? "destructive" : "default"} className="gap-1">
                {isExpired ? (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Token expirado
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    Conectado
                  </>
                )}
              </Badge>
              {gateway?.oauth_user_id && (
                <span className="text-sm text-muted-foreground">
                  ID: {gateway.oauth_user_id}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="px-2 py-1 bg-muted rounded">PIX</span>
              <span className="px-2 py-1 bg-muted rounded">Boleto</span>
              <span className="px-2 py-1 bg-muted rounded">Cartão de Crédito</span>
            </div>

            <div className="flex gap-2 pt-2">
              {isExpired && (
                <Button onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reconectando...
                    </>
                  ) : (
                    "Reconectar"
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://www.mercadopago.com.br/activities"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver transações
                </a>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Unlink className="h-4 w-4 mr-1" />
                    Desconectar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desconectar Mercado Pago?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao desconectar, você não poderá mais receber pagamentos via Mercado Pago até reconectar sua conta.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => gateway && onDisconnect(gateway.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Desconectar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Conecte sua conta do Mercado Pago para começar a receber pagamentos.
              Você será redirecionado para autorizar o acesso.
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                "Conectar Mercado Pago"
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
