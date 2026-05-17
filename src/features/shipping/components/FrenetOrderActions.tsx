import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, ExternalLink, Package } from "lucide-react";
import { useFrenetShipment } from "../hooks/useFrenetShipment";

interface FrenetOrderActionsProps {
  storeId: string;
  orderId: string;
  orderNumber?: number | null;
  trackingCode?: string;
  trackingCarrier?: string;
  hasFrenet: boolean;
  enderecoEntrega?: any;
}

/**
 * Frenet — ações no pedido (visão lojista).
 *
 * IMPORTANTE: a API pública da Frenet (`/orders/createorderasync`) exige
 * parceria oficial + `x-partner-token`. Sem isso, o "Enviar pedido para
 * Frenet" automatizado não funciona. Por isso aqui oferecemos somente:
 *  - Atalho para o Painel da Frenet (onde o lojista gera a etiqueta)
 *  - Consulta de rastreio (essa SIM funciona com o token público)
 *
 * O código de rastreio é colado manualmente no campo de "Rastreio" do pedido,
 * o que dispara automaticamente a notificação ao cliente.
 */
export function FrenetOrderActions({
  storeId,
  orderNumber,
  trackingCode,
  hasFrenet,
}: FrenetOrderActionsProps) {
  const { getTracking, isTracking, trackingInfo, clearTracking } = useFrenetShipment();

  if (!hasFrenet) return null;

  const handleGetTracking = async () => {
    if (!trackingCode) return;
    await getTracking(storeId, trackingCode, undefined, orderNumber ? `#${orderNumber}` : undefined);
  };

  const frenetPanelUrl = "https://painel.frenet.com.br";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Frenet — Etiquetas e Rastreio
        </CardTitle>
        <CardDescription>
          Gere a etiqueta diretamente no painel da Frenet e cole o código de rastreio no campo do pedido para notificar o cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(frenetPanelUrl, "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir painel da Frenet
          </Button>

          {trackingCode && (
            <Button
              variant="outline"
              onClick={handleGetTracking}
              disabled={isTracking}
            >
              {isTracking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Consultar rastreio
            </Button>
          )}
        </div>

        {trackingInfo && (
          <div className="space-y-2 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Informações de rastreio</h4>
              <Button variant="ghost" size="sm" onClick={clearTracking}>
                Fechar
              </Button>
            </div>
            {trackingInfo.TrackingEvents && trackingInfo.TrackingEvents.length > 0 ? (
              <div className="space-y-2">
                {trackingInfo.TrackingEvents.map((event: any, index: number) => (
                  <div key={index} className="flex gap-3 text-sm">
                    <div className="text-muted-foreground whitespace-nowrap">
                      {event.EventDateTime || event.Date}
                    </div>
                    <div>
                      <p className="font-medium">{event.EventDescription || event.Description}</p>
                      {event.EventLocation && (
                        <p className="text-xs text-muted-foreground">{event.EventLocation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {trackingInfo.Message || "Nenhum evento de rastreio encontrado ainda."}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
