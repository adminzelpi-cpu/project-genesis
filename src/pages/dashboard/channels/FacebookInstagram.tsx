import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import {
  CheckCircle2, Link2, Store, Megaphone, Settings2,
  RefreshCw, AlertTriangle, ArrowLeft, Instagram, Building2,
  BarChart3, ShoppingBag, Eye, MousePointerClick,
} from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebook } from "@fortawesome/free-brands-svg-icons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

interface MetaConnection {
  id: string;
  store_id: string;
  meta_user_name: string;
  token_expires_at: string;
  is_active: boolean;
  configuration_status: string;
  connected_at: string;
  access_token: string;
  selected_page: any;
  selected_ad_account: any;
  selected_pixel: any;
  selected_catalog: any;
  selected_instagram_account: any;
  selected_business_manager: any;
  available_pages: any[];
  available_ad_accounts: any[];
  available_pixels: any[];
  available_catalogs: any[];
  available_instagram_accounts: any[];
  available_business_managers: any[];
}

export default function FacebookInstagram() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);
  const { store } = useActiveStore();

  // Selection state
  const [selPage, setSelPage] = useState<string>("");
  const [selAdAccount, setSelAdAccount] = useState<string>("");
  const [selPixel, setSelPixel] = useState<string>("");
  const [selCatalog, setSelCatalog] = useState<string>("");
  const [selInstagram, setSelInstagram] = useState<string>("");
  const [selBM, setSelBM] = useState<string>("");

  const { data: connection, isLoading } = useQuery({
    queryKey: ["meta-connection", store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const { data } = await (supabase as any)
        .from("meta_connections")
        .select("*")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .maybeSingle();
      return data as MetaConnection | null;
    },
    enabled: !!store?.id,
  });

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    // If this page loaded inside a popup (from OAuth callback), close it
    if ((success || error) && window.opener) {
      window.close();
      return;
    }

    if (success === "true") {
      toast({ title: "Conectado!", description: "Agora selecione os ativos que deseja usar." });
      queryClient.invalidateQueries({ queryKey: ["meta-connection"] });
    } else if (error) {
      const messages: Record<string, string> = {
        token_exchange: "Falha ao trocar código por token.",
        db_error: "Erro ao salvar conexão.",
        missing_params: "Parâmetros ausentes.",
        server_config: "Erro de configuração do servidor.",
      };
      toast({ title: "Erro na conexão", description: messages[error] || `Erro: ${error}`, variant: "destructive" });
    }
  }, [searchParams]);

  const handleConnect = async () => {
    if (!store?.id) return;
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-oauth-start", {
        body: { storeId: store.id, redirectUrl: window.location.origin + "/dashboard/channels/facebook-instagram" },
      });
      if (error) throw error;
      if (data?.authUrl) {
        // Open in popup window like other platforms do
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          data.authUrl,
          "meta-oauth",
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        // Poll for popup close and check for success
        const pollTimer = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(pollTimer);
            setIsConnecting(false);
            // Refetch connection data after popup closes
            queryClient.invalidateQueries({ queryKey: ["meta-connection"] });
          }
        }, 500);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Não foi possível iniciar a conexão.", variant: "destructive" });
      setIsConnecting(false);
    }
  };

  const saveSelectionMutation = useMutation({
    mutationFn: async () => {
      if (!connection) throw new Error("No connection");
      const pages = connection.available_pages || [];
      const adAccounts = connection.available_ad_accounts || [];
      const pixels = connection.available_pixels || [];
      const catalogs = connection.available_catalogs || [];
      const igAccounts = connection.available_instagram_accounts || [];
      const bms = connection.available_business_managers || [];

      const selectedPixelObj = pixels.find((p: any) => p.id === selPixel) || null;

      // 1. Save selections to meta_connections
      const { error } = await (supabase as any)
        .from("meta_connections")
        .update({
          selected_page: pages.find((p: any) => p.id === selPage) || null,
          selected_ad_account: adAccounts.find((a: any) => a.id === selAdAccount) || null,
          selected_pixel: selectedPixelObj,
          selected_catalog: catalogs.find((c: any) => c.id === selCatalog) || null,
          selected_instagram_account: igAccounts.find((i: any) => i.id === selInstagram) || null,
          selected_business_manager: bms.find((b: any) => b.id === selBM) || null,
          configuration_status: "configured",
        })
        .eq("id", connection.id);
      if (error) throw error;

      // 2. Sync Pixel + access_token to store_tracking_config for browser tracking + CAPI
      if (selectedPixelObj && store?.id) {
        const trackingUpdate: Record<string, any> = {
          store_id: store.id,
          meta_pixel_id: selectedPixelObj.id,
          meta_access_token: connection.access_token !== "revoked" ? connection.access_token : null,
          meta_enabled: true,
        };

        // Upsert: try update first, insert if not exists
        const { data: existing } = await (supabase as any)
          .from("store_tracking_config")
          .select("id")
          .eq("store_id", store.id)
          .maybeSingle();

        if (existing) {
          await (supabase as any)
            .from("store_tracking_config")
            .update({
              meta_pixel_id: trackingUpdate.meta_pixel_id,
              meta_access_token: trackingUpdate.meta_access_token,
              meta_enabled: true,
            })
            .eq("store_id", store.id);
        } else {
          await (supabase as any)
            .from("store_tracking_config")
            .insert(trackingUpdate);
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Configuração salva!", description: "Pixel e tracking sincronizados automaticamente." });
      queryClient.invalidateQueries({ queryKey: ["meta-connection"] });
    },
    onError: (err: any) => {
      console.error("Save selection error:", err);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error("Store not found");
      const { error } = await (supabase as any)
        .from("meta_connections")
        .update({ is_active: false, access_token: "revoked" })
        .eq("store_id", store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Desconectado", description: "Conexão com Meta removida." });
      queryClient.invalidateQueries({ queryKey: ["meta-connection"] });
    },
  });

  const reconfigureMutation = useMutation({
    mutationFn: async () => {
      if (!connection) throw new Error("No connection");
      const { error } = await (supabase as any)
        .from("meta_connections")
        .update({ configuration_status: "pending_selection" })
        .eq("id", connection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta-connection"] });
    },
  });

  const isConnected = !!connection && connection.is_active;
  const isPendingSelection = isConnected && connection.configuration_status === "pending_selection";
  const isConfigured = isConnected && connection.configuration_status === "configured";
  const tokenExpired = connection?.token_expires_at ? new Date(connection.token_expires_at) < new Date() : false;

  const initials = connection?.meta_user_name
    ? connection.meta_user_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard/integrations" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Facebook & Instagram</h1>
          <p className="text-muted-foreground">Conecte para gerenciar Pixel, Catálogo, Páginas e Contas de Anúncios</p>
        </div>
      </div>

      {/* Connection Card */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-[#1877F2]" />
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center">
              <FontAwesomeIcon icon={faFacebook} className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Meta (Facebook & Instagram)
                {isConfigured && !tokenExpired && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Configurado
                  </Badge>
                )}
                {isPendingSelection && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                    <AlertTriangle className="h-3 w-3 mr-1" />Selecione os ativos
                  </Badge>
                )}
                {isConnected && tokenExpired && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />Token expirado
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Gerencie Pixel, Catálogo de Produtos, Páginas e Contas de Anúncios</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />Carregando...
            </div>
          ) : !isConnected ? (
            <NotConnectedState isConnecting={isConnecting} storeId={store?.id} onConnect={handleConnect} />
          ) : (
            <ConnectedUserBar
              initials={initials}
              connection={connection}
              tokenExpired={tokenExpired}
              onReconnect={handleConnect}
              onDisconnect={() => disconnectMutation.mutate()}
              isDisconnecting={disconnectMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      {/* Asset Selection (pending) */}
      {isPendingSelection && (
        <AssetSelectionCard
          connection={connection}
          selPage={selPage} setSelPage={setSelPage}
          selAdAccount={selAdAccount} setSelAdAccount={setSelAdAccount}
          selPixel={selPixel} setSelPixel={setSelPixel}
          selCatalog={selCatalog} setSelCatalog={setSelCatalog}
          selInstagram={selInstagram} setSelInstagram={setSelInstagram}
          selBM={selBM} setSelBM={setSelBM}
          onSave={() => saveSelectionMutation.mutate()}
          isSaving={saveSelectionMutation.isPending}
        />
      )}

      {/* Connected Dashboard */}
      {isConfigured && (
        <ConfiguredDashboard connection={connection} onReconfigure={() => reconfigureMutation.mutate()} />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function NotConnectedState({ isConnecting, storeId, onConnect }: { isConnecting: boolean; storeId?: string; onConnect: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ao conectar com a Meta, a <strong>Zelpi</strong> poderá gerenciar seu Pixel,
          Catálogo de Produtos e Conta de Anúncios. Você mantém o controle total.
        </p>
      </div>
      <Button onClick={onConnect} disabled={isConnecting || !storeId} className="w-full sm:w-auto bg-[#1877F2] hover:bg-[#1877F2]/90 text-white">
        {isConnecting ? (
          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Conectando...</>
        ) : (
          <><FontAwesomeIcon icon={faFacebook} className="h-4 w-4 mr-2" />Continuar com Facebook</>
        )}
      </Button>
    </div>
  );
}

function ConnectedUserBar({ initials, connection, tokenExpired, onReconnect, onDisconnect, isDisconnecting }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
          <span className="text-white font-semibold text-sm">{initials}</span>
        </div>
        <div>
          <p className="font-medium">{connection.meta_user_name || "Conta Meta"}</p>
          <p className="text-sm text-muted-foreground">
            Conectado em {new Date(connection.connected_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {tokenExpired && (
          <Button size="sm" onClick={onReconnect}><RefreshCw className="h-4 w-4 mr-1" />Reconectar</Button>
        )}
        <Button variant="outline" size="sm" onClick={onDisconnect} disabled={isDisconnecting}>Desconectar</Button>
      </div>
    </div>
  );
}

function AssetSelectionCard({
  connection, selPage, setSelPage, selAdAccount, setSelAdAccount,
  selPixel, setSelPixel, selCatalog, setSelCatalog,
  selInstagram, setSelInstagram, selBM, setSelBM,
  onSave, isSaving,
}: any) {
  const pages = connection.available_pages || [];
  const adAccounts = connection.available_ad_accounts || [];
  const pixels = connection.available_pixels || [];
  const catalogs = connection.available_catalogs || [];
  const igAccounts = connection.available_instagram_accounts || [];
  const bms = connection.available_business_managers || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings2 className="h-5 w-5" />Selecione os Ativos
        </CardTitle>
        <CardDescription>Escolha quais ativos da Meta serão usados nesta loja</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {bms.length > 0 && (
          <AssetSelect
            label="Gerenciador de Negócios"
            description="Gerencia todas as contas e ativos da Meta"
            icon={<Building2 className="h-4 w-4" />}
            items={bms}
            value={selBM}
            onChange={setSelBM}
            nameKey="name"
          />
        )}
        {pages.length > 0 && (
          <AssetSelect
            label="Página do Facebook"
            description="Usada para publicar produtos e responder mensagens"
            icon={<Store className="h-4 w-4" />}
            items={pages}
            value={selPage}
            onChange={setSelPage}
            nameKey="name"
          />
        )}
        {igAccounts.length > 0 && (
          <AssetSelect
            label="Conta do Instagram"
            description="Instagram Shopping e publicações de produtos"
            icon={<Instagram className="h-4 w-4" />}
            items={igAccounts}
            value={selInstagram}
            onChange={setSelInstagram}
            nameKey="username"
          />
        )}
        {adAccounts.length > 0 && (
          <AssetSelect
            label="Conta de Anúncios"
            description="Para criar e gerenciar campanhas de anúncios"
            icon={<Megaphone className="h-4 w-4" />}
            items={adAccounts}
            value={selAdAccount}
            onChange={setSelAdAccount}
            nameKey="name"
          />
        )}
        {pixels.length > 0 && (
          <AssetSelect
            label="Pixel"
            description="Rastreamento de conversões e remarketing"
            icon={<Eye className="h-4 w-4" />}
            items={pixels}
            value={selPixel}
            onChange={setSelPixel}
            nameKey="name"
          />
        )}
        {catalogs.length > 0 && (
          <AssetSelect
            label="Catálogo de Produtos"
            description="Feed de produtos para anúncios dinâmicos e Instagram Shopping"
            icon={<ShoppingBag className="h-4 w-4" />}
            items={catalogs}
            value={selCatalog}
            onChange={setSelCatalog}
            nameKey="name"
          />
        )}

        <Button onClick={onSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : "Salvar Configuração"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AssetSelect({ label, description, icon, items, value, onChange, nameKey }: {
  label: string; description: string; icon: React.ReactNode;
  items: any[]; value: string; onChange: (v: string) => void; nameKey: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Selecione ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item: any) => (
            <SelectItem key={item.id} value={item.id}>
              {item[nameKey] || item.name || item.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ConfiguredDashboard({ connection, onReconfigure }: { connection: MetaConnection; onReconfigure: () => void }) {
  const assets = [
    {
      icon: <Building2 className="h-5 w-5 text-muted-foreground" />,
      title: "Gerenciador de Negócios",
      purpose: "Gerencia todas as contas e ativos da Meta",
      asset: connection.selected_business_manager,
      nameKey: "name",
    },
    {
      icon: <Store className="h-5 w-5 text-muted-foreground" />,
      title: "Página do Facebook",
      purpose: "Publicar produtos, responder mensagens e rodar anúncios",
      asset: connection.selected_page,
      nameKey: "name",
    },
    {
      icon: <Instagram className="h-5 w-5 text-muted-foreground" />,
      title: "Conta do Instagram",
      purpose: "Instagram Shopping e publicações de produtos",
      asset: connection.selected_instagram_account,
      nameKey: "username",
    },
    {
      icon: <Megaphone className="h-5 w-5 text-muted-foreground" />,
      title: "Conta de Anúncios",
      purpose: "Criar e gerenciar campanhas",
      asset: connection.selected_ad_account,
      nameKey: "name",
    },
    {
      icon: <Eye className="h-5 w-5 text-muted-foreground" />,
      title: "Pixel",
      purpose: "Rastreamento de conversões e remarketing",
      asset: connection.selected_pixel,
      nameKey: "name",
    },
    {
      icon: <ShoppingBag className="h-5 w-5 text-muted-foreground" />,
      title: "Catálogo de Produtos",
      purpose: "Feed de produtos para anúncios dinâmicos",
      asset: connection.selected_catalog,
      nameKey: "name",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" />Ativos Vinculados
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onReconfigure}>
            <Settings2 className="h-4 w-4 mr-1" />Reconfigurar
          </Button>
        </div>
        <CardDescription>Ativos da Meta conectados a esta loja e seus propósitos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {assets.map((a) => (
          <div key={a.title} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {a.icon}
              <div>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.purpose}</p>
              </div>
            </div>
            {a.asset ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{a.asset[a.nameKey] || a.asset.name || a.asset.id}</span>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Não selecionado</Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
