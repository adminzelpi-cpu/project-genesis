import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HexColorPicker } from "@/components/ui/hex-color-picker";
import { ColorPalettes } from "./ColorPalettes";
import type { ButtonRadius, ElementRadius, ColorPalette } from "./types";

interface ColorsSectionProps {
  primaryColor: string;
  secondaryColor: string;
  buttonColor: string;
  buttonHoverColor: string;
  buttonTextColor: string | null;
  primaryTextColor: string | null;
  secondaryTextColor: string | null;
  buttonRadius: ButtonRadius;
  elementRadius: ElementRadius;
  onPrimaryColorChange: (v: string) => void;
  onSecondaryColorChange: (v: string) => void;
  onButtonColorChange: (v: string) => void;
  onButtonHoverColorChange: (v: string) => void;
  onButtonTextColorChange: (v: string | null) => void;
  onPrimaryTextColorChange: (v: string | null) => void;
  onSecondaryTextColorChange: (v: string | null) => void;
  onButtonRadiusChange: (v: ButtonRadius) => void;
  onElementRadiusChange: (v: ElementRadius) => void;
  onApplyPalette: (palette: ColorPalette) => void;
}

const getButtonRadiusClass = (radius: ButtonRadius) => {
  switch (radius) {
    case 'none': return 'rounded-none';
    case 'rounded': return 'rounded-md';
    case 'full': return 'rounded-full';
  }
};

