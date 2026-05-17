import { useActiveStore } from '@/features/stores';
import { MediaLibrary } from '@/features/media';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function Media() {
  const { store, isLoading } = useActiveStore();
  const storeId = store?.id;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-96" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione uma loja para gerenciar os arquivos de mídia.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca de Mídia</h1>
        <p className="text-muted-foreground">
          Gerencie todas as imagens e arquivos da sua loja em um só lugar
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <MediaLibrary storeId={storeId} />
        </CardContent>
      </Card>
    </div>
  );
}
