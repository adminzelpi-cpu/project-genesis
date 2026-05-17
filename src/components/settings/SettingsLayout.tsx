import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SettingsLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  onSave?: () => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
}

export function SettingsLayout({ 
  children, 
  title, 
  description,
  onSave,
  isSaving = false,
  showSaveButton = true
}: SettingsLayoutProps) {
  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {showSaveButton && onSave && (
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
