import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import type { FeedConfiguration, FeedPlatformTemplate } from '../hooks/useFeedConfigurations';
import { ExternalLink } from 'lucide-react';

interface FeedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: string | null;
  config?: FeedConfiguration;
  template?: FeedPlatformTemplate;
  onSave: (settings: Record<string, any>) => void;
}

export function FeedSettingsDialog({ 
  open, 
  onOpenChange, 
  platform,
  config,
  template,
  onSave 
}: FeedSettingsDialogProps) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (config?.custom_settings) {
      setSettings(config.custom_settings);
    } else {
      setSettings({
        defaultCategory: '',
        excludeOutOfStock: true,
        excludeWithoutImage: true,
        excludeWithoutDescription: false,
      });
    }
  }, [config, open]);

  const handleSave = () => {
    onSave(settings);
  };

  const getPlatformName = () => {
    switch (platform) {
      case 'meta': return 'Meta (Facebook/Instagram)';
      case 'google': return 'Google Merchant Center';
      case 'pinterest': return 'Pinterest';
      case 'tiktok': return 'TikTok Shop';
      default: return platform;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurações - {getPlatformName()}</DialogTitle>
          <DialogDescription>
            Configure como o feed será gerado para esta plataforma
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Category Mapping */}
          <div className="space-y-2">
            <Label>Categoria Padrão (Google Product Category)</Label>
            <Input
              value={settings.defaultCategory || ''}
              onChange={(e) => setSettings({ ...settings, defaultCategory: e.target.value })}
              placeholder="Ex: Apparel & Accessories > Clothing"
            />
            <p className="text-xs text-muted-foreground">
              Será usada quando o produto não tiver categoria definida
            </p>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Filtros</Label>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Excluir produtos sem estoque</p>
                <p className="text-xs text-muted-foreground">Não incluir produtos esgotados no feed</p>
              </div>
              <Switch
                checked={settings.excludeOutOfStock ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, excludeOutOfStock: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Excluir produtos sem imagem</p>
                <p className="text-xs text-muted-foreground">Produtos sem foto não aparecerão no feed</p>
              </div>
              <Switch
                checked={settings.excludeWithoutImage ?? true}
                onCheckedChange={(checked) => setSettings({ ...settings, excludeWithoutImage: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Excluir produtos sem descrição</p>
                <p className="text-xs text-muted-foreground">Produtos sem descrição não aparecerão</p>
              </div>
              <Switch
                checked={settings.excludeWithoutDescription ?? false}
                onCheckedChange={(checked) => setSettings({ ...settings, excludeWithoutDescription: checked })}
              />
            </div>
          </div>

          {/* Required Fields Info */}
          {template && (
            <div className="space-y-2">
              <Label className="text-base font-medium">Campos Obrigatórios</Label>
              <div className="flex flex-wrap gap-1">
                {template.required_fields.map(field => (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Documentation Link */}
          {template?.documentation_url && (
            <Button variant="link" className="p-0 h-auto" asChild>
              <a href={template.documentation_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Ver documentação da plataforma
              </a>
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
