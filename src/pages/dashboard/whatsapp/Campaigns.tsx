import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone } from "lucide-react";
import { WhatsAppTabs } from "@/features/whatsapp/components/WhatsAppTabs";
import { useRequireConnection } from "@/features/whatsapp/hooks/useStoreId";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  name: string;
  template_name_snapshot: string;
  audience_type: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sending: "Enviando",
  completed: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

export default function WhatsAppCampaigns() {
  const { storeId, loading: storeLoading } = useRequireConnection();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_campaigns")
        .select("id, name, template_name_snapshot, audience_type, status, total_recipients, sent_count, delivered_count, read_count, failed_count, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      setCampaigns(data ?? []);
      setLoading(false);
    })();
  }, [storeId]);

  if (storeLoading) {
    return <div className="container mx-auto p-6 max-w-4xl"><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
        <p className="text-sm text-muted-foreground">Crie campanhas para sua base de clientes.</p>
      </div>
      <WhatsAppTabs />

      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-lg font-semibold">Campanhas</h2>
          <p className="text-xs text-muted-foreground">
            Disparos em massa usando templates aprovados.{" "}
            <span className="text-muted-foreground/80">As mensagens são cobradas pela Meta diretamente no seu cartão.</span>
          </p>
        </div>
        <Button asChild className="bg-[#25D366] hover:bg-[#20bd5a] text-white">
          <Link to="/dashboard/whatsapp/campaigns/new"><Plus className="h-4 w-4 mr-2" /> Nova campanha</Link>
        </Button>
      </div>

      {loading ? <Skeleton className="h-32 w-full" /> : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto mb-2 opacity-40" />
            Nenhuma campanha ainda. Crie a primeira!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Template: <code>{c.template_name_snapshot}</code> · {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <Badge variant={c.status === "completed" ? "default" : "secondary"}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <Metric label="Total" value={c.total_recipients} />
                  <Metric label="Enviadas" value={c.sent_count} />
                  <Metric label="Lidas" value={c.read_count} />
                  <Metric label="Falhas" value={c.failed_count} tone={c.failed_count > 0 ? "warn" : "neutral"} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warn" }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className={`text-lg font-semibold ${tone === "warn" && value > 0 ? "text-destructive" : ""}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
