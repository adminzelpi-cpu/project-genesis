import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Eye, Clock, BarChart3, MousePointerClick, ShoppingCart, MessageSquare, Upload, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ChatSettings() {
  const { store } = useActiveStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch or create settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["chat-settings-admin", store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const { data, error } = await supabase
        .from("store_chat_settings")
        .select("*")
        .eq("store_id", store.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ["chat-conversations", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("store_id", store.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Fetch chat analytics
  const { data: analytics } = useQuery({
    queryKey: ["chat-analytics", store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("chat_analytics")
        .select("event_type")
        .eq("store_id", store.id)
        .gte("created_at", thirtyDaysAgo);
      
      if (error) throw error;
      
      const events = data || [];
      const opened = events.filter(e => e.event_type === "opened").length;
      const firstMessage = events.filter(e => e.event_type === "first_message").length;
      const messages = events.filter(e => e.event_type === "message_sent").length;
      const quickActions = events.filter(e => e.event_type === "quick_action_click").length;
      const productsAdded = events.filter(e => e.event_type === "product_added").length;
      const checkouts = events.filter(e => e.event_type === "checkout_redirect").length;
      
      return {
        opened,
        firstMessage,
        interactionRate: opened > 0 ? Math.round((firstMessage / opened) * 100) : 0,
        messages,
        quickActions,
        productsAdded,
        checkouts,
      };
    },
    enabled: !!store?.id,
  });

  const [formState, setFormState] = useState<{
    is_enabled: boolean;
    assistant_name: string;
    welcome_message: string;
    primary_color: string;
    tone: string;
    proactivity_level: string;
    proactive_delay_seconds: number;
    whatsapp_fallback: string;
    avatar_url: string | null;
  } | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when settings load
  const form = formState || {
    is_enabled: settings?.is_enabled ?? false,
    assistant_name: settings?.assistant_name ?? "Assistente",
    welcome_message: settings?.welcome_message ?? "Olá! 👋 Como posso te ajudar?",
    primary_color: settings?.primary_color ?? "#000000",
    tone: settings?.tone ?? "casual",
    proactivity_level: settings?.proactivity_level ?? "medium",
    proactive_delay_seconds: settings?.proactive_delay_seconds ?? 30,
    whatsapp_fallback: settings?.whatsapp_fallback ?? "",
    avatar_url: (settings as any)?.avatar_url ?? null,
  };

  const updateField = (field: string, value: any) => {
    setFormState({ ...form, [field]: value });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error("Loja não encontrada");

      const payload = {
        store_id: store.id,
        is_enabled: form.is_enabled,
        assistant_name: form.assistant_name,
        welcome_message: form.welcome_message,
        primary_color: form.primary_color,
        tone: form.tone,
        proactivity_level: form.proactivity_level,
        proactive_delay_seconds: form.proactive_delay_seconds,
        whatsapp_fallback: form.whatsapp_fallback || null,
        avatar_url: form.avatar_url || null,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from("store_chat_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("store_chat_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-settings-admin"] });
      toast({ title: "Configurações salvas!", description: "O chat foi atualizado." });
      setFormState(null);
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <SettingsLayout title="Chat Inteligente" showSaveButton={false}>
        <p className="text-muted-foreground">Carregando...</p>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      title="Chat Inteligente"
      description="Configure o assistente de vendas IA da sua loja"
      onSave={() => saveMutation.mutate()}
      isSaving={saveMutation.isPending}
    >
      {/* Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Ativar Chat na Loja
          </CardTitle>
          <CardDescription>
            O assistente IA aparecerá como um widget flutuante para seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_enabled}
              onCheckedChange={(v) => updateField("is_enabled", v)}
            />
            <span className="text-sm">
              {form.is_enabled ? "Chat ativo" : "Chat desativado"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Personalização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da assistente</Label>
            <Input
              value={form.assistant_name}
              onChange={(e) => updateField("assistant_name", e.target.value)}
              placeholder="Ex: Ana, Assistente Virtual"
            />
          </div>
          <div className="space-y-2">
            <Label>Avatar da assistente</Label>
            <div className="flex items-center gap-4">
              <div
                className="relative h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => avatarInputRef.current?.click()}
              >
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (store as any)?.favicon_url ? (
                  <img src={(store as any).favicon_url} alt="Favicon" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {form.assistant_name.charAt(0).toUpperCase()}
                  </span>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {form.avatar_url ? "Trocar" : "Enviar imagem"}
                </Button>
                {form.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => updateField("avatar_url", null)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Remover
                  </Button>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !store?.id) return;
                  setAvatarUploading(true);
                  try {
                    const ext = file.name.split(".").pop() || "png";
                    const path = `${store.id}/chat-avatar.${ext}`;
                    const { error: uploadError } = await supabase.storage
                      .from("store-assets")
                      .upload(path, file, { upsert: true });
                    if (uploadError) throw uploadError;
                    const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(path);
                    updateField("avatar_url", urlData.publicUrl + "?t=" + Date.now());
                    toast({ title: "Avatar enviado!" });
                  } catch (err: any) {
                    toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
                  } finally {
                    setAvatarUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Se não enviar, será usada a favicon da loja. Sem favicon, aparece a inicial do nome.
            </p>
          </div>
          <div className="rounded-lg border border-dashed p-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              💡 A mensagem de boas-vindas é gerada automaticamente pela IA com base na página que o cliente está visitando (home, produto, carrinho) e no histórico de conversas anteriores.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Cor do chat</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => updateField("primary_color", e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border"
              />
              <Input
                value={form.primary_color}
                onChange={(e) => updateField("primary_color", e.target.value)}
                className="w-32"
                placeholder="#000000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Comportamento da IA</CardTitle>
          <CardDescription>Configure como a assistente se comporta nas conversas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tom de voz</Label>
            <Select value={form.tone} onValueChange={(v) => updateField("tone", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual e amigável</SelectItem>
                <SelectItem value="formal">Formal e educado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível de proatividade em vendas</Label>
            <Select value={form.proactivity_level} onValueChange={(v) => updateField("proactivity_level", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixo — só responde quando perguntado</SelectItem>
                <SelectItem value="medium">Médio — sugere quando oportuno</SelectItem>
                <SelectItem value="high">Alto — sempre tenta vender</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-dashed p-3 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              ⏱️ O chat aparece automaticamente após <strong>25s de inatividade</strong> ou <strong>45s na página de produto</strong> (o que acontecer primeiro). No mini-carrinho, aparece após <strong>12s</strong>. Esses tempos são otimizados para não ser invasivo.
            </p>
          </div>
          <div className="space-y-2">
            <Label>WhatsApp para atendimento humano</Label>
            <Input
              value={form.whatsapp_fallback}
              onChange={(e) => {
                const numbers = e.target.value.replace(/\D/g, '');
                if (numbers.length <= 2) {
                  updateField("whatsapp_fallback", numbers);
                } else if (numbers.length <= 7) {
                  updateField("whatsapp_fallback", `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`);
                } else {
                  updateField("whatsapp_fallback", `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`);
                }
              }}
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              Se não preencher, será usado o WhatsApp cadastrado nas configurações da loja. Aparece quando a IA não consegue ajudar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Métricas do Chat (últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <MessageCircle className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{analytics.opened}</p>
                <p className="text-xs text-muted-foreground">Aberturas</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{analytics.interactionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de interação</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <MousePointerClick className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{analytics.quickActions}</p>
                <p className="text-xs text-muted-foreground">Ações rápidas</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{analytics.productsAdded}</p>
                <p className="text-xs text-muted-foreground">Produtos adicionados</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {analytics.messages} mensagens trocadas · {analytics.checkouts} redirecionamentos ao checkout
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Conversas Recentes
          </CardTitle>
          <CardDescription>
            {conversations?.length || 0} conversa(s) registrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!conversations?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma conversa ainda. Ative o chat e aguarde os clientes interagirem.
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {conversations.map((conv: any) => {
                  const msgs = Array.isArray(conv.messages) ? conv.messages : [];
                  const lastUserMsg = [...msgs].reverse().find((m: any) => m.role === "user");
                  const msgCount = msgs.length;

                  return (
                    <div
                      key={conv.id}
                      className="border rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(conv.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {msgCount} msg
                        </span>
                      </div>
                      {lastUserMsg && (
                        <p className="text-sm truncate">
                          <span className="font-medium">Cliente:</span>{" "}
                          {(lastUserMsg as any).content}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
