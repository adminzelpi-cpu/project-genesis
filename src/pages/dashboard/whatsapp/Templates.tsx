import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppTabs } from "@/features/whatsapp/components/WhatsAppTabs";
import { useRequireConnection } from "@/features/whatsapp/hooks/useStoreId";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: any;
  rejected_reason: string | null;
  synced_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-[#25D366]/15 text-[#1a8245] border-[#25D366]/30",
  PENDING: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/30",
  PAUSED: "bg-muted text-muted-foreground",
};

export default function WhatsAppTemplates() {
  const { storeId, loading: storeLoading } = useRequireConnection();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");

  const load = async () => {
    if (!storeId) return;
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_templates")
      .select("id, name, language, category, status, components, rejected_reason, synced_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setTemplates((data ?? []) as Template[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [storeId]);

  const handleSync = async () => {
    if (!storeId) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-sync-templates", { body: { store_id: storeId } });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success(`${data.synced} templates sincronizados`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Falha ao sincronizar");
    } finally { setSyncing(false); }
  };

  const handleCreate = async () => {
    if (!storeId || !name || !bodyText) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-create-template", {
        body: { store_id: storeId, name, category, body_text: bodyText, header_text: headerText || undefined, footer_text: footerText || undefined },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success("Template enviado para aprovação da Meta");
      setOpen(false);
      setName(""); setBodyText(""); setHeaderText(""); setFooterText("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Falha ao criar");
    } finally { setCreating(false); }
  };

  if (storeLoading) {
    return <div className="container mx-auto p-6 max-w-4xl"><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
        <p className="text-sm text-muted-foreground">Gerencie os modelos aprovados pela Meta.</p>
      </div>
      <WhatsAppTabs />

      <div className="flex justify-between items-center pt-2">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-xs text-muted-foreground">Modelos aprovados pela Meta para uso em campanhas e notificações automáticas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Sincronizar</span>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#25D366] hover:bg-[#20bd5a] text-white">
                <Plus className="h-4 w-4 mr-2" /> Novo template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar template</DialogTitle>
                <DialogDescription>O template será enviado para aprovação da Meta. Pode levar alguns minutos.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome técnico</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} placeholder="ex: boas_vindas" />
                  <p className="text-[10px] text-muted-foreground mt-1">Apenas letras minúsculas, números e _.</p>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing (campanhas)</SelectItem>
                      <SelectItem value="UTILITY">Utilidade (status, recibos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cabeçalho (opcional)</Label>
                  <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} maxLength={60} />
                </div>
                <div>
                  <Label>Corpo *</Label>
                  <Textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={4} maxLength={1024}
                    placeholder="Use {{1}}, {{2}} para variáveis. Ex: Olá {{1}}, sua loja {{2}} tem novidades!" />
                </div>
                <div>
                  <Label>Rodapé (opcional)</Label>
                  <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} maxLength={60} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={creating || !name || !bodyText}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Enviar para aprovação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? <Skeleton className="h-32 w-full" /> : templates.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
            Nenhum template ainda. Sincronize com a Meta ou crie um novo.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => {
            const body = (t.components ?? []).find((c: any) => c.type === "BODY");
            return (
              <Card key={t.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <CardDescription className="text-xs">{t.category} · {t.language}</CardDescription>
                    </div>
                    <Badge variant="outline" className={STATUS_COLORS[t.status] ?? ""}>
                      {t.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm">
                  <div className="rounded bg-muted/50 p-3 whitespace-pre-wrap">{body?.text ?? "—"}</div>
                  {t.rejected_reason && (
                    <p className="text-xs text-destructive mt-2">Motivo da rejeição: {t.rejected_reason}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
