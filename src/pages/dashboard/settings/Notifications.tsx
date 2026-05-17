import { SettingsLayout } from '@/components/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function SettingsNotifications() {
  return (
    <SettingsLayout 
      title="Notificações" 
      description="Configure suas preferências de notificação"
      showSaveButton={false}
    >
      <Card>
        <CardHeader>
          <CardTitle>Preferências de Notificação</CardTitle>
          <CardDescription>Escolha como deseja ser notificado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Construction className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Em desenvolvimento</h3>
            <p className="text-sm text-muted-foreground mt-2">
              As configurações de notificações estarão disponíveis em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
