import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, AlertCircle, ExternalLink, Truck, Key, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShippingConfig {
  frenet_token?: string;
  origin_cep?: string;
  enabled?: boolean;
  simplified_display?: boolean;
  shipping_subsidy?: number;
  shipping_subsidy_type?: 'fixed' | 'percentage';
  shipping_subsidy_apply_to?: 'cheapest' | 'all';
  max_free_shipping_cost?: number;
  frenet_auto_send?: boolean;
}

interface FrenetGatewayProps {
  storeId: string;
  shippingConfig: ShippingConfig;
  addressZip?: string;
  onRefresh: () => void;
}

export function FrenetGateway({ storeId, shippingConfig, addressZip, onRefresh }: FrenetGatewayProps) {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [token, setToken] = useState(shippingConfig?.frenet_token || "");
  const [originCep, setOriginCep] = useState(shippingConfig?.origin_cep || addressZip || "");
  const [enabled, setEnabled] = useState(shippingConfig?.enabled ?? true);
  const [simplifiedDisplay, setSimplifiedDisplay] = useState(shippingConfig?.simplified_display ?? true);
  const [shippingSubsidy, setShippingSubsidy] = useState(shippingConfig?.shipping_subsidy || 0);
  const [shippingSubsidyType, setShippingSubsidyType] = useState<'fixed' | 'percentage'>(shippingConfig?.shipping_subsidy_type || 'fixed');
  const [shippingSubsidyApplyTo, setShippingSubsidyApplyTo] = useState<'cheapest' | 'all'>(shippingConfig?.shipping_subsidy_apply_to || 'cheapest');
  const [maxFreeShippingCost, setMaxFreeShippingCost] = useState(shippingConfig?.max_free_shipping_cost || 0);
  const [autoSendFrenet, setAutoSendFrenet] = useState(shippingConfig?.frenet_auto_send ?? true);

  useEffect(() => {
    setToken(shippingConfig?.frenet_token || "");
    setOriginCep(shippingConfig?.origin_cep || addressZip || "");
    setEnabled(shippingConfig?.enabled ?? true);
    setSimplifiedDisplay(shippingConfig?.simplified_display ?? true);
    setShippingSubsidy(shippingConfig?.shipping_subsidy || 0);
    setShippingSubsidyType(shippingConfig?.shipping_subsidy_type || 'fixed');
    setShippingSubsidyApplyTo(shippingConfig?.shipping_subsidy_apply_to || 'cheapest');
    setMaxFreeShippingCost(shippingConfig?.max_free_shipping_cost || 0);
    setAutoSendFrenet(shippingConfig?.frenet_auto_send ?? true);
  }, [shippingConfig, addressZip]);

  const isConnected = !!shippingConfig?.frenet_token;

  const handleSave = async () => {
    if (!token.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Informe o token da Frenet",
      });
      return;
    }

    if (!originCep.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Informe o CEP de origem",
      });
      return;
    }

    setIsSaving(true);

    try {
      const newConfig: ShippingConfig = {
        frenet_token: token.trim(),
        origin_cep: originCep.replace(/\D/g, ""),
        enabled: enabled,
        simplified_display: simplifiedDisplay,
        shipping_subsidy: shippingSubsidy,
        shipping_subsidy_type: shippingSubsidyType,
        shipping_subsidy_apply_to: shippingSubsidyApplyTo,
        max_free_shipping_cost: maxFreeShippingCost,
        frenet_auto_send: autoSendFrenet,
      };

      const { error } = await supabase
        .from("stores")
        .update({ shipping_config: newConfig } as any)
        .eq("id", storeId);

      if (error) throw error;

      toast({
        title: "Configuração salva!",
        description: "A Frenet foi configurada com sucesso.",
      });
      setShowConfigDialog(false);
      onRefresh();
    } catch (error) {
      console.error("Error saving Frenet config:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a configuração.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!token.trim() || !originCep.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Configure o token e CEP de origem primeiro",
      });
      return;
    }

    setIsTesting(true);

    try {
      // Test with a sample CEP
      const { data, error } = await supabase.functions.invoke("frenet-calculate-shipping", {
        body: {
          storeId,
          destinationCep: "01310100", // Sample CEP (Av. Paulista)
          items: [{ weight: 0.5, length: 20, height: 10, width: 15, quantity: 1, price: 100 }],
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Conexão OK!",
          description: `Frenet retornou ${data.quotes?.length || 0} opções de frete.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro no teste",
          description: data?.error || "Não foi possível obter cotações",
        });
      }
    } catch (error) {
      console.error("Error testing Frenet:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao testar conexão com a Frenet.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from("stores")
        .update({ shipping_config: {} } as any)
        .eq("id", storeId);

      if (error) throw error;

      toast({
        title: "Desconectado",
        description: "A Frenet foi desconectada.",
      });
      onRefresh();
    } catch (error) {
      console.error("Error disconnecting Frenet:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível desconectar.",
      });
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      const newConfig: ShippingConfig = {
        ...shippingConfig,
        enabled: checked,
      };

      const { error } = await supabase
        .from("stores")
        .update({ shipping_config: newConfig } as any)
        .eq("id", storeId);

      if (error) throw error;

      toast({
        title: checked ? "Frenet ativada" : "Frenet desativada",
      });
      onRefresh();
    } catch (error) {
      console.error("Error toggling Frenet:", error);
    }
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-[#00A651] flex items-center justify-center">
                <Truck className="h-5 w-5 text-white" />
              </div>
              Frenet
            </CardTitle>
            <CardDescription>
              Cálculo de frete com múltiplas transportadoras
            </CardDescription>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2">
              <Label htmlFor="frenet-active" className="text-sm">Ativo</Label>
              <Switch
                id="frenet-active"
                checked={shippingConfig?.enabled ?? true}
                onCheckedChange={handleToggle}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Conectado
                </Badge>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Configuração:</p>
                <div className="text-muted-foreground space-y-0.5">
                  <p>• CEP de origem: {formatCep(shippingConfig.origin_cep || "")}</p>
                  <p>• Transportadoras: Correios, Jadlog, e outras</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
                  <Settings className="h-4 w-4 mr-1" />
                  Configurações
                </Button>
                <Button variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    "Testar conexão"
                  )}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://painel.frenet.com.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver painel
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={handleDisconnect}
                >
                  Desconectar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Configure seu token da Frenet para oferecer cálculo de frete automático com 
                múltiplas transportadoras. Crie sua conta em{" "}
                <a
                  href="https://www.frenet.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  frenet.com.br
                </a>
              </p>
              <Button onClick={() => setShowConfigDialog(true)}>
                <Key className="mr-2 h-4 w-4" />
                Configurar Frenet
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Frenet</DialogTitle>
            <DialogDescription>
              Informe seu token de acesso da Frenet. Você pode encontrá-lo em{" "}
              <a
                href="https://painel.frenet.com.br/integracao"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Painel Frenet → Integração
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Configuração básica - 2 colunas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frenet-token">Token de acesso</Label>
                <Input
                  id="frenet-token"
                  type="password"
                  placeholder="Seu token da Frenet"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin-cep">CEP de origem</Label>
                <Input
                  id="origin-cep"
                  placeholder="00000-000"
                  value={formatCep(originCep)}
                  onChange={(e) => setOriginCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  maxLength={9}
                />
                <p className="text-xs text-muted-foreground">
                  CEP de onde os produtos serão enviados
                </p>
              </div>
            </div>

            {/* Switches lado a lado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="frenet-enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
                <Label htmlFor="frenet-enabled">Ativar cálculo de frete</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="simplified-display"
                  checked={simplifiedDisplay}
                  onCheckedChange={setSimplifiedDisplay}
                />
                <div>
                  <Label htmlFor="simplified-display">Exibição Simplificada</Label>
                  <p className="text-xs text-muted-foreground">
                    Mostra apenas "Econômica" e "Rápida"
                  </p>
                </div>
              </div>
            </div>

            {/* Auto-send to Frenet */}
            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <Switch
                  id="auto-send-frenet"
                  checked={autoSendFrenet}
                  onCheckedChange={setAutoSendFrenet}
                />
                <div>
                  <Label htmlFor="auto-send-frenet" className="font-medium">Envio automático para Frenet</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quando o pagamento for confirmado, o pedido é enviado automaticamente para a Frenet. 
                    Basta acessar o painel da Frenet para pagar e imprimir a etiqueta.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Opções Inteligentes</p>
              
              {/* Subsídio e Teto lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subsídio de Frete</Label>
                  <div className="flex gap-2">
                    <Select
                      value={shippingSubsidyType}
                      onValueChange={(v) => setShippingSubsidyType(v as 'fixed' | 'percentage')}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">R$</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="shipping-subsidy"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={shippingSubsidyType === 'fixed' ? "0,00" : "0"}
                      value={shippingSubsidy || ""}
                      onChange={(e) => setShippingSubsidy(parseFloat(e.target.value) || 0)}
                      className="flex-1"
                    />
                  </div>
                  <Select
                    value={shippingSubsidyApplyTo}
                    onValueChange={(v) => setShippingSubsidyApplyTo(v as 'cheapest' | 'all')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cheapest">Aplicar só na opção mais barata</SelectItem>
                      <SelectItem value="all">Aplicar em todas as opções</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {shippingSubsidyApplyTo === 'cheapest'
                      ? "Desconto só na opção mais barata (protege margem nas opções rápidas)"
                      : "Desconto aplicado em todas as opções de frete"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-free-shipping-cost">Teto de Frete Grátis (R$)</Label>
                  <Input
                    id="max-free-shipping-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={maxFreeShippingCost || ""}
                    onChange={(e) => setMaxFreeShippingCost(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limite máximo que a loja paga no frete grátis
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
