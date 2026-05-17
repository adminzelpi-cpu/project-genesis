import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, ChevronDown, Rocket, Palette, Mail, Tag, BarChart3, Globe, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completedDescription: string;
  completed: boolean;
  route: string;
  actionText: string;
}

interface SuggestionItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
  actionText: string;
  completed: boolean;
}

interface SetupChecklistProps {
  storeId: string | undefined;
  userId: string | undefined;
}

export function SetupChecklist({ storeId, userId }: SetupChecklistProps) {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: "store",
      title: "Configure sua loja",
      description: "Defina o nome da sua loja e adicione uma descrição atraente para seus clientes.",
      completedDescription: "Sua loja está configurada! Você pode alterar as informações a qualquer momento nas configurações.",
      completed: false,
      route: "/dashboard/stores",
      actionText: "Configurar",
    },
    {
      id: "brand",
      title: "Configure sua marca",
      description: "Adicione o logo da sua loja, o favicon e as cores da marca. Esses elementos aparecem no cabeçalho, aba do navegador e em toda a loja.",
      completedDescription: "Sua identidade visual está configurada! O logo e favicon já aparecem na sua loja.",
      completed: false,
      route: "/dashboard/settings/brand",
      actionText: "Configurar",
    },
    {
      id: "products",
      title: "Adicione produtos",
      description: "Cadastre seus primeiros produtos com fotos de qualidade, descrições detalhadas e preços competitivos.",
      completedDescription: "Você já tem produtos cadastrados! Continue adicionando mais para aumentar seu catálogo.",
      completed: false,
      route: "/dashboard/products",
      actionText: "Adicionar",
    },
    {
      id: "shipping",
      title: "Configure o frete",
      description: "Defina os métodos de entrega disponíveis e calcule os custos de frete. Uma boa configuração de frete reduz o abandono de carrinho.",
      completedDescription: "Frete configurado! Seus clientes já podem calcular o frete no checkout.",
      completed: false,
      route: "/dashboard/settings/shipping",
      actionText: "Configurar",
    },
    {
      id: "payment",
      title: "Configure pagamentos",
      description: "Integre um gateway de pagamento como Mercado Pago para aceitar cartão, PIX e boleto na sua loja.",
      completedDescription: "Pagamentos configurados! Sua loja já pode receber pagamentos dos clientes.",
      completed: false,
      route: "/dashboard/settings/payments",
      actionText: "Configurar",
    },
  ]);

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([
    {
      id: "appearance",
      title: "Personalize a aparência",
      description: "Customize cores, fontes e layout da sua loja para criar uma identidade visual única.",
      route: "/dashboard/store/themes",
      icon: <Palette className="h-5 w-5" />,
      actionText: "Personalizar",
      completed: false,
    },
    {
      id: "pixels",
      title: "Configure pixels de rastreamento",
      description: "Conecte Meta Pixel, Google Analytics e outros para acompanhar suas campanhas.",
      route: "/dashboard/marketing/pixels",
      icon: <BarChart3 className="h-5 w-5" />,
      actionText: "Configurar",
      completed: false,
    },
    {
      id: "coupons",
      title: "Crie cupons de desconto",
      description: "Atraia mais clientes oferecendo cupons promocionais na sua loja.",
      route: "/dashboard/coupons",
      icon: <Tag className="h-5 w-5" />,
      actionText: "Criar",
      completed: false,
    },
    {
      id: "emails",
      title: "Configure e-mails automáticos",
      description: "Personalize o remetente e configure as notificações automáticas de pedidos e carrinho abandonado.",
      route: "/dashboard/settings/emails",
      icon: <Mail className="h-5 w-5" />,
      actionText: "Configurar",
      completed: false,
    },
    {
      id: "domain",
      title: "Conecte um domínio próprio",
      description: "Use seu próprio domínio (ex: minhaloja.com.br) para uma presença mais profissional.",
      route: "/dashboard/settings/domains",
      icon: <Globe className="h-5 w-5" />,
      actionText: "Conectar",
      completed: false,
    },
  ]);

  useEffect(() => {
    const checkCompletion = async () => {
      if (!storeId || !userId) {
        setLoading(false);
        return;
      }

      // Level 1 checks
      const [storeResult, productsResult, paymentResult] = await Promise.all([
        supabase.from("stores").select("name, description, logo_url, favicon_url, shipping_config, theme_primary_color, font_family").eq("id", storeId).maybeSingle(),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase.from("store_payment_gateways").select("id", { count: "exact", head: true }).eq("store_id", storeId).eq("is_active", true),
      ]);

      // Level 2 checks
      const [trackingResult, couponsResult, emailSettingsResult, domainsResult] = await Promise.all([
        supabase.from("store_tracking_config").select("meta_pixel_id, ga4_measurement_id, google_ads_id, tiktok_pixel_id, pinterest_tag_id").eq("store_id", storeId).maybeSingle(),
        supabase.from("coupons").select("id", { count: "exact", head: true }).eq("store_id", storeId),
        supabase.from("store_email_settings").select("sender_name, reply_to_email").eq("store_id", storeId).maybeSingle(),
        supabase.from("custom_domains").select("id", { count: "exact", head: true }).eq("store_id", storeId),
      ]);

      // Update level 1
      const updatedChecklist = [...checklist];
      // Store info (name + description)
      if (storeResult.data?.name && storeResult.data?.description) {
        updatedChecklist[0].completed = true;
      }
      // Brand identity (logo)
      if (storeResult.data?.logo_url) {
        updatedChecklist[1].completed = true;
      }
      // Products
      if ((productsResult.count || 0) > 0) {
        updatedChecklist[2].completed = true;
      }
      // Shipping
      const shippingConfig = storeResult.data?.shipping_config as any;
      if (shippingConfig?.frenet_token && shippingConfig?.origin_cep) {
        updatedChecklist[3].completed = true;
      }
      // Payment
      if ((paymentResult.count || 0) > 0) {
        updatedChecklist[4].completed = true;
      }
      setChecklist(updatedChecklist);

      // Auto-expand first incomplete item
      const firstIncomplete = updatedChecklist.find(item => !item.completed);
      if (firstIncomplete) {
        setOpenItems([firstIncomplete.id]);
      }

      // Update level 2
      const updatedSuggestions = [...suggestions];

      // Aparência: customized if theme_primary_color or font_family is set
      if (storeResult.data?.theme_primary_color || storeResult.data?.font_family) {
        updatedSuggestions[0].completed = true;
      }

      // Pixels: any pixel ID configured
      if (trackingResult.data) {
        const t = trackingResult.data;
        if (t.meta_pixel_id || t.ga4_measurement_id || t.google_ads_id || t.tiktok_pixel_id || t.pinterest_tag_id) {
          updatedSuggestions[1].completed = true;
        }
      }

      // Cupons: at least one coupon
      if ((couponsResult.count || 0) > 0) {
        updatedSuggestions[2].completed = true;
      }

      // E-mails: sender_name customized
      if (emailSettingsResult.data?.sender_name || emailSettingsResult.data?.reply_to_email) {
        updatedSuggestions[3].completed = true;
      }

      // Domínio: at least one custom domain
      if ((domainsResult.count || 0) > 0) {
        updatedSuggestions[4].completed = true;
      }

      setSuggestions(updatedSuggestions);
      setLoading(false);
    };

    checkCompletion();
  }, [storeId, userId]);

  const completedTasks = checklist.filter(item => item.completed).length;
  const progress = (completedTasks / checklist.length) * 100;
  const allLevel1Completed = completedTasks === checklist.length;
  const pendingSuggestions = suggestions.filter(s => !s.completed);

  const toggleItem = (itemId: string) => {
    setOpenItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [itemId]
    );
  };

  // Re-check and auto-expand next incomplete when navigating back
  useEffect(() => {
    if (!loading && !allLevel1Completed) {
      const firstIncomplete = checklist.find(item => !item.completed);
      if (firstIncomplete && !openItems.includes(firstIncomplete.id)) {
        const hasAnyOpen = openItems.some(id => checklist.find(c => c.id === id));
        if (!hasAnyOpen) {
          setOpenItems([firstIncomplete.id]);
        }
      }
    }
  }, [checklist, loading]);

  if (loading) return null;

  // All level 1 completed — show level 2 suggestions (only pending ones)
  if (allLevel1Completed && pendingSuggestions.length > 0) {
    return (
      <Card className="border-green-500/30 bg-gradient-to-r from-green-500/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Sua loja está pronta para vender! 🎉</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Confira sugestões para potencializar suas vendas:
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingSuggestions.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => navigate(item.route)}
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium group-hover:text-primary transition-colors">{item.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // All level 1 + level 2 completed — show nothing (just metrics below)
  if (allLevel1Completed && pendingSuggestions.length === 0) {
    return null;
  }

  // Level 1 checklist
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configure sua loja</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete essas etapas para começar a vender
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completedTasks}/{checklist.length}</div>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />

        <div className="space-y-2">
          {checklist.map((item) => (
            <Collapsible
              key={item.id}
              open={openItems.includes(item.id)}
              onOpenChange={() => toggleItem(item.id)}
            >
              <div className={`rounded-lg border-2 transition-all ${
                item.completed
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-border'
              }`}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-accent/50 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.completed
                          ? 'bg-green-500 text-white'
                          : 'border-2 border-muted-foreground'
                      }`}>
                        {item.completed && <Check className="w-4 h-4" />}
                      </div>
                      <h3 className={`font-medium text-left ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {item.title}
                      </h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${
                      openItems.includes(item.id) ? 'rotate-180' : ''
                    }`} />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0">
                    <div className="pl-9 flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground flex-1">
                        {item.completed ? item.completedDescription : item.description}
                      </p>
                      {item.route && (
                        <Button
                          onClick={() => navigate(item.route)}
                          size="sm"
                          variant={item.completed ? "outline" : "default"}
                        >
                          {item.completed ? "Ver" : item.actionText}
                        </Button>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
