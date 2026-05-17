import { useState, useEffect } from "react";
import { AcceptedPaymentMethods } from "./AcceptedPaymentMethods";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, AlertCircle, ExternalLink, Unlink, Key, Settings } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InstallmentConfig {
  maxInstallments: number;
  interestRate: number;
  freeInstallments: number;
  minInstallmentValue: number;
}

interface MercadoPagoCredentialsGatewayProps {
  storeId: string;
  gateway: PaymentGateway | undefined;
  onToggle: (gatewayId: string, isActive: boolean) => void;
  onDisconnect: (gatewayId: string) => void;
  onRefresh: () => void;
}

export function MercadoPagoCredentialsGateway({ storeId, gateway, onToggle, onDisconnect, onRefresh }: MercadoPagoCredentialsGatewayProps) {
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const [installmentConfig, setInstallmentConfig] = useState<InstallmentConfig>({
    maxInstallments: 12,
    interestRate: 2.99,
    freeInstallments: 1,
    minInstallmentValue: 5,
  });
  const [pixDiscount, setPixDiscount] = useState(0);
  const [boletoDiscount, setBoletoDiscount] = useState(0);
  const [pixExpirationMinutes, setPixExpirationMinutes] = useState(0);
  const [acceptCreditCard, setAcceptCreditCard] = useState(true);
  const [acceptPix, setAcceptPix] = useState(true);
  const [acceptBoleto, setAcceptBoleto] = useState(true);

  useEffect(() => {
    if (gateway) {
      const credentials = (gateway.credentials || {}) as {
        installment_config?: InstallmentConfig;
        pix_discount?: number;
        boleto_discount?: number;
        pix_expiration_minutes?: number;
      };
      if (credentials.installment_config) {
        setInstallmentConfig(credentials.installment_config);
      }
      if (credentials.pix_discount !== undefined) {
        setPixDiscount(credentials.pix_discount * 100);
      }
      if (credentials.boleto_discount !== undefined) {
        setBoletoDiscount(credentials.boleto_discount * 100);
      }
      if (credentials.pix_expiration_minutes !== undefined) {
        setPixExpirationMinutes(credentials.pix_expiration_minutes);
      }
      setAcceptCreditCard(gateway.accept_credit_card ?? true);
      setAcceptPix(gateway.accept_pix ?? true);
      setAcceptBoleto(gateway.accept_boleto ?? true);
    }
  }, [gateway]);

  const isManualConnection = (gateway?.credentials as any)?.connection_type === "manual";
  const isConnected = !!gateway?.oauth_user_id && isManualConnection;

  const handleConnect = () => {
    setShowTokenDialog(true);
  };

  const handleSaveToken = async () => {
    if (!accessToken.trim()) {
      toast({ variant: "destructive", title: "Erro", description: "Informe o Access Token" });
      return;
    }
    if (!publicKey.trim()) {
      toast({ variant: "destructive", title: "Erro", description: "Informe a Public Key (necessária para pagamentos com cartão)" });
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("mercadopago-validate-token", {
        body: { accessToken, storeId, publicKey },
      });

      if (error) throw error;

      if (data?.valid) {
        toast({
          title: "Conectado!",
          description: `Mercado Pago conectado com sucesso${data.isSandbox ? " (modo teste)" : ""}.`,
        });
        setShowTokenDialog(false);
        setAccessToken("");
        setPublicKey("");
        onRefresh();
      } else {
        toast({
          variant: "destructive",
          title: "Token inválido",
          description: data?.error || "O Access Token informado não é válido.",
        });
      }
    } catch (error) {
      console.error("Erro ao validar token:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível validar o token. Tente novamente.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!gateway) return;
    setIsSavingConfig(true);
    try {
      const currentCredentials = (gateway.credentials || {}) as Record<string, unknown>;
      const newCredentials = {
        ...currentCredentials,
        installment_config: installmentConfig,
        pix_discount: pixDiscount / 100,
        boleto_discount: boletoDiscount / 100,
        pix_expiration_minutes: pixExpirationMinutes,
      };

      const { error } = await supabase
        .from("store_payment_gateways")
        .update({ 
          credentials: newCredentials,
          accept_credit_card: acceptCreditCard,
          accept_pix: acceptPix,
          accept_boleto: acceptBoleto,
        } as any)
        .eq("id", gateway.id);

      if (error) throw error;

      toast({ title: "Configuração salva!", description: "As configurações foram atualizadas." });
      setShowConfigDialog(false);
      onRefresh();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar." });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const calculateInstallmentValue = (total: number, installments: number): number => {
    if (installments <= installmentConfig.freeInstallments) return total / installments;
    const monthlyRate = installmentConfig.interestRate / 100;
    const factor = (monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1);
    return total * factor;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#009ee3] flex items-center justify-center">
                <span className="text-white font-bold text-lg">MP</span>
              </div>
              Mercado Pago (Credenciais)
            </CardTitle>
            <CardDescription>
              Conecte colando seu Access Token diretamente
            </CardDescription>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <Label htmlFor="mp-cred-active" className="text-sm">Ativo</Label>
              <Switch
                id="mp-cred-active"
                checked={gateway?.is_active}
                onCheckedChange={(checked) => gateway && onToggle(gateway.id, checked)}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Conectado
                </Badge>
                {gateway?.is_sandbox && (
                  <Badge variant="secondary">Modo Teste</Badge>
                )}
                {gateway?.display_name && (
                  <span className="text-sm text-muted-foreground">{gateway.display_name}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded">PIX {pixDiscount > 0 && `(-${pixDiscount}%)`}</span>
                <span className="px-2 py-1 bg-muted rounded">Boleto {boletoDiscount > 0 && `(-${boletoDiscount}%)`}</span>
                <span className="px-2 py-1 bg-muted rounded">Cartão de Crédito</span>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Configuração de Pagamento:</p>
                <div className="text-muted-foreground space-y-0.5">
                  <p>• Até {installmentConfig.maxInstallments}x no cartão ({installmentConfig.freeInstallments}x sem juros)</p>
                  <p>• Taxas de juros dinâmicas (via Mercado Pago)</p>
                  {pixDiscount > 0 && <p>• Desconto PIX: {pixDiscount}%</p>}
                  {boletoDiscount > 0 && <p>• Desconto Boleto: {boletoDiscount}%</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
                  <Settings className="h-4 w-4 mr-1" />
                  Configurações
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://www.mercadopago.com.br/activities" target="_blank" rel="noopener noreferrer" className="gap-1">
                    <ExternalLink className="h-4 w-4" />
                    Ver transações
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={handleConnect}>
                  <Key className="h-4 w-4 mr-1" />
                  Atualizar token
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
                        Ao desconectar, você não poderá mais receber pagamentos via Mercado Pago até reconectar.
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
                Cole seu Access Token do Mercado Pago para conectar. Você pode encontrá-lo em{" "}
                <a
                  href="https://www.mercadopago.com.br/developers/panel/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Suas integrações → Credenciais
                </a>.
              </p>
              <Button onClick={handleConnect}>
                <Key className="mr-2 h-4 w-4" />
                Configurar com Access Token
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Token Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Mercado Pago</DialogTitle>
            <DialogDescription>
              Cole seu Access Token do Mercado Pago. Você pode encontrá-lo em{" "}
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Suas integrações → Credenciais de produção
              </a>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mp-public-key">Public Key</Label>
              <Input
                id="mp-public-key"
                placeholder="APP_USR-xxxx-xxxx-xxxx-xxxx"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Primeiro campo no painel do Mercado Pago. Obrigatória para pagamentos com cartão.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mp-access-token">Access Token</Label>
              <Input
                id="mp-access-token"
                type="password"
                placeholder="APP_USR-..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Segundo campo no painel. Use o token de produção (APP_USR-) para pagamentos reais ou de teste (TEST-) para testes. Deve ser do mesmo ambiente da Public Key.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTokenDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveToken} disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurações de Pagamento</DialogTitle>
            <DialogDescription>Configure parcelamento e descontos.</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="methods" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="methods">Métodos</TabsTrigger>
              <TabsTrigger value="installments">Parcelamento</TabsTrigger>
              <TabsTrigger value="discounts">Descontos</TabsTrigger>
              <TabsTrigger value="preview">Prévia</TabsTrigger>
            </TabsList>

            <TabsContent value="methods" className="mt-4">
              <AcceptedPaymentMethods
                acceptCreditCard={acceptCreditCard}
                acceptPix={acceptPix}
                acceptBoleto={acceptBoleto}
                onChangeCreditCard={setAcceptCreditCard}
                onChangePix={setAcceptPix}
                onChangeBoleto={setAcceptBoleto}
              />
            </TabsContent>
            
            <TabsContent value="installments" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máximo de parcelas</Label>
                  <Select
                    value={String(installmentConfig.maxInstallments)}
                    onValueChange={(v) => setInstallmentConfig(prev => ({
                      ...prev,
                      maxInstallments: parseInt(v),
                      freeInstallments: Math.min(prev.freeInstallments, parseInt(v))
                    }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Parcelas sem juros</Label>
                  <Select
                    value={String(installmentConfig.freeInstallments)}
                    onValueChange={(v) => setInstallmentConfig(prev => ({ ...prev, freeInstallments: parseInt(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: installmentConfig.maxInstallments }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p>💡 As taxas de juros são obtidas automaticamente da sua conta Mercado Pago. O cliente verá os valores reais no checkout.</p>
              </div>
              <div className="space-y-2">
                <Label>Valor mínimo da parcela (R$)</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={installmentConfig.minInstallmentValue}
                  onChange={(e) => setInstallmentConfig(prev => ({ ...prev, minInstallmentValue: parseFloat(e.target.value) || 5 }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="discounts" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Desconto PIX (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={pixDiscount}
                  onChange={(e) => setPixDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Desconto Boleto (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={boletoDiscount}
                  onChange={(e) => setBoletoDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="border-t my-2" />

              <div className="space-y-2">
                <Label>Tempo de expiração do PIX (minutos)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="1440"
                  value={pixExpirationMinutes}
                  onChange={(e) => setPixExpirationMinutes(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo real até o PIX expirar. 0 = padrão do gateway (Mercado Pago: 24 horas). Sugestão: 30 ou 60 minutos.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground mb-3">
                <p>📌 No checkout, as taxas reais da sua conta Mercado Pago serão usadas. A prévia abaixo é apenas uma estimativa.</p>
              </div>
              <p className="text-sm text-muted-foreground">Estimativa para R$ 100,00:</p>
              <div className="space-y-1 text-sm">
                {Array.from({ length: installmentConfig.maxInstallments }, (_, i) => i + 1).map(n => {
                  const value = calculateInstallmentValue(100, n);
                  const isFree = n <= installmentConfig.freeInstallments;
                  return (
                    <div key={n} className="flex justify-between py-1 border-b border-border/50">
                      <span>{n}x de R$ {value.toFixed(2)}</span>
                      <span className={isFree ? "text-green-600" : "text-muted-foreground"}>
                        {isFree ? "sem juros" : `total R$ ${(value * n).toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
              {isSavingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
