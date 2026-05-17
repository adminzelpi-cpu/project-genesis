import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Shield, Eye } from "lucide-react";
import { useActiveStore } from "@/features/stores/hooks/useActiveStore";
import { useLGPDSettings, type LGPDSettings } from "@/features/lgpd/hooks/useLGPDSettings";
import { cn } from "@/lib/utils";

const STYLE_OPTIONS = [
  {
    value: 'dark_transparent',
    label: 'Escuro Transparente',
    description: 'Fundo preto com transparência (padrão)',
    preview: 'bg-black/85 text-white border-white/10',
  },
  {
    value: 'light',
    label: 'Claro',
    description: 'Fundo branco com bordas sutis',
    preview: 'bg-white text-gray-900 border-gray-200',
  },
  {
    value: 'minimal',
    label: 'Minimalista',
    description: 'Fundo cinza claro, estilo clean',
    preview: 'bg-gray-50 text-gray-800 border-gray-100',
  },
];

export default function LGPDSettingsPage() {
  const { store, isLoading: storeLoading } = useActiveStore();
  const { settings, isLoading, updateSettings } = useLGPDSettings(store?.id);

  const [formData, setFormData] = useState({
    is_enabled: true,
    style_variant: 'dark_transparent' as LGPDSettings['style_variant'],
    description: 'Utilizamos cookies para melhorar sua experiência de navegação. Ao continuar, você concorda com nossa política de privacidade.',
    accept_button_text: 'Continuar e fechar',
    privacy_policy_url: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        is_enabled: settings.is_enabled,
        style_variant: settings.style_variant,
        description: settings.description,
        accept_button_text: settings.accept_button_text,
        privacy_policy_url: settings.privacy_policy_url || '',
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  if (storeLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedStyle = STYLE_OPTIONS.find(s => s.value === formData.style_variant);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">LGPD / Cookies</h1>
        <p className="text-muted-foreground">
          Configure o banner de consentimento de cookies que aparece para os visitantes da loja.
        </p>
      </div>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Banner de LGPD</CardTitle>
                <CardDescription>
                  Exibir aviso de cookies e política de privacidade
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={formData.is_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Style Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estilo do Banner</CardTitle>
          <CardDescription>
            Escolha o visual que melhor combina com sua loja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.style_variant}
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              style_variant: value as LGPDSettings['style_variant'] 
            }))}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {STYLE_OPTIONS.map((style) => (
              <label
                key={style.value}
                className={cn(
                  "relative flex flex-col gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  formData.style_variant === style.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                )}
              >
                <RadioGroupItem
                  value={style.value}
                  className="absolute top-4 right-4"
                />
                
                {/* Preview */}
                <div
                  className={cn(
                    "h-16 rounded-lg border flex items-center justify-center",
                    style.preview
                  )}
                >
                  <span className="text-xs font-medium opacity-70">Preview</span>
                </div>

                <div>
                  <p className="font-medium text-sm">{style.label}</p>
                  <p className="text-xs text-muted-foreground">{style.description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Content Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conteúdo do Banner</CardTitle>
          <CardDescription>
            Personalize os textos exibidos no banner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Texto do Banner</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Texto explicando o uso de cookies..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accept_btn">Texto do Botão</Label>
            <Input
              id="accept_btn"
              value={formData.accept_button_text}
              onChange={(e) => setFormData(prev => ({ ...prev, accept_button_text: e.target.value }))}
              placeholder="Aceitar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="privacy_url">Link da Política de Privacidade (opcional)</Label>
            <Input
              id="privacy_url"
              type="url"
              value={formData.privacy_policy_url}
              onChange={(e) => setFormData(prev => ({ ...prev, privacy_policy_url: e.target.value }))}
              placeholder="https://sualoja.com/privacidade"
            />
            <p className="text-xs text-muted-foreground">
              Se preenchido, será exibido um link "Saiba mais" no banner
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-lg">Pré-visualização</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 min-h-[180px] flex items-end justify-center">
            {/* Mini preview of banner */}
            <div
              className={cn(
                "w-full max-w-md rounded-xl p-4 border",
                selectedStyle?.preview
              )}
            >
              <p className="text-xs opacity-70 mb-4 text-center line-clamp-2">
                {formData.description}
              </p>
              <div className="flex justify-center">
                <div className="h-8 px-6 rounded text-xs flex items-center bg-current/20 font-medium">
                  {formData.accept_button_text}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setFormData({
            is_enabled: true,
            style_variant: 'dark_transparent',
            description: 'Utilizamos cookies para melhorar sua experiência de navegação. Ao continuar, você concorda com nossa política de privacidade.',
            accept_button_text: 'Continuar e fechar',
            privacy_policy_url: '',
          })}
        >
          Restaurar padrão
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={updateSettings.isPending}
          className="min-w-[120px]"
        >
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </div>
  );
}