// Auto-contrast for preview (matches StoreThemeProvider logic)
function autoContrast(hex: string): string {
  const h = hex.replace(/^#/, '');
  if (h.length < 6) return '#000000';
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '#000000' : '#ffffff';
}

export function ColorsSection({
  primaryColor, secondaryColor, buttonColor, buttonHoverColor,
  buttonTextColor, primaryTextColor, secondaryTextColor,
  buttonRadius, elementRadius,
  onPrimaryColorChange, onSecondaryColorChange,
  onButtonColorChange, onButtonHoverColorChange,
  onButtonTextColorChange, onPrimaryTextColorChange, onSecondaryTextColorChange,
  onButtonRadiusChange, onElementRadiusChange,
  onApplyPalette,
}: ColorsSectionProps) {
  const effectiveBtnText = buttonTextColor || autoContrast(buttonColor);
  const effectivePrimaryText = primaryTextColor || autoContrast(primaryColor);
  const effectiveSecondaryText = secondaryTextColor || autoContrast(secondaryColor);
  return (
    <div className="space-y-8">
      {/* Palettes */}
      <ColorPalettes currentPrimary={primaryColor} onApply={onApplyPalette} />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-background px-3 text-muted-foreground">ou personalize manualmente</span></div>
      </div>

      {/* Brand Colors */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Cores da marca</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Primária</Label>
            <HexColorPicker value={primaryColor} onChange={onPrimaryColorChange} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Secundária</Label>
            <HexColorPicker value={secondaryColor} onChange={onSecondaryColorChange} />
          </div>
        </div>

        {/* Texto sobre cor primária */}
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Cor do texto sobre a primária</Label>
              <p className="text-[11px] text-muted-foreground">Ex: número no badge do carrinho, ícones</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Automático</span>
              <Switch
                checked={primaryTextColor === null}
                onCheckedChange={(checked) =>
                  onPrimaryTextColorChange(checked ? null : (effectivePrimaryText || '#ffffff'))
                }
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            {primaryTextColor === null
              ? 'A plataforma escolhe automaticamente preto ou branco com base no contraste.'
              : 'Você está definindo manualmente. Desligue para voltar ao automático.'}
          </p>
          {primaryTextColor !== null && (
            <HexColorPicker value={primaryTextColor} onChange={(v) => onPrimaryTextColorChange(v)} />
          )}
          {/* Mini preview */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">Prévia:</span>
            <span
              className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full text-[11px] font-semibold px-1.5"
              style={{ backgroundColor: primaryColor, color: effectivePrimaryText }}
            >
              3
            </span>
            <span
              className="px-2.5 py-1 text-[11px] font-medium rounded"
              style={{ backgroundColor: primaryColor, color: effectivePrimaryText }}
            >
              Em destaque
            </span>
          </div>
        </div>

        {/* Texto sobre cor secundária */}
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Cor do texto sobre a secundária</Label>
              <p className="text-[11px] text-muted-foreground">Ex: tags, selos e elementos com cor de destaque</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Automático</span>
              <Switch
                checked={secondaryTextColor === null}
                onCheckedChange={(checked) =>
                  onSecondaryTextColorChange(checked ? null : (effectiveSecondaryText || '#ffffff'))
                }
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            {secondaryTextColor === null
              ? 'A plataforma escolhe automaticamente preto ou branco com base no contraste.'
              : 'Você está definindo manualmente. Desligue para voltar ao automático.'}
          </p>
          {secondaryTextColor !== null && (
            <HexColorPicker value={secondaryTextColor} onChange={(v) => onSecondaryTextColorChange(v)} />
          )}
          {/* Mini preview */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">Prévia:</span>
            <span
              className="px-2.5 py-1 text-[11px] font-medium rounded"
              style={{ backgroundColor: secondaryColor, color: effectiveSecondaryText }}
            >
              Promoção
            </span>
            <span
              className="px-2.5 py-1 text-[11px] font-medium rounded border"
              style={{ backgroundColor: secondaryColor, color: effectiveSecondaryText, borderColor: secondaryColor }}
            >
              -20%
            </span>
          </div>
        </div>
      </div>

      {/* Button Colors */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Cores dos botões</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Cor padrão</Label>
            <HexColorPicker value={buttonColor} onChange={onButtonColorChange} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Cor hover</Label>
            <HexColorPicker value={buttonHoverColor} onChange={onButtonHoverColorChange} />
          </div>
        </div>

        {/* Cor do texto do botão */}
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-medium">Cor do texto do botão</Label>
              <p className="text-[11px] text-muted-foreground">Aplica a todos os botões da loja</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Automático</span>
              <Switch
                checked={buttonTextColor === null}
                onCheckedChange={(checked) =>
                  onButtonTextColorChange(checked ? null : (effectiveBtnText || '#ffffff'))
                }
              />
            </div>
          </div>
          {buttonTextColor !== null && (
            <HexColorPicker value={buttonTextColor} onChange={(v) => onButtonTextColorChange(v)} />
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">Prévia:</span>
            <button
              type="button"
              className={`px-3 py-1.5 text-[11px] font-medium ${getButtonRadiusClass(buttonRadius)}`}
              style={{ backgroundColor: buttonColor, color: effectiveBtnText }}
            >
              Comprar Agora
            </button>
          </div>
        </div>
      </div>

      {/* Button Radius */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Formato dos botões</Label>
        <div className="flex gap-3">
          {([
            { value: 'none' as const, label: 'Reto', cls: 'rounded-none' },
            { value: 'rounded' as const, label: 'Arredondado', cls: 'rounded-lg' },
            { value: 'full' as const, label: 'Redondo', cls: 'rounded-full' },
          ]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onButtonRadiusChange(opt.value)}
              className={`flex-1 border-2 rounded-xl p-4 flex flex-col items-center gap-3 transition-all ${
                buttonRadius === opt.value ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/30'
              }`}
            >
              <div
                className={`px-5 py-2 text-xs font-medium text-white ${opt.cls}`}
                style={{ backgroundColor: buttonColor }}
              >
                Comprar
              </div>
              <span className="text-xs text-muted-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Element Radius */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Formato dos elementos</Label>
        <p className="text-xs text-muted-foreground">Imagens, cards e badges na loja</p>
        <div className="flex gap-3">
          {([
            { value: 'none' as const, label: 'Reto', cls: 'rounded-none' },
            { value: 'rounded' as const, label: 'Arredondado', cls: 'rounded-xl' },
            { value: 'full' as const, label: 'Bem arredondado', cls: 'rounded-3xl' },
          ]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onElementRadiusChange(opt.value)}
              className={`flex-1 border-2 rounded-xl p-4 flex flex-col items-center gap-3 transition-all ${
                elementRadius === opt.value ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground/30'
              }`}
            >
              <div className={`w-16 h-16 bg-muted border overflow-hidden ${opt.cls}`}>
                <div className="w-full h-10 bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/5" />
                <div className="p-1.5 space-y-1">
                  <div className="h-1 w-10 bg-muted-foreground/20 rounded" />
                  <div className="h-1 w-6 bg-muted-foreground/10 rounded" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Combined Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Prévia</Label>
        <div className="rounded-lg border p-5 space-y-3 bg-muted/20">
          <div className="flex gap-3">
            <div className="space-y-1 text-center">
              <div className="w-14 h-14 rounded-md border" style={{ backgroundColor: primaryColor }} />
              <p className="text-[10px] text-muted-foreground">Primária</p>
            </div>
            <div className="space-y-1 text-center">
              <div className="w-14 h-14 rounded-md border" style={{ backgroundColor: secondaryColor }} />
              <p className="text-[10px] text-muted-foreground">Secundária</p>
            </div>
            <div className="space-y-1 text-center">
              <div className="w-14 h-14 rounded-md border" style={{ backgroundColor: buttonColor }} />
              <p className="text-[10px] text-muted-foreground">Botão</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <button
              className={`px-5 py-2 text-sm font-medium text-white transition-colors ${getButtonRadiusClass(buttonRadius)}`}
              style={{ backgroundColor: buttonColor }}
            >
              Comprar Agora
            </button>
            <button
              className={`px-5 py-2 text-sm font-medium text-white transition-colors ${getButtonRadiusClass(buttonRadius)}`}
              style={{ backgroundColor: buttonHoverColor }}
            >
              Hover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
