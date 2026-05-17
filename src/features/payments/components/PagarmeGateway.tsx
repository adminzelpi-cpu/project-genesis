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
  interestRate: number; // Monthly interest rate (e.g., 2.99 for 2.99%)
  freeInstallments: number; // Number of installments without interest
  minInstallmentValue: number; // Minimum value per installment
}

interface PagarmeGatewayProps {
  storeId: string;
  gateway: PaymentGateway | undefined;
  onToggle: (gatewayId: string, isActive: boolean) => void;
  onDisconnect: (gatewayId: string) => void;
  onRefresh: () => void;
}

export function PagarmeGateway({ storeId, gateway, onToggle, onDisconnect, onRefresh }: PagarmeGatewayProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // Installment config state
  const [installmentConfig, setInstallmentConfig] = useState<InstallmentConfig>({
    maxInstallments: 12,
    interestRate: 2.99,
    freeInstallments: 1,
    minInstallmentValue: 5,
  });
  
  // Discount config state
  const [pixDiscount, setPixDiscount] = useState(0); // percentage
  const [boletoDiscount, setBoletoDiscount] = useState(0); // percentage
  const [pixExpirationMinutes, setPixExpirationMinutes] = useState(0); // 0 = default gateway
  const [acceptCreditCard, setAcceptCreditCard] = useState(true);
  const [acceptPix, setAcceptPix] = useState(true);
  const [acceptBoleto, setAcceptBoleto] = useState(true);

  // Load existing config when gateway changes
  useEffect(() => {
    if (gateway) {
      const credentials = (gateway.credentials || {}) as { 
        api_key?: string; 
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

  const handleConnect = () => {
    setShowApiKeyDialog(true);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Informe a chave secreta do Pagar.me",
      });
      return;
    }

    setIsValidating(true);

    try {
      // Validate API key by making a test request
      const { data, error } = await supabase.functions.invoke("pagarme-validate-key", {
        body: { apiKey, storeId },
      });

      if (error) throw error;

      if (data?.valid) {
        toast({
          title: "Conectado!",
          description: "Pagar.me foi configurado com sucesso.",
        });
        setShowApiKeyDialog(false);
        setApiKey("");
        onRefresh();
      } else {
        toast({
          variant: "destructive",
          title: "Chave inválida",
          description: data?.error || "A chave secreta informada não é válida.",
        });
      }
    } catch (error) {
      console.error("Erro ao validar chave:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível validar a chave. Tente novamente.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveInstallmentConfig = async () => {
    if (!gateway) return;
    
    setIsSavingConfig(true);
    
    try {
      const currentCredentials = gateway.credentials as { api_key?: string } || {};
      
      const newCredentials = {
        ...currentCredentials,
        installment_config: {
          maxInstallments: installmentConfig.maxInstallments,
          interestRate: installmentConfig.interestRate,
          freeInstallments: installmentConfig.freeInstallments,
          minInstallmentValue: installmentConfig.minInstallmentValue,
        },
        pix_discount: pixDiscount / 100, // Store as decimal
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

      toast({
        title: "Configuração salva!",
        description: "As configurações de pagamento foram atualizadas.",
      });
      setShowConfigDialog(false);
      onRefresh();
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a configuração.",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const isConnected = !!gateway?.credentials;
  const verificationStatus = gateway?.verification_status;

  // Calculate example installments for preview
  const exampleTotal = 100;
  const calculateInstallmentValue = (total: number, installments: number): number => {
    if (installments <= installmentConfig.freeInstallments) {
      return total / installments;
    }
    // Compound interest formula
    const monthlyRate = installmentConfig.interestRate / 100;
    const factor = (monthlyRate * Math.pow(1 + monthlyRate, installments)) / 
                   (Math.pow(1 + monthlyRate, installments) - 1);
    return total * factor;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#65A300] flex items-center justify-center">
                <span className="text-white font-bold text-lg">PG</span>
              </div>
              Pagar.me
            </CardTitle>
            <CardDescription>
              Receba pagamentos via PIX, boleto e cartão de crédito
            </CardDescription>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <Label htmlFor="pagarme-active" className="text-sm">Ativo</Label>
              <Switch
                id="pagarme-active"
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
                <Badge variant={verificationStatus === "verified" ? "default" : "secondary"} className="gap-1">
                  {verificationStatus === "verified" ? (
                    <>
                      <Check className="h-3 w-3" />
                      Conectado
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Pendente verificação
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="px-2 py-1 bg-muted rounded">PIX {pixDiscount > 0 && `(-${pixDiscount}%)`}</span>
                <span className="px-2 py-1 bg-muted rounded">Boleto {boletoDiscount > 0 && `(-${boletoDiscount}%)`}</span>
                <span className="px-2 py-1 bg-muted rounded">Cartão de Crédito</span>
              </div>

              {/* Payment config summary */}
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Configuração de Pagamento:</p>
                <div className="text-muted-foreground space-y-0.5">
                  <p>• Até {installmentConfig.maxInstallments}x no cartão ({installmentConfig.freeInstallments}x sem juros)</p>
                  {installmentConfig.freeInstallments < installmentConfig.maxInstallments && (
                    <p>• Taxa de juros: {installmentConfig.interestRate.toFixed(2)}% a.m.</p>
                  )}
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
                  <a
                    href="https://dash.pagar.me/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver dashboard
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={handleConnect}>
                  <Key className="h-4 w-4 mr-1" />
                  Atualizar chave
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
                      <AlertDialogTitle>Desconectar Pagar.me?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ao desconectar, você não poderá mais receber pagamentos via Pagar.me até reconectar sua conta.
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
                Configure sua chave secreta do Pagar.me para começar a receber pagamentos.
                Você pode encontrar suas chaves no{" "}
                <a
                  href="https://dash.pagar.me/merchant/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  dashboard do Pagar.me
                </a>
                .
              </p>
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Configurar Pagar.me
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Pagar.me</DialogTitle>
            <DialogDescription>
              Informe sua chave secreta (Secret Key) do Pagar.me. Você pode encontrá-la em{" "}
              <a
                href="https://dash.pagar.me/merchant/home"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Configurações → Chaves de API
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Chave Secreta (sk_...)</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="sk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use a chave de produção (sk_live_) para pagamentos reais ou de teste (sk_test_) para testes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveApiKey} disabled={isValidating}>
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurações de Pagamento</DialogTitle>
            <DialogDescription>
              Configure parcelamento, descontos e outras opções de pagamento.
            </DialogDescription>
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
                  <Label htmlFor="maxInstallments">Máximo de parcelas</Label>
                  <Select 
                    value={String(installmentConfig.maxInstallments)}
                    onValueChange={(v) => setInstallmentConfig(prev => ({ 
                      ...prev, 
                      maxInstallments: parseInt(v),
                      freeInstallments: Math.min(prev.freeInstallments, parseInt(v))
                    }))}
                  >
                    <SelectTrigger id="maxInstallments">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freeInstallments">Parcelas sem juros</Label>
                  <Select 
                    value={String(installmentConfig.freeInstallments)}
                    onValueChange={(v) => setInstallmentConfig(prev => ({ 
                      ...prev, 
                      freeInstallments: parseInt(v) 
                    }))}
                  >
                    <SelectTrigger id="freeInstallments">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: installmentConfig.maxInstallments }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestRate">Taxa de juros mensal (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={installmentConfig.interestRate}
                  onChange={(e) => setInstallmentConfig(prev => ({ 
                    ...prev, 
                    interestRate: parseFloat(e.target.value) || 0 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Taxa aplicada nas parcelas com juros (ex: 2.99 para 2,99% a.m.)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minInstallmentValue">Valor mínimo da parcela (R$)</Label>
                <Input
                  id="minInstallmentValue"
                  type="number"
                  step="0.01"
                  min="1"
                  value={installmentConfig.minInstallmentValue}
                  onChange={(e) => setInstallmentConfig(prev => ({ 
                    ...prev, 
                    minInstallmentValue: parseFloat(e.target.value) || 5 
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Parcelas menores que este valor não serão oferecidas.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="discounts" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="pixDiscount">Desconto para pagamento via PIX (%)</Label>
                <Input
                  id="pixDiscount"
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={pixDiscount}
                  onChange={(e) => setPixDiscount(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Desconto aplicado automaticamente ao escolher PIX (ex: 5 para 5% de desconto)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="boletoDiscount">Desconto para pagamento via Boleto (%)</Label>
                <Input
                  id="boletoDiscount"
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={boletoDiscount}
                  onChange={(e) => setBoletoDiscount(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Desconto aplicado automaticamente ao escolher Boleto (ex: 3 para 3% de desconto)
                </p>
              </div>

              <div className="border-t my-2" />

              <div className="space-y-2">
                <Label htmlFor="pixExpiration">Tempo de expiração do PIX (minutos)</Label>
                <Input
                  id="pixExpiration"
                  type="number"
                  step="1"
                  min="0"
                  max="1440"
                  value={pixExpirationMinutes}
                  onChange={(e) => setPixExpirationMinutes(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Tempo real até o PIX expirar. 0 = padrão do gateway (Pagar.me: 1 hora). Sugestão: 30 ou 60 minutos para criar urgência.
                </p>
              </div>
              <div className="border rounded-lg p-4 bg-muted/30 mt-4">
                <p className="text-sm font-medium mb-3">
                  Exemplo para compra de R$ {exampleTotal.toFixed(2)}:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Cartão de Crédito:</span>
                    <span className="font-medium">R$ {exampleTotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>PIX ({pixDiscount}% desconto):</span>
                    <span className="font-medium">
                      R$ {(exampleTotal * (1 - pixDiscount / 100)).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Boleto ({boletoDiscount}% desconto):</span>
                    <span className="font-medium">
                      R$ {(exampleTotal * (1 - boletoDiscount / 100)).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium mb-3">
                  Parcelamento para R$ {exampleTotal.toFixed(2)}:
                </p>
                <div className="space-y-1 text-sm">
                  {Array.from({ length: installmentConfig.maxInstallments }, (_, i) => {
                    const n = i + 1;
                    const value = calculateInstallmentValue(exampleTotal, n);
                    const isInterestFree = n <= installmentConfig.freeInstallments;
                    const totalWithInterest = value * n;
                    
                    if (value < installmentConfig.minInstallmentValue) return null;
                    
                    return (
                      <div key={n} className="flex justify-between py-1 border-b border-border/50 last:border-0">
                        <span>
                          {n}x de R$ {value.toFixed(2).replace(".", ",")}
                          {isInterestFree ? (
                            <span className="text-emerald-600 ml-1 text-xs">sem juros</span>
                          ) : (
                            <span className="text-muted-foreground ml-1 text-xs">com juros</span>
                          )}
                        </span>
                        {!isInterestFree && (
                          <span className="text-muted-foreground text-xs">
                            Total: R$ {totalWithInterest.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveInstallmentConfig} disabled={isSavingConfig}>
              {isSavingConfig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar configuração"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
