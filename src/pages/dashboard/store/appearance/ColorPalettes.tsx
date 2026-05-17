import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLOR_PALETTES, type ColorPalette } from "./types";

interface ColorPalettesProps {
  currentPrimary: string;
  onApply: (palette: ColorPalette) => void;
}

export function ColorPalettes({ currentPrimary, onApply }: ColorPalettesProps) {
  const activePalette = COLOR_PALETTES.find(p => p.colors.primary.toLowerCase() === currentPrimary.toLowerCase());

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-medium">Paletas prontas</h4>
        <p className="text-xs text-muted-foreground">Selecione uma base e personalize depois</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {COLOR_PALETTES.map((palette) => {
          const isActive = activePalette?.id === palette.id;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => onApply(palette)}
              className={cn(
                "relative group rounded-xl border-2 p-3 text-left transition-all hover:shadow-md",
                isActive 
                  ? "border-foreground shadow-sm" 
                  : "border-border hover:border-foreground/30"
              )}
            >
              {isActive && (
                <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
              )}
              {/* Color swatches */}
              <div className="flex gap-1 mb-2">
                <div 
                  className="h-8 flex-1 rounded-l-md" 
                  style={{ backgroundColor: palette.colors.primary }}
                />
                <div 
                  className="h-8 flex-1" 
                  style={{ backgroundColor: palette.colors.secondary }}
                />
                <div 
                  className="h-8 flex-1" 
                  style={{ backgroundColor: palette.colors.headerBg, border: palette.colors.headerBg === '#ffffff' ? '1px solid #e5e7eb' : 'none' }}
                />
                <div 
                  className="h-8 flex-1 rounded-r-md" 
                  style={{ backgroundColor: palette.colors.footerBg }}
                />
              </div>
              <p className="text-xs font-medium truncate">{palette.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{palette.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
