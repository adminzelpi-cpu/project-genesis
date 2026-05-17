import { useState } from "react";
import { SettingsLayout } from "@/components/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmailSettings, type EmailSettings } from "@/features/emails";
import { useEmailTemplates, EmailType, emailTypesMeta } from "@/features/emails/hooks/useEmailTemplates";
import { AbandonedCartEmailEditor } from "@/features/emails/components";
import { TransactionalEmailEditor } from "@/features/emails/components/TransactionalEmailEditor";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { Mail, Package, CreditCard, Loader2, UserPlus, Truck, ShoppingCart, Settings } from "lucide-react";

const emailCategories = {
  order: {
    title: "E-mails de Pedido",
    icon: Package,
    description: "Notificações sobre o status do pedido",
    types: ["order_confirmed", "order_preparing", "order_shipped", "order_delivered", "order_cancelled"] as EmailType[],
  },
  payment: {
    title: "E-mails de Pagamento",
    icon: CreditCard,
    description: "Notificações sobre pagamentos",
    types: ["payment_confirmed", "payment_failed", "boleto_generated", "pix_generated", "pix_expired", "refund_processed"] as EmailType[],
  },
  customer: {
    title: "E-mails de Cliente",
    icon: UserPlus,
    description: "Notificações relacionadas à conta do cliente",
    types: ["welcome"] as EmailType[],
  },
  logistics: {
    title: "E-mails de Logística",
    icon: Truck,
    description: "Notificações sobre entrega e rastreamento",
    types: ["tracking_code", "invoice_generated"] as EmailType[],
  },
};

// Map email types to settings keys for enable/disable
const emailTypeToSettingsKey: Record<EmailType, keyof EmailSettings> = {
  order_confirmed: "order_confirmed_enabled",
  order_preparing: "order_preparing_enabled",
  order_shipped: "order_shipped_enabled",
  order_delivered: "order_delivered_enabled",
  order_cancelled: "order_cancelled_enabled",
  payment_confirmed: "payment_confirmed_enabled",
  payment_failed: "payment_failed_enabled",
  boleto_generated: "boleto_generated_enabled",
  pix_generated: "pix_generated_enabled",
  pix_expired: "pix_expired_enabled",
  welcome: "welcome_enabled",
  tracking_code: "tracking_code_enabled",
  refund_processed: "refund_processed_enabled",
  invoice_generated: "invoice_generated_enabled",
};

