import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, AlertCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppTabs } from "@/features/whatsapp/components/WhatsAppTabs";
import { useRequireConnection } from "@/features/whatsapp/hooks/useStoreId";

interface Template { id: string; name: string; language: string; status: string; components: any; }

export default function WhatsAppNewCampaign() {
  const { storeId, loading: storeLoading } = useRequireConnection();
  const nav = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [audience, setAudience] = useState<"customers" | "abandoned_carts">("customers");
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_templates")
        .select("id, name, language, status, components")
        .eq("store_id", storeId)
        .eq("status", "APPROVED")
        .order("name");
      setTemplates((data ?? []) as Template[]);
      setLoadingTpl(false);
    })();
  }, [storeId]);

  // Estimate audience size
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      if (audience === "customers") {
        const { count } = await supabase.from("customers")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId).not("telefone", "is", null);
        setAudienceCount(count ?? 0);
      } else {
        const { count } = await supabase.from("abandoned_carts")
          .select("*", { count: "exact", head: true })
          .eq("store_id", storeId).is("recovered_at", null)
          .gte("abandoned_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
        setAudienceCount(count ?? 0);
      }
    })();
  }, [storeId, audience]);

  const tpl = templates.find(t => t.id === templateId);
  const body = tpl?.components.find((c: any) => c.type === "BODY");

  const handleSend = async () => {
    if (!storeId || !name || !templateId) return;
    if (!confirm(`Enviar para ~${audienceCount ?? "?"} contatos? A Meta cobrará por mensagem entregue.`)) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send-campaign", {
        body: { store_id: storeId, name, template_id: templateId, audience_type: audience },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success(`Campanha disparada! Enviadas: ${data.sent} · Falhas: ${data.failed}`);
      nav("/dashboard/whatsapp/campaigns");
    } catch (e: any) {
      toast.error(e.message || "Falha ao disparar");
    } finally { setSending(false); }
  };

  if (storeLoading) {
    return <div className="container mx-auto p-6 max-w-3xl"><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
        <p className="text-sm text-muted-foreground">Nova campanha de mensagens.</p>
      </div>
      <WhatsAppTabs />

      <Button variant="ghost" size="sm" onClick={() => nav("/dashboard/whatsapp/campaigns")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da campanha</CardTitle>
          <CardDescription>Configure e dispare uma campanha usando um template aprovado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Nome interno</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Black Friday — clientes ativos" />
          </div>

          <div>
            <Label>Template *</Label>
            {loadingTpl ? <Skeleton className="h-10 w-full" /> : templates.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum template aprovado. Vá em <strong>Templates</strong> para criar e aguardar aprovação da Meta.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Escolha um template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.language})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tpl && (
              <div className="mt-2 rounded-md bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Pré-visualização do corpo</div>
                {body?.text ?? "—"}
                <p className="text-[10px] text-muted-foreground mt-2">
                  As variáveis <code>{"{{1}}"}</code> e <code>{"{{2}}"}</code> serão preenchidas com o primeiro nome do cliente e o nome da loja.
                </p>
              </div>
            )}
          </div>

          <div>
            <Label>Audiência</Label>
            <RadioGroup value={audience} onValueChange={(v: any) => setAudience(v)} className="mt-2 grid gap-2">
              <label className="flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="customers" className="mt-1" />
                <div>
                  <div className="text-sm font-medium">Todos os clientes com telefone</div>
                  <div className="text-xs text-muted-foreground">Clientes da loja com número cadastrado.</div>
                </div>
              </label>
              <label className="flex items-start gap-2 rounded border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="abandoned_carts" className="mt-1" />
                <div>
                  <div className="text-sm font-medium">Carrinhos abandonados (7 dias)</div>
                  <div className="text-xs text-muted-foreground">Clientes que abandonaram o checkout recentemente.</div>
                </div>
              </label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground mt-2">
              Estimativa: <strong>{audienceCount ?? "—"}</strong> contatos
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Cobrança:</strong> a Meta cobra cada conversa diretamente no cartão associado à sua Conta Comercial. A Zelpi não cobra pelas mensagens.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={sending || !name || !templateId} className="bg-[#25D366] hover:bg-[#20bd5a] text-white">
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Disparar agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
