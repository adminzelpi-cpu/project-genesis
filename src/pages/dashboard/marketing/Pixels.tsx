import { useState } from "react";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { useTrackingConfig } from "@/features/tracking";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Save, Eye, EyeOff, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const platformConfig = {
  meta: {
    name: "Meta (Facebook/Instagram)",
    icon: "M",
    color: "#1877F2",
    description: "Pixel e API de Conversões para Facebook e Instagram Ads",
  },
  google: {
    name: "Google",
    icon: "G",
    color: "#4285F4",
    description: "Google Ads e Google Analytics 4",
  },
  tiktok: {
    name: "TikTok",
    icon: "T",
    color: "#000000",
    description: "Pixel e Events API para TikTok Ads",
  },
  pinterest: {
    name: "Pinterest",
    icon: "P",
    color: "#E60023",
    description: "Tag de conversão para Pinterest Ads",
  },
};

export default function Pixels() {
  const { store, isLoading: storeLoading } = useActiveStore();
  const { config, isLoading: configLoading, saveConfig, isSaving } = useTrackingConfig(store?.id);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const loading = storeLoading || configLoading;

  // Initialize form data from config
  const getFieldValue = (field: string) => {
    if (field in formData) return formData[field];
    return config?.[field as keyof typeof config] ?? "";
  };

  const getBooleanValue = (field: string) => {
    if (field in formData) return formData[field];
    return config?.[field as keyof typeof config] ?? false;
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveConfig(formData);
    setHasChanges(false);
    setFormData({});
  };

  const toggleShowToken = (field: string) => {
    setShowTokens((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const isEnabled = (platform: string) => {
    if (platform === "google") {
      // Google card aggregates GA4 + Google Ads. Considered ON if any of them is ON.
      return getBooleanValue("ga4_enabled") || getBooleanValue("google_ads_enabled");
    }
    return getBooleanValue(`${platform}_enabled`);
  };

  const setPlatformEnabled = (platform: string, checked: boolean) => {
    if (platform === "google") {
      // Toggle whichever sub-channels are configured.
      const ga4Configured = !!getFieldValue("ga4_measurement_id");
      const adsConfigured = !!getFieldValue("google_ads_id");
      if (ga4Configured) handleChange("ga4_enabled", checked);
      if (adsConfigured) handleChange("google_ads_enabled", checked);
      return;
    }
    handleChange(`${platform}_enabled`, checked);
  };

  const hasConfig = (platform: string) => {
    switch (platform) {
      case "meta":
        return !!getFieldValue("meta_pixel_id");
      case "google":
        return !!getFieldValue("ga4_measurement_id") || !!getFieldValue("google_ads_id");
      case "tiktok":
        return !!getFieldValue("tiktok_pixel_id");
      case "pinterest":
        return !!getFieldValue("pinterest_tag_id");
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pixels e Tracking</h1>
          <p className="text-muted-foreground">
            Configure os pixels de conversão e tracking para otimizar suas campanhas de ads
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        )}
      </div>

      {/* Platform Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(platformConfig).map(([key, platform]) => {
          const enabled = isEnabled(key);
          const configured = hasConfig(key);
          
          return (
            <Card key={key} className="overflow-hidden">
              <div className="h-1" style={{ backgroundColor: enabled ? platform.color : "#e5e7eb" }} />
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: platform.color }}
                    >
                      {platform.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{platform.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {configured ? (
                          <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Configurado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => setPlatformEnabled(key, checked)}
                    disabled={!configured}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="meta" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="meta">Meta</TabsTrigger>
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          <TabsTrigger value="pinterest">Pinterest</TabsTrigger>
        </TabsList>

        {/* Meta Tab */}
        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "#1877F2" }}>
                  M
                </div>
                Meta Pixel & Conversions API
              </CardTitle>
              <CardDescription>
                Configure o Pixel e a API de Conversões para Facebook e Instagram Ads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="meta_pixel_id">
                    Pixel ID
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Encontre em: Gerenciador de Eventos → Fontes de Dados → Pixel
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="meta_pixel_id"
                    name="meta_pixel_id_field"
                    placeholder="123456789012345"
                    value={getFieldValue("meta_pixel_id")}
                    onChange={(e) => handleChange("meta_pixel_id", e.target.value)}
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta_access_token">
                    Access Token (CAPI)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Token para API de Conversões. Gere em: Gerenciador de Eventos → Configurações
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="relative">
                    <Input
                      id="meta_access_token"
                      name="meta_access_token_field"
                      type={showTokens.meta_access_token ? "text" : "password"}
                      placeholder="EAAxxxxxxxxxx..."
                      value={getFieldValue("meta_access_token")}
                      onChange={(e) => handleChange("meta_access_token", e.target.value)}
                      className="pr-10"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => toggleShowToken("meta_access_token")}
                    >
                      {showTokens.meta_access_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta_test_event_code">
                  Código de Evento de Teste (opcional)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Use para testar eventos antes de ir ao ar. Encontre em: Gerenciador de Eventos → Testar eventos
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="meta_test_event_code"
                  placeholder="TEST12345"
                  value={getFieldValue("meta_test_event_code")}
                  onChange={(e) => handleChange("meta_test_event_code", e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="meta_enabled"
                  checked={getBooleanValue("meta_enabled")}
                  onCheckedChange={(checked) => handleChange("meta_enabled", checked)}
                  disabled={!getFieldValue("meta_pixel_id")}
                />
                <Label htmlFor="meta_enabled">Ativar tracking do Meta</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Tab */}
        <TabsContent value="google">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "#4285F4" }}>
                    G
                  </div>
                  Google Analytics 4
                </CardTitle>
                <CardDescription>
                  Configure o GA4 para análise de comportamento e eventos e-commerce
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ga4_measurement_id">
                    Measurement ID (GA4)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Formato: G-XXXXXXXXXX. Encontre em: Administrador → Fluxos de dados → Web
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="ga4_measurement_id"
                    placeholder="G-XXXXXXXXXX"
                    value={getFieldValue("ga4_measurement_id")}
                    onChange={(e) => handleChange("ga4_measurement_id", e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ga4_enabled"
                    checked={getBooleanValue("ga4_enabled")}
                    onCheckedChange={(checked) => handleChange("ga4_enabled", checked)}
                    disabled={!getFieldValue("ga4_measurement_id")}
                  />
                  <Label htmlFor="ga4_enabled">Ativar Google Analytics 4</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Google Ads</CardTitle>
                <CardDescription>
                  Configure o tracking de conversões para Google Ads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="google_ads_id">
                      Conversion ID
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Formato: AW-XXXXXXXXX. Encontre em: Ferramentas → Medição → Conversões
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="google_ads_id"
                      placeholder="AW-123456789"
                      value={getFieldValue("google_ads_id")}
                      onChange={(e) => handleChange("google_ads_id", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="google_ads_conversion_label">
                      Conversion Label (Purchase)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Label da conversão de compra. Ex: AbCdEfGhIjKlMn
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="google_ads_conversion_label"
                      placeholder="AbCdEfGhIjKlMn"
                      value={getFieldValue("google_ads_conversion_label")}
                      onChange={(e) => handleChange("google_ads_conversion_label", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="google_ads_enabled"
                    checked={getBooleanValue("google_ads_enabled")}
                    onCheckedChange={(checked) => handleChange("google_ads_enabled", checked)}
                    disabled={!getFieldValue("google_ads_id")}
                  />
                  <Label htmlFor="google_ads_enabled">Ativar Google Ads</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TikTok Tab */}
        <TabsContent value="tiktok">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "#000000" }}>
                  T
                </div>
                TikTok Pixel & Events API
              </CardTitle>
              <CardDescription>
                Configure o Pixel e a Events API para TikTok Ads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tiktok_pixel_id">
                    Pixel ID
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Encontre em: TikTok Ads Manager → Assets → Events
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="tiktok_pixel_id"
                    name="tiktok_pixel_id_field"
                    placeholder="CXXXXXXXXX"
                    value={getFieldValue("tiktok_pixel_id")}
                    onChange={(e) => handleChange("tiktok_pixel_id", e.target.value)}
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok_access_token">
                    Access Token (Events API)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Token para Events API. Gere em: Events → Manage → Settings
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="relative">
                    <Input
                      id="tiktok_access_token"
                      name="tiktok_access_token_field"
                      type={showTokens.tiktok_access_token ? "text" : "password"}
                      placeholder="Token..."
                      value={getFieldValue("tiktok_access_token")}
                      onChange={(e) => handleChange("tiktok_access_token", e.target.value)}
                      className="pr-10"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => toggleShowToken("tiktok_access_token")}
                    >
                      {showTokens.tiktok_access_token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok_test_event_code">
                  Test Event Code (opcional)
                </Label>
                <Input
                  id="tiktok_test_event_code"
                  placeholder="TEST12345"
                  value={getFieldValue("tiktok_test_event_code")}
                  onChange={(e) => handleChange("tiktok_test_event_code", e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="tiktok_enabled"
                  checked={getBooleanValue("tiktok_enabled")}
                  onCheckedChange={(checked) => handleChange("tiktok_enabled", checked)}
                  disabled={!getFieldValue("tiktok_pixel_id")}
                />
                <Label htmlFor="tiktok_enabled">Ativar tracking do TikTok</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pinterest Tab */}
        <TabsContent value="pinterest">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: "#E60023" }}>
                  P
                </div>
                Pinterest Tag
              </CardTitle>
              <CardDescription>
                Configure a Tag de conversão para Pinterest Ads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pinterest_tag_id">
                  Tag ID
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Encontre em: Pinterest Business → Conversions → Tag manager
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="pinterest_tag_id"
                  name="pinterest_tag_id_field"
                  placeholder="123456789012"
                  value={getFieldValue("pinterest_tag_id")}
                  onChange={(e) => handleChange("pinterest_tag_id", e.target.value)}
                  className="max-w-xs"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pinterest_access_token">
                  Access Token (Conversions API)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Gere em: Pinterest Business → Apps → Conversion Access Token
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="pinterest_access_token"
                  name="pinterest_access_token_field"
                  type="password"
                  placeholder="pina_..."
                  value={getFieldValue("pinterest_access_token")}
                  onChange={(e) => handleChange("pinterest_access_token", e.target.value)}
                  className="max-w-xs"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Permite enviar eventos server-side para melhor atribuição.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="pinterest_enabled"
                  checked={getBooleanValue("pinterest_enabled")}
                  onCheckedChange={(checked) => handleChange("pinterest_enabled", checked)}
                  disabled={!getFieldValue("pinterest_tag_id")}
                />
                <Label htmlFor="pinterest_enabled">Ativar tracking do Pinterest</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>Opções que afetam todos os pixels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="exclude_shipping"
              checked={getBooleanValue("exclude_shipping_from_value")}
              onCheckedChange={(checked) => handleChange("exclude_shipping_from_value", checked)}
            />
            <Label htmlFor="exclude_shipping">
              Excluir valor do frete do valor de conversão
              <span className="text-muted-foreground text-sm ml-2">
                (Envia apenas o valor dos produtos nos eventos de compra)
              </span>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Events Info */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Rastreados</CardTitle>
          <CardDescription>
            Os seguintes eventos são enviados automaticamente para todas as plataformas ativas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { event: "PageView", desc: "Visualização de página", where: "Todas as páginas" },
              { event: "ViewContent", desc: "Visualização de produto", where: "Página de produto" },
              { event: "ViewCategory", desc: "Visualização de categoria", where: "Página de categoria" },
              { event: "AddToCart", desc: "Adicionar ao carrinho", where: "Botão adicionar" },
              { event: "InitiateCheckout", desc: "Iniciar checkout", where: "Página de checkout" },
              { event: "AddPaymentInfo", desc: "Info de pagamento", where: "Seleção de método" },
              { event: "Purchase", desc: "Compra concluída", where: "Pagamento aprovado" },
            ].map(({ event, desc, where }) => (
              <div key={event} className="p-3 border rounded-lg">
                <p className="font-medium text-sm">{event}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
                <p className="text-xs text-muted-foreground mt-1">→ {where}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
