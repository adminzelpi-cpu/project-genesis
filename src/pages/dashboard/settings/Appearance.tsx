import { SettingsLayout } from '@/components/settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function SettingsAppearance() {
  return (
    <SettingsLayout 
      title="Aparência" 
      description="Personalize o visual da sua loja"
      showSaveButton={false}
    >
      <Card>
        <CardHeader>
          <CardTitle>Personalização Visual</CardTitle>
          <CardDescription>Configure cores, fontes e layout da sua loja</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Construction className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Em desenvolvimento</h3>
            <p className="text-sm text-muted-foreground mt-2">
              A personalização avançada de aparência estará disponível em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
