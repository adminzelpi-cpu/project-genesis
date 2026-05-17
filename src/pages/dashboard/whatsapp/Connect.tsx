import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CheckCircle2, Loader2, Phone, Send, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useFacebookSDK } from "@/features/whatsapp/hooks/useFacebookSDK";
import { WhatsAppBenefits } from "@/features/whatsapp/components/WhatsAppBenefits";
import { WhatsAppLegalFooter } from "@/features/whatsapp/components/WhatsAppLegalFooter";
import { WhatsAppOnboardingChecklist } from "@/features/whatsapp/components/WhatsAppOnboardingChecklist";
import { WhatsAppHowItWorks } from "@/features/whatsapp/components/WhatsAppHowItWorks";
import { WhatsAppTabs } from "@/features/whatsapp/components/WhatsAppTabs";

interface PhoneNumber {
  id: string;
  phone_number_id: string;
  display_phone_number: string;
  verified_name: string | null;
  quality_rating: string | null;
  is_primary: boolean;
}

interface Connection {
  id: string;
  waba_id: string;
  status: string;
  connected_at: string;
}

interface ApprovedTemplate {
  id: string;
  name: string;
  language: string;
}

export default function WhatsAppConnect() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [phones, setPhones] = useState<PhoneNumber[]>([]);
  const { sdkReady, metaConfigId, sdkError } = useFacebookSDK();
  const [connecting, setConnecting] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const loadConnection = useCallback(async (sid: string) => {
    setLoading(true);
    const { data: conn } = await supabase
      .from("whatsapp_connections")
      .select("id, waba_id, status, created_at")
      .eq("store_id", sid)
      .maybeSingle();

    if (conn) {
      setConnection({
        id: conn.id,
        waba_id: conn.waba_id,
        status: conn.status,
        connected_at: conn.created_at,
      });
      const { data: ph } = await supabase
        .from("whatsapp_phone_numbers")
        .select("id, phone_number_id, display_phone_number, verified_name, quality_rating, is_primary")
        .eq("connection_id", conn.id)
        .order("is_primary", { ascending: false });
      setPhones(ph ?? []);
      const { data: tpl } = await supabase
        .from("whatsapp_templates")
        .select("id, name, language")
        .eq("store_id", sid)
        .eq("status", "APPROVED")
        .order("name", { ascending: true });
      const approved = (tpl ?? []) as ApprovedTemplate[];
      setTemplates(approved);
      setSelectedTemplate((current) => current || approved.find((t) => t.name === "boas_vindas")?.name || approved[0]?.name || "");
    } else {
      setConnection(null);
      setPhones([]);
      setTemplates([]);
      setSelectedTemplate("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("merchant_id", userRes.user.id)
        .maybeSingle();
      if (store) {
        setStoreId(store.id);
        await loadConnection(store.id);
      } else {
        setLoading(false);
      }
    })();
  }, [loadConnection]);

  const handleConnect = () => {
    console.log("[WA Connect] click", { sdkReady, hasFB: !!window.FB, storeId, hasConfigId: !!metaConfigId });
    if (!sdkReady || !window.FB) {
      toast.error(sdkError || "SDK do Meta ainda não carregou. Aguarde alguns segundos e tente de novo.");
      return;
    }
    if (!metaConfigId) {
      toast.error("Configuração do Meta não encontrada. Verifique o Config ID nas credenciais.");
      return;
    }
    if (!storeId) {
      toast.error("Loja não identificada");
      return;
    }

    // Detect popup blocker by opening a probe window first
    const probe = window.open("about:blank", "_blank", "width=1,height=1");
    if (!probe) {
      toast.error("Popup bloqueado pelo navegador. Permita popups para este site e tente novamente.");
      return;
    }
    probe.close();

    setConnecting(true);

    const sessionInfoListener = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = JSON.parse(event.data);
        console.log("[WA Connect] message from FB", data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          (window as any).__waSessionInfo = data.data;
        }
      } catch (_) { /* not JSON */ }
    };
    window.addEventListener("message", sessionInfoListener);

    // Safety timeout: if FB.login never calls back (popup closed silently / blocked), reset state
    const safetyTimeout = window.setTimeout(() => {
      console.warn("[WA Connect] FB.login timeout — no callback after 3 minutes");
      window.removeEventListener("message", sessionInfoListener);
      setConnecting(false);
      toast.error("Tempo esgotado. Verifique se o popup do Meta abriu e tente novamente.");
    }, 180000);

    console.log("[WA Connect] calling FB.login", { hasConfigId: !!metaConfigId });
    try {
      window.FB.login(
        (response: any) => {
          window.clearTimeout(safetyTimeout);
          window.removeEventListener("message", sessionInfoListener);
          console.log("[WA Connect] FB.login callback", response);
          const session = (window as any).__waSessionInfo;
          delete (window as any).__waSessionInfo;

          if (!response?.authResponse?.code) {
            setConnecting(false);
            if (response?.status === "not_authorized") {
              toast.error("Você cancelou a autorização no Meta.");
            } else if (response?.status === "unknown") {
              toast.error("Login não concluído. Tente novamente.");
            } else {
              toast.error("Conexão cancelada");
            }
            return;
          }

          (async () => {
            try {
              const { data, error } = await supabase.functions.invoke("whatsapp-exchange-token", {
                body: {
                  code: response.authResponse.code,
                  store_id: storeId,
                  waba_id: session?.waba_id,
                  phone_number_id: session?.phone_number_id,
                  business_id: session?.business_id,
                },
              });
              if (error || data?.error) throw new Error(error?.message || data?.error);
              toast.success("WhatsApp conectado!");
              await loadConnection(storeId);
            } catch (e: any) {
              console.error("[WA Connect] exchange error", e);
              toast.error(e.message || "Falha ao conectar");
            } finally {
              setConnecting(false);
            }
          })();
        },
        {
          config_id: metaConfigId,
          response_type: "code",
          override_default_response_type: true,
          extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
        }
      );
    } catch (e: any) {
      window.clearTimeout(safetyTimeout);
      window.removeEventListener("message", sessionInfoListener);
      console.error("[WA Connect] FB.login threw", e);
      toast.error("Erro ao abrir o login do Meta: " + (e?.message || "desconhecido"));
      setConnecting(false);
    }
  };

  const handleSendTest = async () => {
    if (!storeId || !testNumber.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send-test-message", {
        body: { store_id: storeId, to: testNumber.trim(), template_name: selectedTemplate || undefined },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success(`Mensagem de teste enviada${data?.template_name ? ` (${data.template_name})` : ""}!`);
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar");
    } finally {
      setSending(false);
    }
  };

  const handleDisconnect = async () => {
    if (!storeId) return;
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-disconnect", {
        body: { store_id: storeId },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success("Desconectado");
      setConnection(null);
      setPhones([]);
    } catch (e: any) {
      toast.error(e.message || "Falha ao desconectar");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
          <WhatsAppIcon className="h-7 w-7 text-[#25D366]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
          <p className="text-sm text-muted-foreground">
            Transforme o WhatsApp no canal mais produtivo da sua loja com IA e automações.
          </p>
        </div>
      </div>

      <WhatsAppTabs />

      {!connection ? (
        <Card>
          <CardHeader>
            <CardTitle>Conectar WhatsApp Business</CardTitle>
            <CardDescription>
              Conecte seu WhatsApp em menos de 2 minutos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <WhatsAppHowItWorks />

            <WhatsAppBenefits />

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Antes de começar</AlertTitle>
              <AlertDescription>
                Tenha em mãos um número de telefone <strong>que NÃO esteja em uso no app WhatsApp</strong> (comum ou Business). Pode ser fixo ou móvel.
              </AlertDescription>
            </Alert>

            <div className="border-t pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Pronto para começar?</p>
                <p className="text-xs text-muted-foreground">Você será redirecionado ao popup oficial da Meta em uma configuração guiada.</p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                {!sdkReady && <p className="text-xs text-muted-foreground">Carregando SDK...</p>}
                <Button
                  size="lg"
                  className="bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md"
                  disabled={!sdkReady || connecting}
                  onClick={handleConnect}
                >
                  {connecting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando...</>
                  ) : (
                    <><WhatsAppIcon className="mr-2 h-5 w-5" /> Conectar WhatsApp</>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground sm:text-right">Leva cerca de 2 minutos.</p>
              </div>
            </div>

            <WhatsAppLegalFooter />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#25D366]" />
                    Conta conectada
                  </CardTitle>
                  <CardDescription>WABA ID: <code className="text-xs">{connection.waba_id}</code></CardDescription>
                </div>
                <Badge variant={connection.status === "active" ? "default" : "secondary"}>
                  {connection.status === "active" ? "Ativa" : connection.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Números verificados</Label>
                <div className="mt-2 space-y-2">
                  {phones.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum número encontrado.</p>
                  )}
                  {phones.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{p.display_phone_number}</div>
                        {p.verified_name && (
                          <div className="text-xs text-muted-foreground">{p.verified_name}</div>
                        )}
                      </div>
                      {p.is_primary && <Badge variant="outline">Principal</Badge>}
                      {p.quality_rating && (
                        <Badge variant="secondary" className="text-xs">Qualidade: {p.quality_rating}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label htmlFor="test-number">Enviar mensagem de teste</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Envia um template aprovado para validar a integração real pelo WhatsApp.
                </p>
                {templates.length > 1 && (
                  <div className="mb-2">
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.name}>
                            {template.name} · {template.language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    id="test-number"
                    placeholder="Ex: 5511999999999"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                  />
                  <Button onClick={handleSendTest} disabled={sending || !testNumber.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="ml-2">Enviar</span>
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Trash2 className="mr-2 h-4 w-4" /> Desconectar
                </Button>
              </div>
            </CardContent>
          </Card>

          <WhatsAppOnboardingChecklist hasPhones={phones.length > 0} />
        </>
      )}
    </div>
  );
}
