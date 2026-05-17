import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { FONT_OPTIONS, type FontFamily } from "./types";
import { Check } from "lucide-react";

// Preload all Google Fonts for preview
const preloadGoogleFonts = () => {
  const fontsToLoad = FONT_OPTIONS.filter(f => f.googleFont).map(f => f.googleFont!);
  const fontFamilies = fontsToLoad.join('&family=');
  if (document.getElementById('google-fonts-preview')) return;
  const link = document.createElement('link');
  link.id = 'google-fonts-preview';
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
  document.head.appendChild(link);
};

interface TypographySectionProps {
  fontFamily: FontFamily;
  onFontFamilyChange: (v: FontFamily) => void;
}

export function TypographySection({ fontFamily, onFontFamilyChange }: TypographySectionProps) {
  useEffect(() => { preloadGoogleFonts(); }, []);

  const selectedFont = FONT_OPTIONS.find(f => f.value === fontFamily);

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold">Fonte da loja</Label>
        <p className="text-xs text-muted-foreground">Aplicada em todos os textos do seu site</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FONT_OPTIONS.map((font) => {
          const isActive = fontFamily === font.value;
          return (
            <button
              key={font.value}
              type="button"
              onClick={() => onFontFamilyChange(font.value)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-sm ${
                isActive ? 'border-foreground shadow-sm' : 'border-border hover:border-foreground/30'
              }`}
              style={{ fontFamily: font.family }}
            >
              {isActive && (
                <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
              )}
              <span className="text-lg font-semibold block mb-0.5">Aa</span>
              <span className="text-xs text-muted-foreground">{font.label}</span>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Prévia</Label>
        <div className="rounded-lg border p-5 bg-muted/20" style={{ fontFamily: selectedFont?.family }}>
          <h3 className="text-xl font-bold mb-1">Título de Exemplo</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.
          </p>
          <p className="text-sm font-semibold">R$ 199,90 <span className="text-xs font-normal text-muted-foreground">• Frete grátis</span></p>
        </div>
      </div>
    </div>
  );
}