export default function SettingsEmailsPage() {
  const { settings, isLoading, updateSettings, isUpdating } = useEmailSettings();
  const { templates, isLoading: isLoadingTemplates, saveTemplate, deleteTemplate, isSaving, getTemplate } = useEmailTemplates();
  const { store: activeStore } = useActiveStore();
  const [localSettings, setLocalSettings] = useState<Partial<EmailSettings>>({});
  const [activeTab, setActiveTab] = useState("general");

  const handleToggle = (key: keyof EmailSettings, value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    updateSettings({ [key]: value });
  };

  const handleInputChange = (key: keyof EmailSettings, value: string | number) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleInputBlur = (key: keyof EmailSettings) => {
    if (localSettings[key] !== undefined) {
      updateSettings({ [key]: localSettings[key] });
    }
  };

  const getValue = (key: keyof EmailSettings) => {
    if (localSettings[key] !== undefined) {
      return localSettings[key];
    }
    return settings?.[key];
  };

  const handleAbandonedCartSave = (emailNum: 1 | 2 | 3, data: {
    enabled: boolean;
    delay: number;
    subject: string;
    preheader: string;
    body: string;
  }) => {
    updateSettings({
      [`abandoned_cart_enabled_${emailNum}`]: data.enabled,
      [`abandoned_cart_delay_${emailNum}`]: data.delay,
      [`abandoned_cart_subject_${emailNum}`]: data.subject,
      [`abandoned_cart_preheader_${emailNum}`]: data.preheader,
      [`abandoned_cart_body_${emailNum}`]: data.body,
    } as Partial<EmailSettings>);
  };

  if (isLoading || isLoadingTemplates) {
    return (
      <SettingsLayout
        title="E-mails Transacionais"
        description="Configure os e-mails automáticos enviados aos clientes"
        showSaveButton={false}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      title="E-mails Transacionais"
      description="Configure os e-mails automáticos enviados aos clientes"
      showSaveButton={false}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4 hidden sm:block" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="order" className="gap-2">
            <Package className="h-4 w-4 hidden sm:block" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4 hidden sm:block" />
            Pagamento
          </TabsTrigger>
          <TabsTrigger value="logistics" className="gap-2">
            <Truck className="h-4 w-4 hidden sm:block" />
            Logística
          </TabsTrigger>
          <TabsTrigger value="customer" className="gap-2">
            <UserPlus className="h-4 w-4 hidden sm:block" />
            Cliente
          </TabsTrigger>
          <TabsTrigger value="abandoned" className="gap-2">
            <ShoppingCart className="h-4 w-4 hidden sm:block" />
            Carrinho
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>
                Personalize o remetente dos e-mails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sender_name">Nome do Remetente</Label>
                  <Input
                    id="sender_name"
                    placeholder="Nome da sua loja"
                    value={(getValue("sender_name") as string) || ""}
                    onChange={(e) => handleInputChange("sender_name", e.target.value)}
                    onBlur={() => handleInputBlur("sender_name")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Aparece como remetente do e-mail
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reply_to_email">E-mail de Resposta</Label>
                  <Input
                    id="reply_to_email"
                    type="email"
                    placeholder="contato@sualoja.com"
                    value={(getValue("reply_to_email") as string) || ""}
                    onChange={(e) => handleInputChange("reply_to_email", e.target.value)}
                    onBlur={() => handleInputBlur("reply_to_email")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quando o cliente responder, vai para este e-mail
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Nota:</strong> Os e-mails são enviados através do nosso servidor. Para usar um domínio personalizado, 
                  configure seu domínio no Resend.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Enable/Disable All */}
          <Card>
            <CardHeader>
              <CardTitle>Ativar/Desativar E-mails</CardTitle>
              <CardDescription>
                Controle rápido de quais tipos de e-mail estão ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(emailCategories).map(([categoryKey, category]) => (
                  <div key={categoryKey}>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      {category.title}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ml-6">
                      {category.types.map((emailType) => {
                        const meta = emailTypesMeta[emailType];
                        const settingsKey = emailTypeToSettingsKey[emailType];
                        return (
                          <div key={emailType} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
                            <div className="min-w-0">
                              <Label htmlFor={emailType} className="text-sm font-medium truncate">
                                {meta.label}
                              </Label>
                            </div>
                            <Switch
                              id={emailType}
                              checked={getValue(settingsKey) as boolean ?? true}
                              onCheckedChange={(checked) => handleToggle(settingsKey, checked)}
                              disabled={isUpdating}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}

                {/* Special toggles */}
                <div>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Configurações Especiais
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 ml-6">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="min-w-0">
                        <Label className="text-sm font-medium">Envio automático de rastreio</Label>
                        <p className="text-xs text-muted-foreground">Envia quando código é preenchido</p>
                      </div>
                      <Switch
                        checked={getValue("tracking_code_auto_send_enabled") as boolean ?? true}
                        onCheckedChange={(checked) => handleToggle("tracking_code_auto_send_enabled", checked)}
                        disabled={isUpdating}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="min-w-0">
                        <Label className="text-sm font-medium">Recuperação de carrinho</Label>
                        <p className="text-xs text-muted-foreground">E-mails de carrinho abandonado</p>
                      </div>
                      <Switch
                        checked={getValue("abandoned_cart_enabled") as boolean ?? true}
                        onCheckedChange={(checked) => handleToggle("abandoned_cart_enabled", checked)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order Emails Tab */}
        <TabsContent value="order" className="space-y-4">
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {emailCategories.order.title}
              </CardTitle>
              <CardDescription>{emailCategories.order.description}</CardDescription>
            </CardHeader>
          </Card>
          {emailCategories.order.types.map((emailType) => (
            <TransactionalEmailEditor
              key={emailType}
              emailType={emailType}
              template={getTemplate(emailType)}
              onSave={saveTemplate}
              isSaving={isSaving}
              onReset={() => deleteTemplate(emailType)}
              storeName={activeStore?.name || "Sua Loja"}
              primaryColor={activeStore?.theme_primary_color || "#4F46E5"}
              logoUrl={activeStore?.logo_url}
            />
          ))}
        </TabsContent>

        {/* Payment Emails Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {emailCategories.payment.title}
              </CardTitle>
              <CardDescription>{emailCategories.payment.description}</CardDescription>
            </CardHeader>
          </Card>
          {emailCategories.payment.types.map((emailType) => (
            <TransactionalEmailEditor
              key={emailType}
              emailType={emailType}
              template={getTemplate(emailType)}
              onSave={saveTemplate}
              isSaving={isSaving}
              onReset={() => deleteTemplate(emailType)}
              storeName={activeStore?.name || "Sua Loja"}
              primaryColor={activeStore?.theme_primary_color || "#4F46E5"}
              logoUrl={activeStore?.logo_url}
            />
          ))}
        </TabsContent>

        {/* Logistics Emails Tab */}
        <TabsContent value="logistics" className="space-y-4">
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {emailCategories.logistics.title}
              </CardTitle>
              <CardDescription>{emailCategories.logistics.description}</CardDescription>
            </CardHeader>
          </Card>
          {emailCategories.logistics.types.map((emailType) => (
            <TransactionalEmailEditor
              key={emailType}
              emailType={emailType}
              template={getTemplate(emailType)}
              onSave={saveTemplate}
              isSaving={isSaving}
              onReset={() => deleteTemplate(emailType)}
              storeName={activeStore?.name || "Sua Loja"}
              primaryColor={activeStore?.theme_primary_color || "#4F46E5"}
              logoUrl={activeStore?.logo_url}
            />
          ))}
        </TabsContent>

        {/* Customer Emails Tab */}
        <TabsContent value="customer" className="space-y-4">
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {emailCategories.customer.title}
              </CardTitle>
              <CardDescription>{emailCategories.customer.description}</CardDescription>
            </CardHeader>
          </Card>
          {emailCategories.customer.types.map((emailType) => (
            <TransactionalEmailEditor
              key={emailType}
              emailType={emailType}
              template={getTemplate(emailType)}
              onSave={saveTemplate}
              isSaving={isSaving}
              onReset={() => deleteTemplate(emailType)}
              storeName={activeStore?.name || "Sua Loja"}
              primaryColor={activeStore?.theme_primary_color || "#4F46E5"}
              logoUrl={activeStore?.logo_url}
            />
          ))}
        </TabsContent>

        {/* Abandoned Cart Tab */}
        <TabsContent value="abandoned" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recuperação de Carrinho Abandonado
              </CardTitle>
              <CardDescription>
                Envie lembretes automáticos para clientes que não finalizaram a compra. 
                Configure cada e-mail individualmente com textos personalizados e prévia em tempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="abandoned_cart_enabled" className="text-base font-medium">
                    Ativar recuperação de carrinho
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativo, e-mails serão enviados automaticamente conforme configurado abaixo
                  </p>
                </div>
                <Switch
                  id="abandoned_cart_enabled"
                  checked={getValue("abandoned_cart_enabled") as boolean ?? true}
                  onCheckedChange={(checked) => handleToggle("abandoned_cart_enabled", checked)}
                  disabled={isUpdating}
                />
              </div>

              {getValue("abandoned_cart_enabled") && (
                <div className="space-y-4">
                  <AbandonedCartEmailEditor
                    number={1}
                    enabled={(getValue("abandoned_cart_enabled_1") as boolean) ?? true}
                    delay={(getValue("abandoned_cart_delay_1") as number) || 60}
                    subject={(getValue("abandoned_cart_subject_1") as string) || ""}
                    preheader={(getValue("abandoned_cart_preheader_1") as string) || ""}
                    body={(getValue("abandoned_cart_body_1") as string) || ""}
                    onSave={(data) => handleAbandonedCartSave(1, data)}
                    isUpdating={isUpdating}
                    storeName={activeStore?.name || "Sua Loja"}
                    primaryColor={activeStore?.theme_primary_color || "#4F46E5"}
                    logoUrl={activeStore?.logo_url}
                  />

                  <AbandonedCartEmailEditor
                    number={2}
                    enabled={(getValue("abandoned_cart_enabled_2") as boolean) ?? true}
                    delay={(getValue("abandoned_cart_delay_2") as number) || 1440}
                    subject={(getValue("abandoned_cart_subject_2") as string) || ""}
                    preheader={(getValue("abandoned_cart_preheader_2") as string) || ""}
                    body={(getValue("abandoned_cart_body_2") as string) || ""}
                    onSave={(data) => handleAbandonedCartSave(2, data)}
                    isUpdating={isUpdating}
                    storeName={activeStore?.name || "Sua Loja"}
                    primaryColor={activeStore?.theme_primary_color || "#4F46E5"}
                    logoUrl={activeStore?.logo_url}
                  />

                  <AbandonedCartEmailEditor
                    number={3}
                    enabled={(getValue("abandoned_cart_enabled_3") as boolean) ?? true}
                    delay={(getValue("abandoned_cart_delay_3") as number) || 4320}
                    subject={(getValue("abandoned_cart_subject_3") as string) || ""}
                    preheader={(getValue("abandoned_cart_preheader_3") as string) || ""}
                    body={(getValue("abandoned_cart_body_3") as string) || ""}
                    onSave={(data) => handleAbandonedCartSave(3, data)}
                    isUpdating={isUpdating}
                    storeName={activeStore?.name || "Sua Loja"}
                    primaryColor={activeStore?.theme_primary_color || "#4F46E5"}
                    logoUrl={activeStore?.logo_url}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  );
}
