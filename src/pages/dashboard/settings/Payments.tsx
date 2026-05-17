import { SettingsLayout } from '@/components/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useActiveStore } from '@/features/stores/hooks/useActiveStore';
import { usePaymentGateways, MercadoPagoGateway, MercadoPagoCredentialsGateway, PagarmeGateway } from '@/features/payments';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SettingsPayments() {
  const { store } = useActiveStore();
  const { gateways, isLoading, toggleGateway, disconnectGateway, getGatewayByType } = usePaymentGateways(store?.id);

  const mercadoPagoGateway = getGatewayByType("mercado_pago");
  const pagarmeGateway = getGatewayByType("pagarme");
  const hasActiveGateway = gateways?.some((g) => g.is_active);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!store) {
    return (
      <SettingsLayout title="Meios de Pagamento" showSaveButton={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-muted-foreground">Nenhuma loja encontrada.</p>
          <p className="text-sm text-muted-foreground">Crie uma loja primeiro para acessar as configurações.</p>
        </div>
      </SettingsLayout>
    );
  }

  if (isLoading) {
    return (
      <SettingsLayout title="Meios de Pagamento" showSaveButton={false}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout 
      title="Meios de Pagamento" 
      description="Configure as formas de pagamento da sua loja"
      showSaveButton={false}
    >
      {!hasActiveGateway && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configure um gateway de pagamento</AlertTitle>
          <AlertDescription>
            Conecte pelo menos um gateway para receber pagamentos online.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <MercadoPagoCredentialsGateway
          storeId={store.id}
          gateway={mercadoPagoGateway && (mercadoPagoGateway.credentials as any)?.connection_type === "manual" ? mercadoPagoGateway : undefined}
          onToggle={(id, active) => toggleGateway.mutate({ gatewayId: id, isActive: active })}
          onDisconnect={(id) => disconnectGateway.mutate(id)}
          onRefresh={handleRefresh}
        />

        <MercadoPagoGateway
          storeId={store.id}
          gateway={mercadoPagoGateway && (mercadoPagoGateway.credentials as any)?.connection_type !== "manual" ? mercadoPagoGateway : undefined}
          onToggle={(id, active) => toggleGateway.mutate({ gatewayId: id, isActive: active })}
          onDisconnect={(id) => disconnectGateway.mutate(id)}
        />
        
        <PagarmeGateway
          storeId={store.id}
          gateway={pagarmeGateway}
          onToggle={(id, active) => toggleGateway.mutate({ gatewayId: id, isActive: active })}
          onDisconnect={(id) => disconnectGateway.mutate(id)}
          onRefresh={handleRefresh}
        />
      </div>
    </SettingsLayout>
  );
}
