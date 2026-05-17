import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, MessageSquare, Phone, Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { WhatsAppTabs } from "@/features/whatsapp/components/WhatsAppTabs";
import { useRequireConnection } from "@/features/whatsapp/hooks/useStoreId";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  contact_phone: string;
  contact_name: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
}
interface Message {
  id: string;
  direction: "inbound" | "outbound";
  body: string | null;
  type: string;
  template_name: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}

function MessageStatus({ m }: { m: Message }) {
  if (m.direction !== "outbound") return null;
  const base = "h-3.5 w-3.5 inline-block ml-1 -mb-0.5";
  if (m.status === "failed") {
    return (
      <span title={m.error_message || `Falha${m.error_code ? ` (${m.error_code})` : ""}`}>
        <AlertCircle className={cn(base, "text-destructive")} />
      </span>
    );
  }
  if (m.status === "read" || m.read_at) {
    return <span title="Lida"><CheckCheck className={cn(base, "text-[#34B7F1]")} /></span>;
  }
  if (m.status === "delivered" || m.delivered_at) {
    return <span title="Entregue no aparelho"><CheckCheck className={cn(base, "text-muted-foreground")} /></span>;
  }
  if (m.status === "sent") {
    const sentAt = m.sent_at ? new Date(m.sent_at).getTime() : Date.now();
    const stuck = Date.now() - sentAt > 10 * 60 * 1000;
    if (stuck) {
      return (
        <span title="Aceita pela Meta, mas sem confirmação de entrega há mais de 10 min. Pode ter sido descartada (número fora do allowlist em modo Development, WABA sem método de pagamento, ou usuário bloqueou).">
          <AlertCircle className={cn(base, "text-amber-500")} />
        </span>
      );
    }
    return <span title="Enviada (aguardando entrega)"><Check className={cn(base, "text-muted-foreground/50")} /></span>;
  }
  return <span title="Pendente"><Clock className={cn(base, "text-muted-foreground")} /></span>;
}

function Window24h({ messages }: { messages: Message[] }) {
  const lastInbound = [...messages].reverse().find(m => m.direction === "inbound");
  if (!lastInbound) {
    return (
      <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30" title="Sem mensagem do cliente. Mensagens livres serão rejeitadas — use um template aprovado.">
        Janela fechada · só template
      </span>
    );
  }
  const startedAt = new Date(lastInbound.sent_at || lastInbound.created_at).getTime();
  const remaining = 24 * 60 * 60 * 1000 - (Date.now() - startedAt);
  if (remaining <= 0) {
    return (
      <span className="text-[10px] px-2 py-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30" title="Janela de 24h expirou. Use um template aprovado.">
        Janela fechada · só template
      </span>
    );
  }
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const label = hours >= 1 ? `${hours}h restantes` : `${mins}min restantes`;
  return (
    <span className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30" title="Janela de 24h aberta — mensagens livres permitidas.">
      {label}
    </span>
  );
}

export default function WhatsAppInbox() {
  const { storeId, loading: storeLoading } = useRequireConnection();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_conversations")
        .select("id, contact_phone, contact_name, last_message_at, last_message_preview, unread_count")
        .eq("store_id", storeId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);
      setConversations(data ?? []);
    })();
  }, [storeId]);

  // Realtime: novas conversas/mensagens
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`wa-inbox-${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations", filter: `store_id=eq.${storeId}` },
        async () => {
          const { data } = await supabase
            .from("whatsapp_conversations")
            .select("id, contact_phone, contact_name, last_message_at, last_message_preview, unread_count")
            .eq("store_id", storeId)
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .limit(100);
          setConversations(data ?? []);
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          const m: any = payload.new;
          if (m.conversation_id === activeId) {
            setMessages((prev) => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          }
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          const m: any = payload.new;
          if (m.conversation_id === activeId) {
            setMessages((prev) => prev.map(x => x.id === m.id ? { ...x, ...m } : x));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId, activeId]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    (async () => {
      const { data } = await supabase
        .from("whatsapp_messages")
        .select("id, direction, body, type, template_name, status, sent_at, created_at, delivered_at, read_at, error_code, error_message")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true })
        .limit(500);
      setMessages((data ?? []) as Message[]);
      setLoadingMsgs(false);
      // mark as read
      await supabase.from("whatsapp_conversations")
        .update({ unread_count: 0 }).eq("id", activeId);
    })();
  }, [activeId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const filtered = conversations.filter(c =>
    !search ||
    (c.contact_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    c.contact_phone.includes(search)
  );

  const handleSend = async () => {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: { conversation_id: activeId, body: text },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar");
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  if (storeLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
        <p className="text-sm text-muted-foreground">Atenda seus clientes em tempo real.</p>
      </div>
      <WhatsAppTabs />

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Lista */}
        <Card className="flex flex-col overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Nenhuma conversa ainda.
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full text-left px-3 py-3 border-b hover:bg-muted/50 transition-colors",
                  activeId === c.id && "bg-muted"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm truncate">{c.contact_name || c.contact_phone}</div>
                  {c.unread_count > 0 && (
                    <span className="text-xs bg-[#25D366] text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.last_message_preview || "—"}</div>
                {c.last_message_at && (
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ptBR })}
                  </div>
                )}
              </button>
            ))}
          </ScrollArea>
        </Card>

        {/* Chat */}
        <Card className="flex flex-col overflow-hidden">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <Phone className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Selecione uma conversa
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm">
                      {conversations.find(c => c.id === activeId)?.contact_name ||
                       conversations.find(c => c.id === activeId)?.contact_phone}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {conversations.find(c => c.id === activeId)?.contact_phone}
                    </div>
                  </div>
                  <Window24h messages={messages} />
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
                {loadingMsgs && <Skeleton className="h-16 w-2/3" />}
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                        m.direction === "outbound"
                          ? "bg-[#25D366]/15 text-foreground"
                          : "bg-background border"
                      )}
                    >
                      {m.type === "template" ? (
                        <div>
                          <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
                            Template: {m.template_name}
                          </div>
                          {m.body}
                        </div>
                      ) : (
                        m.body || <span className="italic text-muted-foreground">({m.type})</span>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1 text-right">
                        {new Date(m.sent_at || m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}<MessageStatus m={m} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={sending || !draft.trim()} className="bg-[#25D366] hover:bg-[#20bd5a] text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="px-3 pb-2 text-[10px] text-muted-foreground">
                Mensagens livres só funcionam dentro da janela de 24h após a última mensagem do cliente. Fora disso, use um template.
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
